import { Booking } from './data';

/**
 * Lấy thời gian hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).
 */
export function getVietnamNow(): Date {
  const utcNow = new Date();
  return new Date(utcNow.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
}

/**
 * Trả về ngày hiện tại theo lịch Việt Nam dưới dạng chuỗi "YYYY-MM-DD".
 */
export function getVietnamTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Phân tích chuỗi ngày giờ booking thành Date object chính xác (epoch UTC).
 * Hoạt động đồng nhất trên mọi môi trường máy chủ (Windows UTC+7, Vercel UTC...).
 * Hỗ trợ các định dạng: "YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss+07:00", "YYYY-MM-DD HH:mm", v.v.
 */
export function parseBookingDate(dtStr: string): Date {
  if (!dtStr) return new Date();
  const cleanStr = dtStr.trim();
  const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    const [, y, m, d, h, min] = match;
    // Tính toán chính xác theo múi giờ Việt Nam (UTC+7)
    return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h) - 7, parseInt(min), 0));
  }
  return new Date(cleanStr);
}

/**
 * Trả về chuỗi ngày "YYYY-MM-DD" của booking theo lịch Việt Nam.
 */
export function getBookingDateString(dtStr: string): string {
  if (!dtStr) return '';
  const match = dtStr.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = parseBookingDate(dtStr);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Kiểm tra xem tiệc đã qua ngày chưa (ngày tổ chức < ngày hôm nay theo lịch Việt Nam).
 */
export function isPastDay(dateTimeStr: string): boolean {
  try {
    const bookingDay = getBookingDateString(dateTimeStr);
    const today = getVietnamTodayString();
    return !!bookingDay && bookingDay < today;
  } catch (e) {
    return false;
  }
}

/**
 * Kiểm tra xem tiệc đã qua thời gian bắt đầu tiệc trên 8 tiếng chưa.
 */
export function isPast8Hours(dateTimeStr: string): boolean {
  try {
    const bookingDate = parseBookingDate(dateTimeStr);
    const diffHours = (Date.now() - bookingDate.getTime()) / (1000 * 60 * 60);
    return diffHours >= 8;
  } catch (e) {
    return false;
  }
}

/**
 * Kiểm tra xem một booking có thuộc diện tự động chuyển vào Lưu Trữ không:
 * 1. Giám sát đã bấm chọn dọn xong (clean)
 * 2. Tiệc đã qua ngày (hôm qua hoặc trước đó)
 * 3. Tiệc đã qua thời gian tổ chức tiệc trên 8 tiếng
 */
/**
 * Kiểm tra xem một lượt đón khách / tiệc đã kết thúc chưa:
 * 1. Tiệc đã qua ngày (dateStr < today theo giờ VN)
 * 2. Hoặc nếu cùng ngày nhưng đã quá 6 tiếng tính từ giờ vào / giờ tiệc
 */
export function isVisitExpired(dateStr: string, timeStr?: string): boolean {
  if (!dateStr) return true;
  const today = getVietnamTodayString();
  if (dateStr < today) return true;
  if (dateStr > today) return false;
  
  // Nếu trong ngày hôm nay: kiểm tra xem đã qua hơn 10 tiếng chưa (tránh ngắt sớm các tiệc trưa ngồi lâu đến chiều tối)
  if (timeStr) {
    try {
      const entryTime = parseBookingDate(`${dateStr}T${timeStr}`);
      const diffHours = (Date.now() - entryTime.getTime()) / (1000 * 60 * 60);
      return diffHours >= 10;
    } catch {
      return false;
    }
  }
  return false;
}

export const SUB_ROOMS_MAP: Record<string, string[]> = {
  'Mây 201': ['Mây 201.1', 'Mây 201.2', 'Mây 201.3', 'Mây 201.4', 'Mây 201.5', 'Mây 201.6'],
  'Mây 301': ['Mây 301.1', 'Mây 301.2', 'Mây 301.3', 'Mây 301.4', 'Mây 301.5', 'Mây 301.6'],
};

export const MASTER_ROOMS = Object.keys(SUB_ROOMS_MAP);

/**
 * Kiểm tra xem một booking hoặc tên phòng có phải là ĐẶT NGUYÊN PHÒNG (Bao trọn đại sảnh) hay không:
 * - Tên phòng hoặc ghi chú có chữ "nguyên phòng", "bao trọn", "bao phòng"
 * - Hoặc số lượng khách rất lớn (>= 25 khách) được xếp vào phòng 201 hoặc 301
 */
export function isFullHallBanquet(bookingOrRoom: Booking | string | undefined | null, guestsCount?: number): boolean {
  if (!bookingOrRoom) return false;
  if (typeof bookingOrRoom === 'string') {
    const s = bookingOrRoom.toLowerCase();
    return s.includes('nguyên phòng') || s.includes('nguyen phong') || s.includes('bao trọn') || s.includes('bao phong');
  }

  const b = bookingOrRoom;
  const roomLower = (b.room || '').toLowerCase();
  const notesLower = (b.specialRequest || '').toLowerCase() + (b.decorRequest || '').toLowerCase();

  if (roomLower.includes('nguyên phòng') || roomLower.includes('nguyen phong') || roomLower.includes('bao phòng')) {
    return true;
  }
  if (notesLower.includes('[nguyên phòng]') || notesLower.includes('[bao phòng]') || notesLower.includes('[nguyen phong]')) {
    return true;
  }
  if ((b.guestsCount || 0) >= 25 && (roomLower.includes('201') || roomLower.includes('301'))) {
    return true;
  }

  return false;
}

export function getParentMasterRoom(room: string | undefined | null): string | null {
  if (!room) return null;
  const norm = normalizeRoomName(room);
  for (const [master, subs] of Object.entries(SUB_ROOMS_MAP)) {
    if (subs.includes(norm)) return master;
  }
  return null;
}

export function getSubRoomsOf(masterRoom: string | undefined | null): string[] {
  if (!masterRoom) return [];
  const norm = normalizeRoomName(masterRoom);
  const base = norm.includes('201') ? 'Mây 201' : (norm.includes('301') ? 'Mây 301' : norm);
  return SUB_ROOMS_MAP[base] || [];
}

export function isMasterRoom(room: string | undefined | null): boolean {
  if (!room) return false;
  const norm = normalizeRoomName(room);
  return (norm.startsWith('Mây 201') && !norm.includes('201.')) ||
         (norm.startsWith('Mây 301') && !norm.includes('301.'));
}

export function isSubRoom(room: string | undefined | null): boolean {
  return getParentMasterRoom(room) !== null;
}

/**
 * Chuẩn hóa tên phòng/bàn thông minh để toàn bộ hệ thống đồng bộ nhất quán:
 * - "3", "03", "b3", "ban 3", "bàn 03" -> "Bàn 3"
 * - "101", "m101", "may 101", "mây 101" -> "Mây 101"
 * - "201", "201.1", "301.6" -> "Mây 201", "Mây 201.1", "Mây 301.6"
 */
export function normalizeRoomName(raw: string | undefined | null): string {
  if (!raw) return '';
  const s = raw.trim();
  if (!s || s === 'Chưa chọn' || s === 'Sảnh chung') return s;

  const lower = s.toLowerCase().replace(/\s+/g, ' ');

  // 0. Khớp nguyên phòng
  if (lower.includes('nguyên phòng') || lower.includes('nguyen phong') || lower.includes('bao trọn') || lower.includes('bao phong')) {
    if (lower.includes('201')) return 'Mây 201 (Nguyên phòng)';
    if (lower.includes('301')) return 'Mây 301 (Nguyên phòng)';
  }

  // 1. Khớp phòng tầng VIP và các bàn con: "mây 101", "may 101", "m101", "201.1", "301.6"
  const mayMatch = lower.match(/^(?:m(?:ây|ay)?\s*)?([1-3]\d{2}(?:\.[1-6])?)$/i);
  if (mayMatch) {
    return `Mây ${mayMatch[1]}`;
  }

  // 2. Khớp số bàn: "bàn 3", "ban 3", "b3", "b 3", "b03", "bàn 03", "3", "03", "25"
  const banMatch = lower.match(/^(?:b(?:àn|an)?\s*)?0*(\d{1,2})$/i);
  if (banMatch) {
    const num = parseInt(banMatch[1], 10);
    if (num >= 1 && num <= 50) {
      return `Bàn ${num}`;
    }
  }

  // 3. Nếu bắt đầu bằng "bàn " hoặc "ban " với số
  if (/^b(?:àn|an)\s+\d+/i.test(lower)) {
    const num = lower.replace(/^b(?:àn|an)\s+/i, '').trim();
    const parsed = parseInt(num, 10);
    if (!isNaN(parsed)) return `Bàn ${parsed}`;
  }

  // 4. Nếu bắt đầu bằng "mây " hoặc "may "
  if (/^m(?:ây|ay)\s+[\d.]+/i.test(lower)) {
    const num = lower.replace(/^m(?:ây|ay)\s+/i, '').trim();
    return `Mây ${num}`;
  }

  return s;
}

/**
 * Tách một chuỗi phòng/bàn phức hợp (vd: "Bàn 1, Bàn 2", "Bàn 1-3", "Mây 101 + Mây 102") thành danh sách các phòng riêng biệt
 */
export function extractRoomTokens(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s || s === 'Chưa chọn' || s === 'Sảnh chung') return [s];

  // Hỗ trợ dạng khoảng "Bàn 1 - 3" hoặc "Bàn 1 - Bàn 3"
  const rangeMatch = s.match(/^b(?:àn|an)?\s*(\d+)\s*[-~đến]\s*(?:b(?:àn|an)?\s*)?(\d+)$/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && end >= start && end - start <= 25) {
      const result: string[] = [];
      for (let i = start; i <= end; i++) {
        result.push(`Bàn ${i}`);
      }
      return result;
    }
  }

  // Tách theo dấu phẩy, chấm phẩy, cộng, &, /, "và", "với"
  const parts = s.split(/[,;+&/]|(?:\s+v[àa]\s+)|(?:\s+v[ớơ]i\s+)/i)
    .map(p => p.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.map(p => normalizeRoomName(p));
  }

  return [normalizeRoomName(s)];
}

