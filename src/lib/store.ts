import { Booking, BookingStatus, TaskStatus, SeafoodCategory, defaultSeafoodCategories, ReceptionEntry, defaultReceptionLogs, VisitStatus, PartyMenuSet, defaultPartyMenuSets, CommissionEntry, defaultStaffCommissions, ChatMessage, defaultChatMessages } from './data';
import { supabase } from './supabase';
import { isVisitExpired, normalizeRoomName } from './bookingUtils';

// In-memory micro-cache with TTL to protect Supabase Disk IO Budget & Vercel Transfer
const CACHE_TTL_MS = 30000; // 30 seconds (Writes automatically invalidate cache instantly)

let cacheBookings: { data: Booking[]; time: number } | null = null;
let cacheSeafood: { data: { updatedAt: string; categories: SeafoodCategory[] }; time: number } | null = null;
let cachePartyMenus: { data: PartyMenuSet[]; time: number } | null = null;
let cacheReceptionLogs: { data: ReceptionEntry[]; time: number } | null = null;
let cacheCommissions: { data: CommissionEntry[]; time: number } | null = null;
let cacheChatMessages: { data: ChatMessage[]; time: number } | null = null;

// Timeout wrapper to prevent hanging when Supabase IOPS are throttled
async function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number, fallbackValue: any): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallbackValue as T);
    }, timeoutMs);
  });
  const nativePromise = Promise.resolve(promiseLike);
  return Promise.race([
    nativePromise.then((res) => {
      clearTimeout(timer);
      return res;
    }).catch(() => {
      clearTimeout(timer);
      return fallbackValue as T;
    }),
    timeoutPromise
  ]);
}

let globalChatMessages: ChatMessage[] = defaultChatMessages;
let globalStaffCommissions: CommissionEntry[] = defaultStaffCommissions;

let globalPartyMenuSets: PartyMenuSet[] = defaultPartyMenuSets;

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

export async function getBookings(): Promise<Booking[]> {
  const now = Date.now();
  if (cacheBookings && (now - cacheBookings.time) < CACHE_TTL_MS) {
    return cacheBookings.data;
  }

  try {
    const query = supabase
      .from('bookings')
      .select('*')
      .not('id', 'like', 'CONFIG_%');

    const res = await withTimeout(
      query,
      4500,
      { data: null as any, error: 'TIMEOUT' as any }
    );
    const data = res.data;
    const error = res.error;

    if (error || !data) {
      console.warn("Supabase fetch slow/failed. Falling back to memory/cache.", error);
      return cacheBookings?.data || globalBookings;
    }
    
    // Nếu bảng rỗng (người dùng vừa tạo bảng nhưng chưa có data), tự động nạp dữ liệu mẫu
    if (data && data.length === 0 && globalBookings.length > 0) {
      return globalBookings;
    }

    const formatted = data.map((b: any) => ({
      ...b,
      menu: typeof b.menu === 'string' ? JSON.parse(b.menu) : (b.menu || [])
    })) as Booking[];

    cacheBookings = { data: formatted, time: now };
    globalBookings = formatted;
    return formatted;
  } catch (err) {
    return cacheBookings?.data || globalBookings;
  }
}

export async function addBooking(booking: Omit<Booking, 'id'>) {
  cacheBookings = null;
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
  cacheBookings = null;
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
  cacheBookings = null;
  globalBookings = globalBookings.filter(b => b.id !== id);
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase deleteBookingData error:", err);
  }
}

export async function updateKitchenStatus(id: string, status: TaskStatus) {
  cacheBookings = null;
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, kitchenStatus: status } : b);
  try {
    const { error } = await supabase.from('bookings').update({ kitchenStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateKitchenStatus error:", err);
  }
}

export async function updateReceptionStatus(id: string, status: TaskStatus) {
  cacheBookings = null;
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, receptionStatus: status } : b);
  try {
    const { error } = await supabase.from('bookings').update({ receptionStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateReceptionStatus error:", err);
  }
}

export async function updateFloorStatus(id: string, status: TaskStatus) {
  cacheBookings = null;
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, floorStatus: status } : b);
  try {
    const { error } = await supabase.from('bookings').update({ floorStatus: status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateFloorStatus error:", err);
  }
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  cacheBookings = null;
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, status } : b);
  try {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase updateBookingStatus error:", err);
  }
}

export async function getSeafoodInventory(): Promise<{ updatedAt: string; categories: SeafoodCategory[] }> {
  const now = Date.now();
  if (cacheSeafood && (now - cacheSeafood.time) < CACHE_TTL_MS) {
    return cacheSeafood.data;
  }
  try {
    const query = supabase.from('bookings').select('menu, dateTime').eq('id', 'CONFIG_SEAFOOD').single();
    const res = await withTimeout(query, 4500, { data: null as any, error: 'TIMEOUT' as any });
    const data = res.data;
    const error = res.error;
    if (error || !data) {
      return cacheSeafood?.data || globalSeafoodData;
    }
    const parsed = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    if (parsed && parsed.categories) {
      cacheSeafood = { data: parsed, time: now };
      globalSeafoodData = parsed;
      return parsed;
    }
    return cacheSeafood?.data || globalSeafoodData;
  } catch (err) {
    return cacheSeafood?.data || globalSeafoodData;
  }
}

