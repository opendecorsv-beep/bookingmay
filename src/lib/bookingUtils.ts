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
export function isBookingArchived(b: Booking, _unusedNow?: Date): boolean {
  // 1. Giám sát đã bấm chọn dọn xong (clean)
  if (b.receptionStatus === 'clean') return true;
  // 2. Tự động chuyển vào lưu trữ nếu tiệc đã qua ngày (hôm qua hoặc trước đó)
  if (isPastDay(b.dateTime)) return true;
  // 3. Tự động chuyển vào lưu trữ nếu đã qua thời gian tổ chức tiệc trên 8 tiếng
  return isPast8Hours(b.dateTime);
}