/**
 * Đếm số lượng bàn thực tế mà một booking hoặc phòng/bàn chiếm dụng (hỗ trợ cả tiệc gộp bàn)
 */
export function getBookingTableCount(room: string | undefined | null): number {
  if (!room || room === 'Chưa chọn' || room === 'Sảnh chung') return 1;
  const tokens = extractRoomTokens(room);
  return Math.max(1, tokens.length);
}

/**
 * So sánh 2 phòng/bàn xem có trùng nhau không (bất kể định dạng viết tắt, hoa thường, hay tiệc gộp bàn).
 * Ví dụ: isSameRoom("3", "Bàn 3") -> true
 *         isSameRoom("m101", "Mây 101") -> true
 *         isSameRoom("Bàn 1, Bàn 2", "Bàn 1") -> true (khách ngồi bàn 1 và bàn 2)
 */
export function isSameRoom(roomA: string | undefined | null, roomB: string | undefined | null): boolean {
  if (!roomA || !roomB) return false;
  const a = roomA.trim();
  const b = roomB.trim();
  if (!a || !b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;

  const normA = normalizeRoomName(a);
  const normB = normalizeRoomName(b);
  if (normA && normB && normA.toLowerCase() === normB.toLowerCase()) {
    return true;
  }

  // Khớp nguyên phòng với phòng cha đại sảnh (vd: "Mây 301 (Nguyên phòng)" và "Mây 301")
  const baseMasterA = normA.includes('201') && !normA.includes('201.') ? 'Mây 201' : (normA.includes('301') && !normA.includes('301.') ? 'Mây 301' : null);
  const baseMasterB = normB.includes('201') && !normB.includes('201.') ? 'Mây 201' : (normB.includes('301') && !normB.includes('301.') ? 'Mây 301' : null);
  if (baseMasterA && baseMasterB && baseMasterA === baseMasterB) {
    return true;
  }

  // Kiểm tra nếu một trong hai chuỗi là tổ hợp nhiều bàn (vd: "Bàn 1, Bàn 2" chứa "Bàn 1")
  const tokensA = extractRoomTokens(a);
  const tokensB = extractRoomTokens(b);

  if (tokensA.length > 1 || tokensB.length > 1) {
    return tokensA.some(tA =>
      tokensB.some(tB => tA.toLowerCase() === tB.toLowerCase() || normalizeRoomName(tA).toLowerCase() === normalizeRoomName(tB).toLowerCase())
    );
  }

  return false;
}

export function isBookingArchived(b: Booking, _unusedNow?: Date): boolean {
  // 1. Giám sát đã bấm chọn dọn xong (clean)
  if (b.receptionStatus === 'clean') return true;

  // 2. Tiệc đã được quản lý khôi phục thủ công ([RESTORED])
  // Giữ lại ở danh sách hoạt động để phục vụ/sửa thông tin cho đến khi được bấm dọn xong (clean) lại
  if ((b.specialRequest || '').includes('[RESTORED]')) {
    return false;
  }

  // 3. Tự động chuyển vào lưu trữ nếu tiệc đã qua ngày (hôm qua hoặc trước đó)
  if (isPastDay(b.dateTime)) return true;
  // 4. Tự động chuyển vào lưu trữ nếu đã qua thời gian tổ chức tiệc trên 8 tiếng
  return isPast8Hours(b.dateTime);
}

/**
 * Phân tích chuỗi giá thành số nguyên (hỗ trợ các dạng: "2.500.000", "2,500,000", "2500000", "2tr5", "2.5tr", "500k", v.v.)
 */
export function parsePriceToNumber(raw: string | number | undefined | null): number {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  const s = String(raw).toLowerCase().trim();

  // Kiểm tra đơn vị 'tr' / 'triệu' (vd: "2tr5", "2.5tr", "2tr")
  const trMatch = s.match(/^([\d.,]+)\s*(tr|triệu)/);
  if (trMatch) {
    const val = parseFloat(trMatch[1].replace(',', '.'));
    if (!isNaN(val)) {
      const after = s.slice(trMatch[0].length).trim();
      const afterNum = parseInt(after);
      if (!isNaN(afterNum) && afterNum < 10) {
        return Math.round((val + afterNum / 10) * 1000000);
      }
      return Math.round(val * 1000000);
    }
  }

  // Kiểm tra đơn vị 'k' (vd: "500k", "1500k")
  const kMatch = s.match(/^([\d.,]+)\s*k/);
  if (kMatch) {
    const val = parseFloat(kMatch[1].replace(',', '.'));
    if (!isNaN(val)) return Math.round(val * 1000);
  }

// Chuỗi số thông thường loại bỏ dấu chấm/phẩy/chữ
  const num = parseInt(s.replace(/[^\d]/g, ''));
  return isNaN(num) ? 0 : num;
}

export const DECOR_PACKAGE_NAMES: Record<string, string> = {
  "1": "Mây 1 - Bướm Ngũ Sắc",
  "2": "Mây 2 - Bướm Trắng",
  "3": "Mây 3 - Bướm Đỏ",
  "4": "Mây 4 - Nơ Trắng",
  "5": "Mây 5 - Background Nâu",
  "6": "Mây 6 - Nơ Hồng",
  "7": "Free S4 Mẫu 1 (5 bộ - Tối đa 5 bàn)",
  "8": "Free S4 Mẫu 2 (5 bộ - Tối đa 5 bàn)",
  "9": "Gói Hoa Tươi",
  "custom": "Decor Theo Yêu Cầu Riêng"
};

export const DECOR_PACKAGE_CAPACITIES: Record<string, number> = {
  "1": 1, // Độc quyền 1 bộ
  "2": 1, // Độc quyền 1 bộ
  "3": 1, // Độc quyền 1 bộ
  "4": 1, // Độc quyền 1 bộ
  "5": 1, // Độc quyền 1 bộ
  "6": 1, // Độc quyền 1 bộ
  "7": 5, // Free S4 Mẫu 1: 5 bộ (tương ứng tối đa 5 bàn cùng lúc)
  "8": 5, // Free S4 Mẫu 2: 5 bộ (tương ứng tối đa 5 bàn cùng lúc)
  "9": 1, // Độc quyền 1 bộ
};

export interface ParsedSpecialRequest {
  cleanNotes: string;
  deposit: string | null;
  discount: string | null;
  source: string | null;
  isRestored: boolean;
}

export function parseSpecialRequest(raw: string = ""): ParsedSpecialRequest {
  let cleanNotes = raw || "";
  const depositMatch = cleanNotes.match(/\[Cọc:\s*([^\]]+)\]/i);
  const discountMatch = cleanNotes.match(/\[Giảm giá:\s*([^\]]+)\]/i);
  const sourceMatch = cleanNotes.match(/\[Nguồn:\s*([^\]]+)\]/i);
  const isRestored = /\[RESTORED\]/i.test(cleanNotes);

  cleanNotes = cleanNotes
    .replace(/\[Cọc:\s*[^\]]+\]/gi, "")
    .replace(/\[Giảm giá:\s*[^\]]+\]/gi, "")
    .replace(/\[Nguồn:\s*[^\]]+\]/gi, "")
    .replace(/\[RESTORED\]/gi, "")
    .trim();

  return {
    cleanNotes,
    deposit: depositMatch ? depositMatch[1].trim() : null,
    discount: discountMatch ? discountMatch[1].trim() : null,
    source: sourceMatch ? sourceMatch[1].trim() : null,
    isRestored,
  };
}

