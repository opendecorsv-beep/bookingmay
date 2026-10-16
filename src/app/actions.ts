'use server'

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getBookings, addBooking, updateBookingData, deleteBookingData, updateKitchenStatus, updateFloorStatus, updateBookingStatus, updateReceptionStatus, getSeafoodInventory, saveSeafoodInventory, getReceptionLogs, saveReceptionLogs } from '@/lib/store';
import { Booking, BookingStatus, TaskStatus, SeafoodCategory, ReceptionEntry, VisitStatus, ReceptionFeedback } from '@/lib/data';
import { normalizeRoomName, isSameRoom } from '@/lib/bookingUtils';

export async function loginAction(id: string, pass: string) {
  if (id.trim() === 'maybmt' && pass.trim() === '1122334455') {
    cookies().set('booking_auth', 'maybmt', {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    return { success: true };
  }
  return { error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
}

export async function logoutAction() {
  cookies().delete('booking_auth');
  return { success: true };
}

export async function getAuthStatus(): Promise<boolean> {
  const cookieStore = cookies();
  return cookieStore.get('booking_auth')?.value === 'maybmt';
}

async function verifyAuthPermission() {
  const isAuth = await getAuthStatus();
  if (!isAuth) {
    throw new Error('Chỉ tài khoản quản lý (maybmt) mới có quyền thay đổi thông tin booking!');
  }
}

export async function fetchBookings() {
  return getBookings();
}

function checkDecorConflict(bookings: Booking[], newDateTimeStr: string, newDecorStr: string, currentBookingId?: string): string | null {
  if (!newDecorStr.includes('|PKG:')) return null;
  const newPkgStr = newDecorStr.split('|').find(p => p.startsWith('PKG:'));
  const newPkg = newPkgStr.replace('PKG:', '');
  if (!newPkg || newPkg === 'custom') return null;
  
  const newTime = new Date(newDateTimeStr).getTime();

  for (const b of bookings) {
    if (b.id === currentBookingId) continue;
    if (!b.decorRequest || !b.decorRequest.includes(`|PKG:${newPkg}`)) continue;

    const bTime = new Date(b.dateTime).getTime();
    const diffHours = Math.abs(bTime - newTime) / (1000 * 60 * 60);

    if (diffHours < 5) {
       const decorName = {"1": "Bướm Ngũ Sắc", "2": "Bướm Trắng", "3": "Bướm Đỏ", "4": "Nơ Trắng", "5": "Background Nâu", "6": "Nơ Hồng", "7": "Free S4 1", "8": "Free S4 2", "9": "Hoa Tươi"}[newPkg] || `Số ${newPkg}`;
       const [d, t] = b.dateTime.split('T');
       let timeStr = b.dateTime;
       if (d && t) {
         const [year, month, day] = d.split('-');
         timeStr = `${t} ngày ${day}/${month}/${year}`;
       }
       return `Gói Decor Mây ${newPkg} (${decorName}) đã được khách khác đặt vào lúc ${timeStr}. Hai tiệc dùng chung 1 gói decor cần cách nhau tối thiểu 5 tiếng!`;
    }
  }
  return null;
}

export async function createNewBooking(data: Omit<Booking, 'id'>) {
  await verifyAuthPermission();
  const bookings = await getBookings();
  const error = checkDecorConflict(bookings, data.dateTime, data.decorRequest || "");
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
  if (data.dateTime || data.decorRequest) {
    const bookings = await getBookings();
    // if only one is updated, fetch the existing one to get the other field
    const existing = bookings.find(b => b.id === id);
    if (existing) {
      const dateTimeToCheck = data.dateTime || existing.dateTime;
      const decorToCheck = data.decorRequest || existing.decorRequest;
      const error = checkDecorConflict(bookings, dateTimeToCheck, decorToCheck || "", id);
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
}) {
  const { roomName, date, bookingId, receptionId } = params;
  const targetDate = date ? date.split('T')[0] : undefined;

  try {
    // 1. Đồng bộ bên Lễ Tân (CONFIG_RECEPTION): chuyển trạng thái khách sang 'left' (đã ra về)
    const currentLogs = await getReceptionLogs();
    let receptionChanged = false;
    let linkedBookingIdFromLog: string | undefined;

    const updatedLogs = currentLogs.map(item => {
      const isTarget = receptionId
        ? item.id === receptionId
        : (isSameRoom(item.room, roomName) &&
           (!targetDate || item.date === targetDate) &&
           item.status === 'dining');

      if (isTarget) {
        receptionChanged = true;
        if (item.bookingId) linkedBookingIdFromLog = item.bookingId;
        return {
          ...item,
          status: 'left' as VisitStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    if (receptionChanged) {
      await saveReceptionLogs(updatedLogs);
    }

    // 2. Đồng bộ bên Đặt Bàn (bookings): chuyển receptionStatus & floorStatus sang 'clean'
    const allBookings = await getBookings();
    const targetBookingIds = new Set<string>();

    if (bookingId) targetBookingIds.add(bookingId);
    if (linkedBookingIdFromLog) targetBookingIds.add(linkedBookingIdFromLog);

    // Nếu không truyền bookingId cụ thể, tìm các booking chưa clean trong phòng đó vào ngày đó
    if (targetBookingIds.size === 0 && roomName && targetDate) {
      allBookings.forEach(b => {
        if (isSameRoom(b.room, roomName)) {
          const bDate = (b.dateTime || '').split('T')[0];
          if (bDate === targetDate && b.status !== 'cancelled' && b.receptionStatus !== 'clean') {
            targetBookingIds.add(b.id);
          }
        }
      });
    }

    for (const bId of targetBookingIds) {
      try {
        await updateBookingData(bId, {
          receptionStatus: 'clean',
          floorStatus: 'clean'
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

export async function resetCleanRoomAction(params: {
  bookingId?: string;
  roomName?: string;
  date?: string;
}) {
  const { bookingId, roomName, date } = params;
  const targetDate = date ? date.split('T')[0] : undefined;

  try {
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

    for (const bId of targetBookingIds) {
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

export async function fetchSeafoodInventory() {
  return getSeafoodInventory();
}

export async function updateSeafoodInventoryAction(inventory: { updatedAt: string; categories: SeafoodCategory[] }) {
  await verifyAuthPermission();
  await saveSeafoodInventory(inventory);
  revalidatePath('/seafood');
  return { success: true };
}

export async function toggleSeafoodUrgentAction(catId: string, itemId: string, isUrgent: boolean) {
  await verifyAuthPermission();
  const inventory = await getSeafoodInventory();
  const updatedCategories = inventory.categories.map(cat => {
    if (cat.id !== catId) return cat;
    return {
      ...cat,
      items: cat.items.map(item =>
        item.id === itemId ? { ...item, isUrgent } : item
      )
    };
  });
  const updatedPayload = {
    updatedAt: new Date().toISOString(),
    categories: updatedCategories
  };
  await saveSeafoodInventory(updatedPayload);
  revalidatePath('/seafood');
  return { success: true, updatedPayload };
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

