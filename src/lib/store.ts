import { Booking, BookingStatus, TaskStatus, SeafoodCategory, defaultSeafoodCategories, ReceptionEntry, defaultReceptionLogs, VisitStatus } from './data';
import { supabase } from './supabase';
import { isVisitExpired } from './bookingUtils';

let globalSeafoodData: { updatedAt: string; categories: SeafoodCategory[] } = {
  updatedAt: new Date().toISOString(),
  categories: defaultSeafoodCategories
};

let globalReceptionLogs: ReceptionEntry[] = defaultReceptionLogs;

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

    return data
      .filter(b => b.id !== 'CONFIG_SEAFOOD' && !b.id.startsWith('CONFIG_'))
      .map(b => ({
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
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, ...data } : b);
  try {
    const updatePayload: any = { ...data };
    if (data.menu) {
      updatePayload.menu = JSON.stringify(data.menu);
    }
    const { error } = await supabase.from('bookings').update(updatePayload).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateBookingData error:", err);
  }
}

export async function deleteBookingData(id: string) {
  globalBookings = globalBookings.filter(b => b.id !== id);
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase deleteBookingData error:", err);
  }
}

export async function updateKitchenStatus(id: string, status: TaskStatus) {
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, kitchenStatus: status } : b);
  try {
    const { error } = await supabase.from('bookings').update({ kitchenStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateKitchenStatus error:", err);
  }
}

export async function updateReceptionStatus(id: string, status: TaskStatus) {
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, receptionStatus: status } : b);
  try {
    const { error } = await supabase.from('bookings').update({ receptionStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateReceptionStatus error:", err);
  }
}

export async function updateFloorStatus(id: string, status: TaskStatus) {
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, floorStatus: status } : b);
  try {
    const { error } = await supabase.from('bookings').update({ floorStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateFloorStatus error:", err);
  }
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, status } : b);
  try {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateBookingStatus error:", err);
  }
}

export async function getSeafoodInventory(): Promise<{ updatedAt: string; categories: SeafoodCategory[] }> {
  try {
    const { data, error } = await supabase.from('bookings').select('menu, dateTime').eq('id', 'CONFIG_SEAFOOD').single();
    if (error || !data) {
      return globalSeafoodData;
    }
    const parsed = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    if (parsed && parsed.categories) {
      return parsed;
    }
    return globalSeafoodData;
  } catch (err) {
    return globalSeafoodData;
  }
}

export async function saveSeafoodInventory(inventory: { updatedAt: string; categories: SeafoodCategory[] }) {
  globalSeafoodData = inventory;
  try {
    const { error } = await supabase.from('bookings').upsert([{
      id: 'CONFIG_SEAFOOD',
      customerName: 'SEAFOOD_INVENTORY',
      phone: '0000000000',
      dateTime: inventory.updatedAt,
      guestsCount: 0,
      room: 'CONFIG',
      menu: JSON.stringify(inventory),
      specialRequest: '',
      decorRequest: '',
      status: 'cancelled',
      receptionStatus: 'done',
      kitchenStatus: 'done',
      floorStatus: 'done'
    }]);
    if (error) console.error("Error saving seafood to Supabase:", error);
  } catch (err) {
    console.error("Error saving seafood to Supabase:", err);
  }
}

function normalizeReceptionList(logs: ReceptionEntry[]): { normalized: ReceptionEntry[]; hasChanges: boolean } {
  let hasChanges = false;
  const normalized = logs.map(item => {
    if (item.status === 'dining' && isVisitExpired(item.date, item.time)) {
      hasChanges = true;
      return {
        ...item,
        status: 'left' as VisitStatus,
        updatedAt: item.updatedAt || new Date().toISOString()
      };
    }
    return item;
  });
  return { normalized, hasChanges };
}

export async function getReceptionLogs(): Promise<ReceptionEntry[]> {
  try {
    const { data, error } = await supabase.from('bookings').select('menu').eq('id', 'CONFIG_RECEPTION').single();
    if (error || !data) {
      return normalizeReceptionList(globalReceptionLogs).normalized;
    }
    const parsed = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((item: any) => !item.id?.startsWith('REC-20261014-00') && !item.id?.startsWith('REC-20261013-00'));
      const { normalized, hasChanges } = normalizeReceptionList(filtered);
      if (hasChanges) {
        saveReceptionLogs(normalized).catch(err => console.error("Error auto-updating expired reception logs:", err));
      }
      return normalized;
    }
    return normalizeReceptionList(globalReceptionLogs).normalized;
  } catch (err) {
    return normalizeReceptionList(globalReceptionLogs).normalized;
  }
}

export async function saveReceptionLogs(logs: ReceptionEntry[]) {
  globalReceptionLogs = logs;
  try {
    const { error } = await supabase.from('bookings').upsert([{
      id: 'CONFIG_RECEPTION',
      customerName: 'RECEPTION_LOGS',
      phone: '0000000000',
      dateTime: new Date().toISOString(),
      guestsCount: 0,
      room: 'CONFIG',
      menu: JSON.stringify(logs),
      specialRequest: '',
      decorRequest: '',
      status: 'cancelled',
      receptionStatus: 'done',
      kitchenStatus: 'done',
      floorStatus: 'done'
    }]);
    if (error) console.error("Error saving reception logs to Supabase:", error);
  } catch (err) {
    console.error("Error saving reception logs to Supabase:", err);
  }
}

