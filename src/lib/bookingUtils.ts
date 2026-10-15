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
  
  // Nếu trong ngày hôm nay: kiểm tra xem đã qua hơn 6 tiếng chưa
  if (timeStr) {
    try {
      const entryTime = parseBookingDate(`${dateStr}T${timeStr}`);
      const diffHours = (Date.now() - entryTime.getTime()) / (1000 * 60 * 60);
      return diffHours >= 6;
    } catch {
      return false;
    }
  }
  return false;
}

export function isBookingArchived(b: Booking, _unusedNow?: Date): boolean {
  // 1. Giám sát đã bấm chọn dọn xong (clean)
  if (b.receptionStatus === 'clean') return true;
  // 2. Tự động chuyển vào lưu trữ nếu tiệc đã qua ngày (hôm qua hoặc trước đó)
  if (isPastDay(b.dateTime)) return true;
  // 3. Tự động chuyển vào lưu trữ nếu đã qua thời gian tổ chức tiệc trên 8 tiếng
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
  "7": "Free S4 1 (Miễn phí sảnh 4)",
  "8": "Free S4 2 (Miễn phí sảnh 4)",
  "9": "Gói Hoa Tươi (2.500.000 đ)",
  "custom": "Decor Theo Yêu Cầu Riêng (Tự nhập giá)"
};

export interface ParsedSpecialRequest {
  cleanNotes: string;
  deposit: string | null;
  discount: string | null;
  source: string | null;
}

export function parseSpecialRequest(raw: string = ""): ParsedSpecialRequest {
  let cleanNotes = raw || "";
  const depositMatch = cleanNotes.match(/\[Cọc:\s*([^\]]+)\]/i);
  const discountMatch = cleanNotes.match(/\[Giảm giá:\s*([^\]]+)\]/i);
  const sourceMatch = cleanNotes.match(/\[Nguồn:\s*([^\]]+)\]/i);

  cleanNotes = cleanNotes
    .replace(/\[Cọc:\s*[^\]]+\]/gi, "")
    .replace(/\[Giảm giá:\s*[^\]]+\]/gi, "")
    .replace(/\[Nguồn:\s*[^\]]+\]/gi, "")
    .trim();

  return {
    cleanNotes,
    deposit: depositMatch ? depositMatch[1].trim() : null,
    discount: discountMatch ? discountMatch[1].trim() : null,
    source: sourceMatch ? sourceMatch[1].trim() : null,
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