export interface ParsedDecorRequest {
  occasion: string;
  pkg: string;
  price: string;
  note: string;
  pkgName?: string;
}

export function parseDecorRequest(raw: string = ""): ParsedDecorRequest {
  if (!raw || raw === "Không có") {
    return { occasion: "Không có", pkg: "", price: "", note: "" };
  }
  let occasion = "Không có";
  let pkg = "";
  let price = "";
  let note = "";
  const parts = raw.split("|");
  occasion = parts[0] || "Không có";
  parts.forEach((p) => {
    if (p.startsWith("PKG:")) pkg = p.replace("PKG:", "").trim();
    if (p.startsWith("PRICE:")) price = p.replace("PRICE:", "").trim();
    if (p.startsWith("NOTE:")) note = p.replace("NOTE:", "").trim();
  });
  const pkgName = pkg ? DECOR_PACKAGE_NAMES[pkg] || `Gói Mây ${pkg}` : undefined;
  return { occasion, pkg, price, note, pkgName };
}

/**
 * Kiểm tra xung đột gói decor:
 * - Gói 1-6 & 9: Gói độc quyền (tối đa 1 bộ trong vòng 5 tiếng).
 * - Gói 7 (Free S4 Mẫu 1): Có 5 bộ/5 bàn cùng lúc trong vòng 5 tiếng.
 * - Gói 8 (Free S4 Mẫu 2): Có 5 bộ/5 bàn cùng lúc trong vòng 5 tiếng.
 * - Bỏ qua booking đã hủy hoặc đã dọn xong hoàn tất.
 */
