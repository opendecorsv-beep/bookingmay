'use server'

import { revalidatePath } from 'next/cache';
import { getBookings, addBooking, updateBookingData, deleteBookingData, updateKitchenStatus, updateFloorStatus, updateBookingStatus, updateReceptionStatus } from '@/lib/store';
import { Booking, BookingStatus, TaskStatus } from '@/lib/data';

export async function fetchBookings() {
  return getBookings();
}

export async function createNewBooking(data: Omit<Booking, 'id'>) {
  addBooking(data);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  revalidatePath('/floor-plan');
}

export async function updateExistingBooking(id: string, data: Partial<Omit<Booking, 'id'>>) {
  await updateBookingData(id, data);
  revalidatePath('/');
  revalidatePath('/bookings');
  revalidatePath('/kitchen');
  revalidatePath('/floor');
  revalidatePath('/floor-plan');
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
