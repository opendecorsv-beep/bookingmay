'use server'

import { revalidatePath } from 'next/cache';
import { getBookings, addBooking, updateBookingData, deleteBookingData, updateKitchenStatus, updateFloorStatus, updateBookingStatus, updateReceptionStatus } from '@/lib/store';
import { Booking, BookingStatus, TaskStatus } from '@/lib/data';

export async function fetchBookings() {
  return getBookings();
}

function checkDecorConflict(bookings: Booking[], newDateTimeStr: string, newDecorStr: string, currentBookingId?: string): string | null {
  if (!newDecorStr.includes('|PKG:')) return null;
  const newPkgStr = newDecorStr.split('|').find(p => p.startsWith('PKG:'));
  if (!newPkgStr || newPkgStr === 'PKG:') return null;
  const newPkg = newPkgStr.replace('PKG:', '');
  
  const newTime = new Date(newDateTimeStr).getTime();

  for (const b of bookings) {
    if (b.id === currentBookingId) continue;
    if (!b.decorRequest || !b.decorRequest.includes(`|PKG:${newPkg}`)) continue;

    const bTime = new Date(b.dateTime).getTime();
    const diffHours = Math.abs(bTime - newTime) / (1000 * 60 * 60);

    if (diffHours < 5) {
       const decorName = {"1": "Bướm Ngũ Sắc", "2": "Bướm Trắng", "3": "Bướm Đỏ", "4": "Nơ Trắng", "5": "Background Nâu", "6": "Nơ Hồng"}[newPkg] || `Số ${newPkg}`;
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
  await deleteBookingData(id);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  revalidatePath('/floor-plan');
}

export async function setReceptionStatus(id: string, status: TaskStatus) {
  updateReceptionStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
}

export async function setKitchenStatus(id: string, status: TaskStatus) {
  updateKitchenStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
}

export async function setFloorStatus(id: string, status: TaskStatus) {
  updateFloorStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/floor');
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  updateBookingStatus(id, status);
  revalidatePath('/');
  revalidatePath('/bookings');
}