export function checkDecorConflict(
  bookings: Booking[],
  newDateTimeStr: string,
  newDecorStr: string,
  currentBookingId?: string,
  candidateRoom?: string
): string | null {
  if (!newDecorStr || !newDecorStr.includes('|PKG:')) return null;
  const newPkgStr = newDecorStr.split('|').find(p => p.startsWith('PKG:'));
  if (!newPkgStr) return null;
  const newPkg = newPkgStr.replace('PKG:', '').trim();
  if (!newPkg || newPkg === 'custom') return null;

  const maxCapacity = DECOR_PACKAGE_CAPACITIES[newPkg] ?? 1;
  const newTime = new Date(newDateTimeStr).getTime();
  if (isNaN(newTime)) return null;

  // Tìm tất cả booking đang hoạt động có dùng gói decor này trong vòng 5 tiếng
  const conflictingBookings = bookings.filter(b => {
    if (b.id === currentBookingId) return false;
    // Bỏ qua các booking đã hủy hoặc đã dọn xong hoàn tất
    if (b.status === 'cancelled') return false;
    if (b.receptionStatus === 'clean') return false;
    if (!b.decorRequest || !b.decorRequest.includes(`|PKG:${newPkg}`)) return false;

    const bTime = new Date(b.dateTime).getTime();
    if (isNaN(bTime)) return false;
    const diffHours = Math.abs(bTime - newTime) / (1000 * 60 * 60);
    return diffHours < 5;
  });

  const decorName = DECOR_PACKAGE_NAMES[newPkg] || `Gói Mây ${newPkg}`;

  if (maxCapacity === 1) {
    // Gói độc quyền (chỉ có 1 bộ duy nhất)
    if (conflictingBookings.length > 0) {
      const b = conflictingBookings[0];
      const [d, t] = (b.dateTime || '').split('T');
      let timeStr = b.dateTime;
      if (d && t) {
        const [year, month, day] = d.split('-');
        timeStr = `${t.substring(0, 5)} ngày ${day}/${month}/${year}`;
      }
      return `Gói Decor "${decorName}" là gói độc quyền (chỉ có 1 bộ) và đã được khách ${b.customerName} đặt vào lúc ${timeStr}. Hai tiệc dùng chung 1 gói decor độc quyền cần cách nhau tối thiểu 5 tiếng!`;
    }
  } else {
    // Gói có nhiều bộ (như Free S4 Mẫu 1 có 5 bộ/5 bàn, Free S4 Mẫu 2 có 5 bộ/5 bàn)
    const currentlyOccupiedTables = conflictingBookings.reduce((sum, b) => {
      return sum + getBookingTableCount(b.room);
    }, 0);

    const neededTables = getBookingTableCount(candidateRoom);

    if (currentlyOccupiedTables + neededTables > maxCapacity) {
      const availableSets = Math.max(0, maxCapacity - currentlyOccupiedTables);
      const bookedDetails = conflictingBookings.map(b => {
        const [d, t] = (b.dateTime || '').split('T');
        const timePart = t ? t.substring(0, 5) : '';
        const datePart = d ? d.split('-').reverse().join('/') : '';
        return `${b.customerName} (${b.room || 'Chưa chọn'} lúc ${timePart} ${datePart})`;
      }).join(', ');

      const altPkg = newPkg === '7' ? 'Free S4 Mẫu 2' : (newPkg === '8' ? 'Free S4 Mẫu 1' : 'gói khác');

      return `Gói Decor "${decorName}" có tổng cộng ${maxCapacity} bộ (tối đa ${maxCapacity} bàn). Hiện tại trong khung giờ này đã có ${currentlyOccupiedTables} bàn đặt (${bookedDetails}), chỉ còn trống ${availableSets} bộ, không đủ cho ${neededTables} bàn yêu cầu. Quý khách vui lòng chọn ${altPkg} hoặc khung giờ khác!`;
    }
  }

  return null;
}

