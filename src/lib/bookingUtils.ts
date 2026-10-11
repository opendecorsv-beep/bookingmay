import { Booking } from './data';

export function getVietnamNow(): Date {
  const utcNow = new Date();
  return new Date(utcNow.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
}

export function parseBookingDate(dtStr: string): Date {
  if (!dtStr) return new Date();
  if (dtStr.includes('+') || dtStr.endsWith('Z')) {
    const d = new Date(dtStr);
    return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  }
  return new Date(dtStr);
}

export function isPast8Hours(dateTimeStr: string, now: Date = getVietnamNow()): boolean {
  try {
    const bookingDate = parseBookingDate(dateTimeStr);
    const diffHours = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60);
    return diffHours >= 8;
  } catch (e) {
    return false;
  }
}

export function isBookingArchived(b: Booking, now: Date = getVietnamNow()): boolean {
  // 1. Giám sát đã bấm chọn dọn xong (clean)
  if (b.receptionStatus === 'clean') return true;
  // 2. Tự động chuyển vào lưu trữ nếu đã qua thời gian tổ chức tiệc trên 8 tiếng
  return isPast8Hours(b.dateTime, now);
}
