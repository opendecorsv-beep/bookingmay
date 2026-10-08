import { Booking, BookingStatus, TaskStatus } from './data';
import { supabase } from './supabase';

let globalBookings: Booking[] = [
  {
    id: "MAY-T10-001",
    customerName: "Ms. Tâm (Châu)",
    phone: "0977815829",
    dateTime: "2026-10-12T18:30:00+07:00",
    guestsCount: 6,
    room: "Chưa chọn",
    menu: [],
    specialRequest: "",
    decorRequest: "Chưa chốt",
    status: "confirmed",
    receptionStatus: "pending",
    kitchenStatus: "pending",
    floorStatus: "pending"
  },
  {
    id: "MAY-T10-005",
    customerName: "Ms. Ngọc",
    phone: "0969513737",
    dateTime: "2026-10-11T12:30:00+07:00",
    guestsCount: 8,
    room: "Mây 101",
    menu: [],
    specialRequest: "",
    decorRequest: "Sinh nhật",
    status: "confirmed",
    receptionStatus: "done",
    kitchenStatus: "pending",
    floorStatus: "pending"
  },
  {
    id: "MAY-T10-006",
    customerName: "Ms. Tuyết",
    phone: "0903547168",
    dateTime: "2026-10-11T18:30:00+07:00",
    guestsCount: 2,
    room: "Chưa chọn",
    menu: [],
    specialRequest: "",
    decorRequest: "Chưa chốt",
    status: "pending",
    receptionStatus: "pending",
    kitchenStatus: "pending",
    floorStatus: "pending"
  },
  {
    id: "MAY-T10-010",
    customerName: "Ms. Kim Chung",
    phone: "0948377374",
    dateTime: "2026-10-31T19:00:00+07:00",
    guestsCount: 25,
    room: "Chưa chọn",
    menu: [],
    specialRequest: "",
    decorRequest: "Sinh nhật",
    status: "confirmed",
    receptionStatus: "pending",
    kitchenStatus: "pending",
    floorStatus: "pending"
  }
];

export async function getBookings() {
  try {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error) {
      console.warn("Supabase fetch failed (table might not exist). Falling back to memory.", error);
      return globalBookings;
    }
    
    // Nếu bảng rỗng (người dùng vừa tạo bảng nhưng chưa có data), tự động nạp dữ liệu mẫu
    if (data && data.length === 0) {
      console.log("Seeding initial data to Supabase...");
      for (const b of globalBookings) {
        await supabase.from('bookings').insert([{
          ...b,
          menu: JSON.stringify(b.menu)
        }]);
      }
      return globalBookings;
    }

    return data.map(b => ({
      ...b,
      menu: typeof b.menu === 'string' ? JSON.parse(b.menu) : (b.menu || [])
    })) as Booking[];
  } catch (err) {
    return globalBookings;
  }
}

export async function addBooking(booking: Omit<Booking, 'id'>) {
  const newId = "MAY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const newBooking = { ...booking, id: newId };
  
  try {
    const { error } = await supabase.from('bookings').insert([{
      ...newBooking,
      menu: JSON.stringify(newBooking.menu)
    }]);
    if (error) throw error;
  } catch (err) {
    console.warn("Supabase insert failed. Falling back to memory.");
    globalBookings.push(newBooking);
  }
  return newBooking;
}

export async function updateBookingData(id: string, data: Partial<Omit<Booking, 'id'>>) {
  try {
    const updatePayload: any = { ...data };
    if (data.menu) {
      updatePayload.menu = JSON.stringify(data.menu);
    }
    const { error } = await supabase.from('bookings').update(updatePayload).eq('id', id);
    if (error) throw error;
  } catch (err) {
    globalBookings = globalBookings.map(b => b.id === id ? { ...b, ...data } : b);
  }
}

export async function deleteBookingData(id: string) {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    globalBookings = globalBookings.filter(b => b.id !== id);
  }
}

export async function updateKitchenStatus(id: string, status: TaskStatus) {
  try {
    const { error } = await supabase.from('bookings').update({ kitchenStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    globalBookings = globalBookings.map(b => b.id === id ? { ...b, kitchenStatus: status } : b);
  }
}

export async function updateReceptionStatus(id: string, status: TaskStatus) {
  try {
    const { error } = await supabase.from('bookings').update({ receptionStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    globalBookings = globalBookings.map(b => b.id === id ? { ...b, receptionStatus: status } : b);
  }
}

export async function updateFloorStatus(id: string, status: TaskStatus) {
  try {
    const { error } = await supabase.from('bookings').update({ floorStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    globalBookings = globalBookings.map(b => b.id === id ? { ...b, floorStatus: status } : b);
  }
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  try {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    globalBookings = globalBookings.map(b => b.id === id ? { ...b, status } : b);
  }
}
