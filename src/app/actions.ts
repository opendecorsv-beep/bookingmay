'use server'

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getBookings, addBooking, updateBookingData, deleteBookingData, updateKitchenStatus, updateFloorStatus, updateBookingStatus, updateReceptionStatus, getSeafoodInventory, saveSeafoodInventory } from '@/lib/store';
import { Booking, BookingStatus, TaskStatus, SeafoodCategory } from '@/lib/data';

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
       const decorName = {"1": "Bướm Ngũ Sắc", "2": "Bướm Trắng", "3": "Bướm Đỏ", "4": "Nơ Trắng", "5": "Background Nâu", "6": "Nơ Hồng", "7": "Free S4 1", "8": "Free S4 2"}[newPkg] || `Số ${newPkg}`;
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

  await addBooking(data);
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

  await updateBookingData(id, data);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  revalidatePath('/floor-plan');
  return { success: true };
}

export async function deleteBookingAction(id: string) {
  await verifyAuthPermission();
  await deleteBookingData(id);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  revalidatePath('/floor-plan');
}

export async function setReceptionStatus(id: string, status: TaskStatus) {
  await verifyAuthPermission();
  updateReceptionStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
}

export async function setKitchenStatus(id: string, status: TaskStatus) {
  await verifyAuthPermission();
  updateKitchenStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/archive');
}

export async function setFloorStatus(id: string, status: TaskStatus) {
  await verifyAuthPermission();
  updateFloorStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor');
  revalidatePath('/archive');
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  await verifyAuthPermission();
  updateBookingStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor-plan');
  revalidatePath('/archive');
}

export async function restoreBookingAction(id: string) {
  await verifyAuthPermission();
  updateReceptionStatus(id, 'done');
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