/**
 * Kiểm tra xem phòng/bàn ứng viên có bị trùng lịch hoặc xung đột cha - con với các booking hiện có không
 * - Chỉ coi là xung đột nguyên phòng khi booking THỰC SỰ là tiệc nguyên phòng (chứa chữ "Nguyên phòng", "Bao phòng" hoặc >= 25 khách)
 * - Nếu chỉ ghi chung "Mây 301" hoặc "Mây 201" với số lượng khách thông thường (vd: 10 khách), hệ thống cho phép nhiều tiệc cùng ngồi vì phòng có 6 bàn con.
 * - Khoảng cách tối thiểu giữa 2 lượt khách cùng bàn: 4 tiếng.
 */
export function checkRoomBookingConflict(
  bookings: Booking[],
  candidateDateTimeStr: string,
  candidateRoom: string | undefined | null,
  currentBookingId?: string
): string | null {
  if (!candidateRoom || candidateRoom === 'Chưa chọn' || candidateRoom === 'Sảnh chung') {
    return null;
  }
  const normCandidate = normalizeRoomName(candidateRoom);
  const targetTime = new Date(candidateDateTimeStr).getTime();
  if (isNaN(targetTime)) return null;

  const [candDate] = candidateDateTimeStr.split('T');
  const candidateIsFullHall = isFullHallBanquet(candidateRoom);

  for (const b of bookings) {
    if (b.id === currentBookingId) continue;
    if (b.status === 'cancelled' || b.receptionStatus === 'clean') continue;

    const [bDate, bTimePart] = (b.dateTime || '').split('T');
    if (bDate !== candDate) continue;

    const bTime = new Date(b.dateTime).getTime();
    if (isNaN(bTime)) continue;

    // Khoảng cách giữa 2 lượt khách tối thiểu 4 tiếng
    const diffHours = Math.abs(bTime - targetTime) / (1000 * 60 * 60);
    if (diffHours >= 4) continue;

    const normBRoom = normalizeRoomName(b.room);
    const bTokens = extractRoomTokens(b.room);
    const bTimeFormatted = bTimePart ? bTimePart.substring(0, 5) : b.dateTime;
    const bIsFullHall = isFullHallBanquet(b);

    // Kịch bản 1: Ứng viên ĐẶT NGUYÊN PHÒNG (Bao trọn đại sảnh)
    if (candidateIsFullHall) {
      const baseMaster = normCandidate.includes('201') ? 'Mây 201' : 'Mây 301';
      const subRooms = getSubRoomsOf(baseMaster);

      // Nếu b cũng đặt nguyên phòng này
      if (bIsFullHall && normBRoom.includes(baseMaster.replace('Mây ', ''))) {
        return `Đại sảnh ${baseMaster} đã được khách "${b.customerName}" đặt nguyên phòng lúc ${bTimeFormatted}!`;
      }

      // Nếu bất kỳ bàn con nào của phòng này đã có khách
      const conflictedSub = subRooms.find(sub => bTokens.some(t => isSameRoom(sub, t)));
      if (conflictedSub) {
        return `Không thể nhận đặt nguyên phòng ${baseMaster} vì ${conflictedSub} đã có khách ("${b.customerName}" lúc ${bTimeFormatted}). Quý khách vui lòng chuyển bàn con này trước khi nhận tiệc nguyên phòng!`;
      }
    }

    // Kịch bản 2: Booking b là ĐẶT NGUYÊN PHÒNG
    if (bIsFullHall) {
      const baseMaster = normBRoom.includes('201') ? 'Mây 201' : 'Mây 301';
      const subRooms = getSubRoomsOf(baseMaster);
      if (subRooms.some(sub => isSameRoom(normCandidate, sub))) {
        return `${normCandidate} không thể nhận khách vì toàn bộ đại sảnh ${baseMaster} đã được khách "${b.customerName}" bao trọn tiệc lớn lúc ${bTimeFormatted}!`;
      }
    }

    // Kịch bản 3: Đặt trùng bàn cụ thể (vd: 301.1 trùng 301.1, hoặc Bàn 4 trùng Bàn 4)
    if (!candidateIsFullHall && !bIsFullHall) {
      const isGenericMaster = (r: string) => r === 'Mây 201' || r === 'Mây 301';
      // Nếu cả hai đều ghi chung là "Mây 301" hoặc "Mây 201" (chưa chỉ định bàn con):
      // Không chặn vì phòng có 6 bàn con (sẽ tự động phân vào 301.1, 301.2...)
      if (isGenericMaster(normCandidate) && isGenericMaster(normBRoom)) {
        continue;
      }
      if (bTokens.some(t => isSameRoom(normCandidate, t))) {
        return `${normCandidate} đã có khách đặt ("${b.customerName}" lúc ${bTimeFormatted})!`;
      }
    }
  }

  return null;
}