export async function saveSeafoodInventory(inventory: { updatedAt: string; categories: SeafoodCategory[] }) {
  cacheSeafood = null;
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

export async function getPartyMenuSets(): Promise<PartyMenuSet[]> {
  const now = Date.now();
  if (cachePartyMenus && (now - cachePartyMenus.time) < CACHE_TTL_MS) {
    return cachePartyMenus.data;
  }
  try {
    const query = supabase.from('bookings').select('menu').eq('id', 'CONFIG_PARTY_MENUS').single();
    const res = await withTimeout(query, 4500, { data: null as any, error: 'TIMEOUT' as any });
    const data = res.data;
    const error = res.error;
    if (error || !data) {
      return cachePartyMenus?.data || globalPartyMenuSets;
    }
    const parsed = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachePartyMenus = { data: parsed, time: now };
      globalPartyMenuSets = parsed;
      return parsed;
    }
    return cachePartyMenus?.data || globalPartyMenuSets;
  } catch (err) {
    return cachePartyMenus?.data || globalPartyMenuSets;
  }
}

export async function savePartyMenuSets(sets: PartyMenuSet[]): Promise<void> {
  cachePartyMenus = null;
  globalPartyMenuSets = sets;
  try {
    const { error } = await supabase.from('bookings').upsert([{
      id: 'CONFIG_PARTY_MENUS',
      customerName: 'PARTY_MENUS',
      phone: '0000000000',
      dateTime: new Date().toISOString(),
      guestsCount: 0,
      room: 'CONFIG',
      menu: JSON.stringify(sets),
      specialRequest: '',
      decorRequest: '',
      status: 'cancelled',
      receptionStatus: 'done',
      kitchenStatus: 'done',
      floorStatus: 'done'
    }]);
    if (error) console.error("Error saving party menus to Supabase:", error);
  } catch (err) {
    console.error("Error saving party menus to Supabase:", err);
  }
}

function normalizeReceptionList(logs: ReceptionEntry[]): { normalized: ReceptionEntry[]; hasChanges: boolean } {
  let hasChanges = false;
  const normalized = logs.map(item => {
    let current = { ...item };

    // 1. Tự động chuẩn hóa tên phòng/bàn (ví dụ: "3" -> "Bàn 3", "6" -> "Bàn 6")
    const normRoom = normalizeRoomName(current.room);
    if (normRoom && normRoom !== current.room) {
      hasChanges = true;
      current.room = normRoom;
    }

    // 2. Chuyển trạng thái sang 'left' nếu tiệc đã kết thúc/hết hạn
    if (current.status === 'dining' && isVisitExpired(current.date, current.time)) {
      hasChanges = true;
      current.status = 'left' as VisitStatus;
      current.updatedAt = current.updatedAt || new Date().toISOString();
    }
    return current;
  });
  return { normalized, hasChanges };
}

export async function getReceptionLogs(): Promise<ReceptionEntry[]> {
  const now = Date.now();
  if (cacheReceptionLogs && (now - cacheReceptionLogs.time) < CACHE_TTL_MS) {
    return cacheReceptionLogs.data;
  }
  try {
    const query = supabase.from('bookings').select('menu').eq('id', 'CONFIG_RECEPTION').single();
    const res = await withTimeout(query, 4500, { data: null as any, error: 'TIMEOUT' as any });
    const data = res.data;
    const error = res.error;
    if (error || !data) {
      return cacheReceptionLogs?.data || normalizeReceptionList(globalReceptionLogs).normalized;
    }
    const parsed = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((item: any) => !item.id?.startsWith('REC-20261014-00') && !item.id?.startsWith('REC-20261013-00'));
      const { normalized, hasChanges } = normalizeReceptionList(filtered);
      cacheReceptionLogs = { data: normalized, time: now };
      globalReceptionLogs = normalized;
      if (hasChanges) {
        saveReceptionLogs(normalized).catch(err => console.error("Error auto-updating expired reception logs:", err));
      }
      return normalized;
    }
    return cacheReceptionLogs?.data || normalizeReceptionList(globalReceptionLogs).normalized;
  } catch (err) {
    return cacheReceptionLogs?.data || normalizeReceptionList(globalReceptionLogs).normalized;
  }
}

