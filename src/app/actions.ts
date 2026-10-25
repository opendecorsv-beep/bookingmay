'use server'

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getBookings, addBooking, updateBookingData, deleteBookingData, updateKitchenStatus, updateFloorStatus, updateBookingStatus, updateReceptionStatus, getReceptionLogs, saveReceptionLogs, getPartyMenuSets, savePartyMenuSets, getStaffCommissions, saveStaffCommissions, getChatMessages, saveChatMessages, getSystemGeminiApiKey, saveSystemGeminiApiKey } from '@/lib/store';
import { Booking, BookingStatus, TaskStatus, ReceptionEntry, VisitStatus, ReceptionFeedback, PartyMenuSet, CommissionEntry, AuthUser, KNOWN_ACCOUNTS, ChatMessage, ReceiptScanResult, ReceiptItem } from '@/lib/data';
import { normalizeRoomName, isSameRoom, getBookingTableCount, DECOR_PACKAGE_NAMES, DECOR_PACKAGE_CAPACITIES, getVietnamNow, getVietnamTodayString, checkDecorConflict } from '@/lib/bookingUtils';
import { classifyReceiptItem } from '@/lib/receiptParser';
import { supabase } from '@/lib/supabase';

export async function loginAction(id: string, pass: string) {
  const cleanId = id.trim().toLowerCase();
  const cleanPass = pass.trim();
  const account = KNOWN_ACCOUNTS[cleanId];
  if (account && account.pass === cleanPass) {
    cookies().set('booking_auth', cleanId, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    return { success: true, user: { id: cleanId, name: account.name, role: account.role } };
  }
  return { error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
}

export async function logoutAction() {
  cookies().delete('booking_auth');
  return { success: true };
}

export async function getAuthUserAction(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const authId = cookieStore.get('booking_auth')?.value?.toLowerCase();
  if (!authId || !KNOWN_ACCOUNTS[authId]) return null;
  const acc = KNOWN_ACCOUNTS[authId];
  return {
    id: authId,
    name: acc.name,
    role: acc.role,
  };
}

export async function getAuthStatus(): Promise<boolean> {
  const user = await getAuthUserAction();
  return !!user && (user.role === 'admin' || user.role === 'supervisor');
}

async function verifyAuthPermission() {
  const user = await getAuthUserAction();
  if (!user || user.role === 'staff') {
    throw new Error('Chỉ tài khoản quản lý hoặc giám sát mới có quyền thay đổi thông tin!');
  }
  return user;
}


export async function fetchBookings() {
  return getBookings();
}

export async function createNewBooking(data: Omit<Booking, 'id'>) {
  await verifyAuthPermission();
  const bookings = await getBookings();
  const error = checkDecorConflict(bookings, data.dateTime, data.decorRequest || "", undefined, data.room);
  if (error) return { error };

  const normalizedRoom = normalizeRoomName(data.room || 'Chưa chọn');
  await addBooking({
    ...data,
    room: normalizedRoom
  });
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  revalidatePath('/floor-plan');
  return { success: true };
}

export async function updateExistingBooking(id: string, data: Partial<Omit<Booking, 'id'>>) {
  await verifyAuthPermission();
  if (data.dateTime || data.decorRequest || data.room) {
    const bookings = await getBookings();
    // if only one is updated, fetch the existing one to get the other field
    const existing = bookings.find(b => b.id === id);
    if (existing) {
      const dateTimeToCheck = data.dateTime || existing.dateTime;
      const decorToCheck = data.decorRequest !== undefined ? data.decorRequest : existing.decorRequest;
      const roomToCheck = data.room !== undefined ? data.room : existing.room;
      const error = checkDecorConflict(bookings, dateTimeToCheck, decorToCheck || "", id, roomToCheck);
      if (error) return { error };
    }
  }

  const updateData = { ...data };
  if (updateData.room) {
    updateData.room = normalizeRoomName(updateData.room);
  }

  await updateBookingData(id, updateData);

  // Tự động đồng bộ sang Lễ tân (CONFIG_RECEPTION):
  // Khi đổi phòng/bàn, số khách, tên khách hoặc thời gian tiệc, đồng bộ ngay lập tức sang lượt đón khách
  try {
    const currentLogs = await getReceptionLogs();
    let hasChanges = false;
    const updatedLogs = currentLogs.map(item => {
      if (item.bookingId === id) {
        hasChanges = true;
        const [d, t] = updateData.dateTime ? updateData.dateTime.split('T') : [item.date, item.time];
        return {
          ...item,
          ...(updateData.room ? { room: updateData.room } : {}),
          ...(updateData.customerName ? { customerName: updateData.customerName.replace(/\[(VIP|SVIP)\]/g, '').trim() } : {}),
          ...(updateData.phone ? { phone: updateData.phone } : {}),
          ...(updateData.guestsCount ? { guestsCount: updateData.guestsCount } : {}),
          ...(d ? { date: d } : {}),
          ...(t ? { time: t.substring(0, 5) } : {}),
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });
    if (hasChanges) {
      await saveReceptionLogs(updatedLogs);
    }
  } catch (err) {
    console.error("Error syncing reception logs on updateExistingBooking:", err);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
  return { success: true };
}

export async function deleteBookingAction(id: string) {
  await verifyAuthPermission();
  await deleteBookingData(id);

  // Đồng bộ: nếu xóa booking, tự động xóa lượt đón khách lễ tân tương ứng
  try {
    const currentLogs = await getReceptionLogs();
    const updatedLogs = currentLogs.filter(item => item.bookingId !== id);
    if (updatedLogs.length !== currentLogs.length) {
      await saveReceptionLogs(updatedLogs);
    }
  } catch (err) {
    console.error("Error removing linked reception log on delete:", err);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
}

export async function transferReceptionRoomAction(id: string, newRoom: string) {
  const currentLogs = await getReceptionLogs();
  let linkedBookingId: string | undefined;
  const normalizedNewRoom = normalizeRoomName(newRoom);

  const updatedLogs = currentLogs.map(item => {
    if (item.id === id) {
      if (item.bookingId) linkedBookingId = item.bookingId;
      return {
        ...item,
        room: normalizedNewRoom,
        updatedAt: new Date().toISOString()
      };
    }
    return item;
  });
  await saveReceptionLogs(updatedLogs);

  // Nếu lượt đón gắn với booking, cập nhật phòng cho booking tương ứng
  if (linkedBookingId) {
    try {
      await updateBookingData(linkedBookingId, { room: normalizedNewRoom });
    } catch (err) {
      console.error("Error syncing booking room on transferReceptionRoom:", err);
    }
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
  revalidatePath('/floor');
  revalidatePath('/kitchen');
  return { success: true };
}

export async function setReceptionStatus(id: string, status: TaskStatus) {
  await verifyAuthPermission();
  await updateReceptionStatus(id, status);

  // Đồng bộ hai chiều: Khi Giám sát bấm Dọn xong (clean), đồng bộ lượt đón khách lễ tân sang 'left' (đã về)
  if (status === 'clean') {
    try {
      const currentLogs = await getReceptionLogs();
      let hasChange = false;
      const updatedLogs = currentLogs.map(item => {
        if (item.bookingId === id && item.status === 'dining') {
          hasChange = true;
          return {
            ...item,
            status: 'left' as VisitStatus,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      if (hasChange) {
        await saveReceptionLogs(updatedLogs);
      }
    } catch (err) {
      console.error("Error auto-syncing reception log on clean:", err);
    }
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
}

export async function cleanRoomTableAction(params: {
  roomName: string;
  date?: string;
  bookingId?: string;
  receptionId?: string;
  markCleaned?: boolean;
}) {
  const { roomName, date, bookingId, receptionId, markCleaned = true } = params;
  const targetDate = date ? date.split('T')[0] : undefined;

  try {
    // 1. Đồng bộ bên Lễ Tân (CONFIG_RECEPTION): chuyển trạng thái khách sang 'left' và cập nhật isCleaned
    const currentLogs = await getReceptionLogs();
    let receptionChanged = false;
    let linkedBookingIdFromLog: string | undefined;

    const updatedLogs = currentLogs.map(item => {
      const isTarget = receptionId
        ? item.id === receptionId
        : (isSameRoom(item.room, roomName) &&
           (!targetDate || item.date === targetDate) &&
           (item.status === 'dining' || (markCleaned && item.status === 'left' && !item.isCleaned)));

      if (isTarget) {
        receptionChanged = true;
        if (item.bookingId) linkedBookingIdFromLog = item.bookingId;
        return {
          ...item,
          status: 'left' as VisitStatus,
          isCleaned: markCleaned,
          cleanedAt: markCleaned ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    if (receptionChanged) {
      await saveReceptionLogs(updatedLogs);
    }

    // 2. Đồng bộ bên Đặt Bàn (bookings): chuyển receptionStatus & floorStatus sang 'clean' (nếu dọn xong) hoặc 'done' (nếu khách ra về chờ dọn)
    const allBookings = await getBookings();
    const targetBookingIds = new Set<string>();

    if (bookingId) targetBookingIds.add(bookingId);
    if (linkedBookingIdFromLog) targetBookingIds.add(linkedBookingIdFromLog);

    // Nếu không truyền bookingId cụ thể, chỉ tìm các booking ĐÃ ĐƯỢC PHỤC VỤ (in_progress / done) trong phòng đó
    if (targetBookingIds.size === 0 && roomName && targetDate) {
      allBookings.forEach(b => {
        if (isSameRoom(b.room, roomName)) {
          const bDate = (b.dateTime || '').split('T')[0];
          if (bDate === targetDate && b.status !== 'cancelled' && b.receptionStatus !== 'clean') {
            if (b.receptionStatus === 'in_progress' || b.receptionStatus === 'done') {
              targetBookingIds.add(b.id);
            }
          }
        }
      });
    }

    for (const bId of Array.from(targetBookingIds)) {
      try {
        await updateBookingData(bId, {
          receptionStatus: markCleaned ? 'clean' : 'done',
          floorStatus: markCleaned ? 'clean' : 'done'
        });
      } catch (err) {
        console.error(`Error updating booking ${bId} to clean:`, err);
      }
    }
  } catch (err) {
    console.error("Error in cleanRoomTableAction:", err);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/floor');
  revalidatePath('/kitchen');
  revalidatePath('/archive');

  return { success: true };
}

export async function checkInBookingFromFloorAction(bookingId: string) {
  const allBookings = await getBookings();
  const b = allBookings.find(item => item.id === bookingId);
  if (!b) return { error: "Không tìm thấy thông tin tiệc" };

  const [datePart] = (b.dateTime || '').split('T');
  const now = getVietnamNow();
  const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 1. Thêm lượt đón khách bên Lễ tân (status: dining)
  await addReceptionEntryAction({
    date: datePart || getVietnamTodayString(),
    time: timeNow,
    type: 'booking',
    bookingId: b.id,
    customerName: b.customerName.replace(/\[(VIP|SVIP)\]/g, '').trim(),
    phone: b.phone,
    guestsCount: b.guestsCount || 1,
    room: b.room || 'Sảnh chung',
    status: 'dining',
    notes: `Đón tiếp từ Sơ đồ bàn lúc ${timeNow}`
  });

  // 2. Chuyển trạng thái booking sang in_progress
  await updateBookingData(b.id, {
    receptionStatus: 'in_progress'
  });

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/floor');
  revalidatePath('/kitchen');

  return { success: true };
}

export async function resetCleanRoomAction(params: {
  bookingId?: string;
  roomName?: string;
  date?: string;
  receptionId?: string;
}) {
  const { bookingId, roomName, date, receptionId } = params;
  const targetDate = date ? date.split('T')[0] : undefined;

  try {
    // 1. Reset reception log isCleaned flag
    const currentLogs = await getReceptionLogs();
    let receptionChanged = false;
    const updatedLogs = currentLogs.map(item => {
      const isTarget = receptionId
        ? item.id === receptionId
        : (roomName && isSameRoom(item.room, roomName) && (!targetDate || item.date === targetDate));

      if (isTarget && item.isCleaned) {
        receptionChanged = true;
        return {
          ...item,
          isCleaned: false,
          cleanedAt: undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    if (receptionChanged) {
      await saveReceptionLogs(updatedLogs);
    }

    // 2. Reset bookings
    const allBookings = await getBookings();
    const targetBookingIds = new Set<string>();
    if (bookingId) targetBookingIds.add(bookingId);

    if (targetBookingIds.size === 0 && roomName && targetDate) {
      allBookings.forEach(b => {
        if (isSameRoom(b.room, roomName)) {
          const bDate = (b.dateTime || '').split('T')[0];
          if (bDate === targetDate && b.status !== 'cancelled' && b.receptionStatus === 'clean') {
            targetBookingIds.add(b.id);
          }
        }
      });
    }

    for (const bId of Array.from(targetBookingIds)) {
      await updateBookingData(bId, {
        receptionStatus: 'pending',
        floorStatus: 'pending'
      });
    }
  } catch (err) {
    console.error("Error resetting clean status:", err);
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/floor');
  revalidatePath('/kitchen');
  revalidatePath('/archive');

  return { success: true };
}

export async function setKitchenStatus(id: string, status: TaskStatus) {
  await verifyAuthPermission();
  await updateKitchenStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/kitchen');
  revalidatePath('/archive');
}

export async function setFloorStatus(id: string, status: TaskStatus) {
  await verifyAuthPermission();
  await updateFloorStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/floor');
  revalidatePath('/archive');
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  await verifyAuthPermission();
  await updateBookingStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
}

export async function restoreBookingAction(id: string) {
  await verifyAuthPermission();
  const allBookings = await getBookings();
  const existing = allBookings.find(b => b.id === id);
  let updatedSpecialRequest = existing?.specialRequest || '';
  if (!updatedSpecialRequest.includes('[RESTORED]')) {
    updatedSpecialRequest = `${updatedSpecialRequest}\n[RESTORED]`.trim();
  }
  await updateBookingData(id, {
    receptionStatus: 'pending',
    floorStatus: 'pending',
    specialRequest: updatedSpecialRequest
  });
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  return { success: true };
}

export async function fetchReceptionLogs(): Promise<ReceptionEntry[]> {
  return getReceptionLogs();
}

export async function addReceptionEntryAction(data: Omit<ReceptionEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const currentLogs = await getReceptionLogs();
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const id = `REC-${dateStr}-${randomSuffix}`;
  const normalizedRoom = normalizeRoomName(data.room || 'Sảnh chung');
  
  const newEntry: ReceptionEntry = {
    ...data,
    room: normalizedRoom,
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const updatedLogs = [newEntry, ...currentLogs];
  await saveReceptionLogs(updatedLogs);

  // Nếu khách đặt bàn (booking) đã đến nhận bàn, chuyển trạng thái phục vụ sang 'in_progress'
  if (data.type === 'booking' && data.bookingId) {
    try {
      await updateReceptionStatus(data.bookingId, 'in_progress');
    } catch (err) {
      console.error("Error setting booking in_progress on checkin:", err);
    }
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
  return { success: true, entry: newEntry };
}

export async function updateReceptionStatusAction(id: string, status: VisitStatus, feedback?: ReceptionFeedback) {
  const currentLogs = await getReceptionLogs();
  let linkedBookingId: string | undefined;

  const updatedLogs = currentLogs.map(item => {
    if (item.id === id) {
      if (item.bookingId) linkedBookingId = item.bookingId;
      return {
        ...item,
        status,
        ...(feedback ? { feedback } : {}),
        updatedAt: new Date().toISOString()
      };
    }
    return item;
  });
  await saveReceptionLogs(updatedLogs);

  // Nếu khách ra về và là khách booking, đồng bộ trạng thái booking sang 'clean' (đã dọn xong)
  if (status === 'left' && linkedBookingId) {
    try {
      await updateReceptionStatus(linkedBookingId, 'clean');
    } catch (err) {
      console.error("Error setting booking clean on reception left:", err);
    }
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
  revalidatePath('/floor');
  revalidatePath('/kitchen');
  return { success: true };
}

export async function updateReceptionFeedbackAction(id: string, feedback: ReceptionFeedback) {
  const currentLogs = await getReceptionLogs();
  let linkedBookingId: string | undefined;

  const updatedLogs = currentLogs.map(item => {
    if (item.id === id) {
      if (item.bookingId) linkedBookingId = item.bookingId;
      return {
        ...item,
        feedback,
        status: 'left' as VisitStatus,
        updatedAt: new Date().toISOString()
      };
    }
    return item;
  });
  await saveReceptionLogs(updatedLogs);

  // Khi có feedback (khách ra về), tự động đồng bộ trạng thái booking sang 'clean' (đã dọn xong)
  if (linkedBookingId) {
    try {
      await updateReceptionStatus(linkedBookingId, 'clean');
    } catch (err) {
      console.error("Error setting booking clean on feedback left:", err);
    }
  }

  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
  revalidatePath('/floor');
  revalidatePath('/kitchen');
  return { success: true };
}

export async function deleteReceptionEntryAction(id: string) {
  const currentLogs = await getReceptionLogs();
  const updatedLogs = currentLogs.filter(item => item.id !== id);
  await saveReceptionLogs(updatedLogs);
  revalidatePath('/');
  revalidatePath('/floor-plan');
  revalidatePath('/bookings');
  return { success: true };
}

export async function fetchPartyMenuSetsAction(): Promise<PartyMenuSet[]> {
  return getPartyMenuSets();
}

export async function savePartyMenuSetAction(set: PartyMenuSet) {
  await verifyAuthPermission();
  const currentSets = await getPartyMenuSets();
  const existingIdx = currentSets.findIndex(s => s.id === set.id);
  let updatedSets: PartyMenuSet[];
  if (existingIdx >= 0) {
    updatedSets = [...currentSets];
    updatedSets[existingIdx] = { ...set, updatedAt: new Date().toISOString() };
  } else {
    updatedSets = [...currentSets, { ...set, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
  }
  await savePartyMenuSets(updatedSets);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/party-menu');
  return { success: true, sets: updatedSets };
}

export async function deletePartyMenuSetAction(setId: string) {
  await verifyAuthPermission();
  const currentSets = await getPartyMenuSets();
  const updatedSets = currentSets.filter(s => s.id !== setId);
  await savePartyMenuSets(updatedSets);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/party-menu');
  return { success: true, sets: updatedSets };
}

export async function fetchStaffCommissionsAction(): Promise<CommissionEntry[]> {
  return getStaffCommissions();
}

export async function addStaffCommissionAction(data: {
  date: string;
  time: string;
  staffName: string;
  category: CommissionEntry['category'];
  productName?: string;
  unitPriceOrReward: number;
  quantity: number;
  billAmount?: number;
  billPercent?: number;
  billFoodAmount?: number;
  billExcludedAmount?: number;
  billItemsSummary?: string;
  billImageUrl?: string;
  totalReward: number;
  tableOrRoom?: string;
  note?: string;
}) {
  const user = await getAuthUserAction();
  if (!user || (user.role !== 'admin' && user.role !== 'supervisor')) {
    return { error: 'Chỉ tài khoản Giám Sát hoặc Quản Lý mới có quyền ghi nhận CMS thưởng!' };
  }

  const currentCommissions = await getStaffCommissions();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newEntry: CommissionEntry = {
    ...data,
    id: `CMS-${data.date.replace(/-/g, '')}-${randomSuffix}`,
    createdById: user.id,
    createdByName: user.name,
    createdAt: new Date().toISOString()
  };

  const updated = [newEntry, ...currentCommissions];
  await saveStaffCommissions(updated);
  revalidatePath('/cms');
  revalidatePath('/nv');
  return { success: true, entry: newEntry };
}

export async function getSystemGeminiApiKeyAction(): Promise<string> {
  return getSystemGeminiApiKey();
}

export async function saveSystemGeminiApiKeyAction(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    await saveSystemGeminiApiKey(key);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi lưu Gemini API Key lên Supabase' };
  }
}

export async function parseReceiptWithGeminiAction(params: {
  base64Image: string;
  userApiKey?: string;
}): Promise<{ success: boolean; result?: ReceiptScanResult; error?: string }> {
  try {
    const { base64Image, userApiKey } = params;
    let apiKey = (userApiKey || '').trim();
    if (!apiKey) {
      apiKey = await getSystemGeminiApiKey();
    }
    if (!apiKey) {
      apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();
    }

    if (!apiKey) {
      return {
        success: false,
        error: 'Chưa có Google Gemini API Key. Quản lý có thể nhập API Key trong phần "Cấu hình Khóa AI" để kích hoạt cho toàn bộ nhân viên nhà hàng, hoặc sử dụng tính năng Dán Text Hóa Đơn / Bill Mẫu Thử Nghiệm.'
      };
    }

    // Clean base64 string
    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const promptText = `
Bạn là chuyên gia kiểm toán và bóc tách hóa đơn nhà hàng Mây (ẩm thực tiệc, hải sản & phòng VIP).
Hãy quét và phân tích hình ảnh hóa đơn thanh toán này.

Quy tắc bóc tách và phân loại:
1. Đọc tên phòng/bàn (ví dụ: VIP 102, Bàn 4...), ngày giờ thanh toán nếu có.
2. Bóc tách từng dòng món: Tên món, số lượng, đơn giá, thành tiền.
3. Phân loại CỰC KỲ CHÍNH XÁC:
   - isFood = true (MÓN ĂN ĐƯỢC TÍNH HOA HỒNG): Mọi món ăn do Bếp & quầy Hải sản chế biến (món khai vị, gỏi, bò, gà, heo, cá mú, cá bơn, tôm hùm, cua, lẩu, cơm, mì, rau, tráng miệng trái cây...).
   - isFood = false (MẶT HÀNG BỊ LOẠI TRỪ - KHÔNG TÍNH HOA HỒNG):
     * BIA: Tiger, Heineken, Budweiser, Sài Gòn, Blanc 1664, Corona, Sapporo, Tuborg, bia các loại...
     * RƯỢU: Rượu vang (Cabernet, Merlot...), rượu mạnh, Chivas, Macallan, Soju, rượu gạo...
     * NƯỚC NGỌT / NƯỚC SUỐI: Coca, Pepsi, 7up, Redbull, Sting, Aquafina, Dasani, Lavie, trà xanh, C2...
     * GÓI DECOR / TIỆC: Gói Decor Mẫu 1, Mẫu 2, Hoa tươi, Bong bóng, Nến, Bánh sinh nhật...
     * PHỤ PHÍ: Khăn lạnh, khăn ướt, đậu phộng gói, xô đá, đá bi...
     * THUẾ & PHÍ: Thuế VAT 8%, 10%, Phí phục vụ (Service charge), Tiền tip, Voucher giảm giá...

Trả về ĐÚNG JSON nguyên bản (không dùng markdown code block, không giải thích ngoài JSON):
{
  "restaurantName": "Nhà hàng Mây",
  "tableName": "VIP 102",
  "date": "2026-10-22",
  "items": [
    {
      "name": "Tên món",
      "quantity": 1,
      "unitPrice": 100000,
      "totalPrice": 100000,
      "isFood": true,
      "category": "food",
      "reason": "Món ăn hợp lệ"
    }
  ],
  "totalReceipt": 0,
  "totalFood": 0,
  "totalExcluded": 0
}
`;

    // Use ultra-fast Gemini 3.5 models with auto-fallback (1.5s - 3s response time)
    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    let res: Response | null = null;
    let lastError = '';

    for (const model of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const candidateRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: cleanBase64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
              max_output_tokens: 2048
            }
          })
        });

        if (candidateRes.ok) {
          res = candidateRes;
          break;
        } else {
          lastError = await candidateRes.text();
          console.warn(`Model ${model} returned status ${candidateRes.status}:`, lastError);
        }
      } catch (callErr: any) {
        lastError = callErr.message || 'Lỗi kết nối Gemini API';
      }
    }

    if (!res) {
      return {
        success: false,
        error: `Lỗi kết nối Gemini API. Vui lòng kiểm tra lại API Key hoặc đường truyền.`
      };
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return { success: false, error: 'Không nhận được dữ liệu phản hồi từ AI Vision.' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(candidateText);
    } catch (parseErr) {
      const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    // Double check & re-validate items with rule engine
    const items: ReceiptItem[] = (parsed.items || []).map((it: any, idx: number) => {
      const ruleClass = classifyReceiptItem(it.name || '');
      // If rule engine says it's excluded (e.g. bia, wine, decor, vat), force exclude
      const isFood = ruleClass.isFood ? Boolean(it.isFood ?? true) : false;
      const unitPrice = Number(it.unitPrice) || Number(it.totalPrice) || 0;
      const totalPrice = Number(it.totalPrice) || (unitPrice * (Number(it.quantity) || 1));

      return {
        id: `AI-ITEM-${idx + 1}`,
        name: it.name || `Món #${idx + 1}`,
        quantity: Number(it.quantity) || 1,
        unitPrice,
        totalPrice,
        isFood,
        category: ruleClass.category || it.category || (isFood ? 'food' : 'drink'),
        reason: it.reason || ruleClass.reason
      };
    });

    let totalFood = 0;
    let totalExcluded = 0;
    items.forEach(it => {
      if (it.isFood) totalFood += it.totalPrice;
      else totalExcluded += it.totalPrice;
    });

    const result: ReceiptScanResult = {
      restaurantName: parsed.restaurantName || 'Nhà hàng Mây',
      tableName: parsed.tableName || '',
      date: parsed.date || '',
      items,
      totalReceipt: totalFood + totalExcluded,
      totalFood,
      totalExcluded,
      imageUrl: base64Image.length < 600000 ? base64Image : undefined
    };

    return { success: true, result };
  } catch (err: any) {
    console.error('Error in parseReceiptWithGeminiAction:', err);
    return {
      success: false,
      error: err.message || 'Đã xảy ra lỗi khi bóc tách hóa đơn bằng AI.'
    };
  }
}

export async function deleteStaffCommissionAction(id: string) {
  const user = await getAuthUserAction();
  if (!user || (user.role !== 'admin' && user.role !== 'supervisor')) {
    return { error: 'Chỉ tài khoản Giám Sát hoặc Quản Lý mới có quyền xóa CMS thưởng!' };
  }

  const currentCommissions = await getStaffCommissions();
  const updated = currentCommissions.filter(item => item.id !== id);
  await saveStaffCommissions(updated);
  revalidatePath('/cms');
  revalidatePath('/nv');
  return { success: true };
}

export async function clearAllStaffCommissionsAction() {
  const user = await getAuthUserAction();
  if (!user || (user.role !== 'admin' && user.role !== 'supervisor')) {
    return { error: 'Chỉ tài khoản Giám Sát hoặc Quản Lý mới có quyền xóa dữ liệu CMS!' };
  }

  await saveStaffCommissions([]);
  revalidatePath('/cms');
  revalidatePath('/nv');
  return { success: true };
}

export async function fetchChatMessagesAction(): Promise<ChatMessage[]> {
  return getChatMessages();
}

export async function sendChatMessageAction(data: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
  try {
    const currentMessages = await getChatMessages();
    const id = `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newMsg: ChatMessage = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    const updated = [...currentMessages, newMsg];
    await saveChatMessages(updated);
    revalidatePath('/nv/chat');
    return { success: true, message: newMsg };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi gửi tin nhắn' };
  }
}

export async function clearChatMessagesAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await saveChatMessages([]);
    revalidatePath('/nv/chat');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi xóa tin nhắn' };
  }
}

export async function forceReloadAllClientsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAuthPermission();
    const channel = supabase.channel('system-control');
    await channel.send({
      type: 'broadcast',
      event: 'force-reload',
      payload: { initiatedAt: new Date().toISOString() }
    });
    supabase.removeChannel(channel);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi gửi lệnh làm mới' };
  }
}