export async function saveReceptionLogs(logs: ReceptionEntry[]) {
  cacheReceptionLogs = null;
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

export async function getStaffCommissions(): Promise<CommissionEntry[]> {
  const now = Date.now();
  if (cacheCommissions && (now - cacheCommissions.time) < CACHE_TTL_MS) {
    return cacheCommissions.data;
  }
  try {
    const query = supabase.from('bookings').select('menu').eq('id', 'CONFIG_CMS').single();
    const res = await withTimeout(query, 4500, { data: null as any, error: 'TIMEOUT' as any });
    const data = res.data;
    const error = res.error;
    if (error || !data) {
      return cacheCommissions?.data || globalStaffCommissions;
    }
    const parsed = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    if (Array.isArray(parsed)) {
      cacheCommissions = { data: parsed, time: now };
      globalStaffCommissions = parsed;
      return parsed;
    }
    return cacheCommissions?.data || globalStaffCommissions;
  } catch (err) {
    return cacheCommissions?.data || globalStaffCommissions;
  }
}

export async function saveStaffCommissions(commissions: CommissionEntry[]): Promise<void> {
  cacheCommissions = null;
  globalStaffCommissions = commissions;
  try {
    const { error } = await supabase.from('bookings').upsert([{
      id: 'CONFIG_CMS',
      customerName: 'STAFF_COMMISSIONS',
      phone: '0000000000',
      dateTime: new Date().toISOString(),
      guestsCount: 0,
      room: 'CONFIG',
      menu: JSON.stringify(commissions),
      specialRequest: '',
      decorRequest: '',
      status: 'cancelled',
      receptionStatus: 'done',
      kitchenStatus: 'done',
      floorStatus: 'done'
    }]);
    if (error) console.error("Error saving CMS commissions to Supabase:", error);
  } catch (err) {
    console.error("Error saving CMS commissions to Supabase:", err);
  }
}

export async function getChatMessages(): Promise<ChatMessage[]> {
  const now = Date.now();
  if (cacheChatMessages && (now - cacheChatMessages.time) < 3000) {
    return cacheChatMessages.data;
  }
  try {
    const query = supabase.from('bookings').select('menu').eq('id', 'CONFIG_CHAT_MESSAGES').single();
    const res = await withTimeout(query, 4000, { data: null as any, error: 'TIMEOUT' as any });
    const data = res.data;
    const error = res.error;
    if (error || !data) {
      return cacheChatMessages?.data || globalChatMessages;
    }
    const parsed = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    if (Array.isArray(parsed)) {
      cacheChatMessages = { data: parsed, time: now };
      globalChatMessages = parsed;
      return parsed;
    }
    return cacheChatMessages?.data || globalChatMessages;
  } catch (err) {
    return cacheChatMessages?.data || globalChatMessages;
  }
}

export async function saveChatMessages(messages: ChatMessage[]): Promise<void> {
  cacheChatMessages = null;
  const capped = messages.slice(-200);
  globalChatMessages = capped;
  try {
    const { error } = await supabase.from('bookings').upsert([{
      id: 'CONFIG_CHAT_MESSAGES',
      customerName: 'RESTAURANT_CHAT_MESSAGES',
      phone: '0000000000',
      dateTime: new Date().toISOString(),
      guestsCount: 0,
      room: 'CONFIG',
      menu: JSON.stringify(capped),
      specialRequest: '',
      decorRequest: '',
      status: 'cancelled',
      receptionStatus: 'done',
      kitchenStatus: 'done',
      floorStatus: 'done'
    }]);
    if (error) console.error("Error saving Chat messages to Supabase:", error);
  } catch (err) {
    console.error("Error saving Chat messages to Supabase:", err);
  }
}

let globalSystemAiKey: string = '';

export async function getSystemGeminiApiKey(): Promise<string> {
  if (globalSystemAiKey) return globalSystemAiKey;

  if (process.env.GEMINI_API_KEY) {
    globalSystemAiKey = process.env.GEMINI_API_KEY.trim();
    return globalSystemAiKey;
  }
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    globalSystemAiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim();
    return globalSystemAiKey;
  }

  try {
    const { data, error } = await supabase.from('bookings').select('menu').eq('id', 'CONFIG_AI').single();
    if (error || !data) {
      return globalSystemAiKey;
    }
    const parsed = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
    if (parsed && typeof parsed.geminiApiKey === 'string') {
      globalSystemAiKey = parsed.geminiApiKey.trim();
      return globalSystemAiKey;
    }
    return globalSystemAiKey;
  } catch (err) {
    return globalSystemAiKey;
  }
}

export async function saveSystemGeminiApiKey(key: string): Promise<void> {
  const cleanKey = (key || '').trim();
  globalSystemAiKey = cleanKey;
  try {
    const { error } = await supabase.from('bookings').upsert([{
      id: 'CONFIG_AI',
      customerName: 'AI_GEMINI_CONFIG',
      phone: '0000000000',
      dateTime: new Date().toISOString(),
      guestsCount: 0,
      room: 'CONFIG',
      menu: JSON.stringify({ geminiApiKey: cleanKey, updatedAt: new Date().toISOString() }),
      specialRequest: '',
      decorRequest: '',
      status: 'cancelled',
      receptionStatus: 'done',
      kitchenStatus: 'done',
      floorStatus: 'done'
    }]);
    if (error) console.error("Error saving Gemini API key to Supabase:", error);
  } catch (err) {
    console.error("Error saving Gemini API key to Supabase:", err);
  }
}


