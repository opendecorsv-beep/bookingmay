import { Booking, BookingStatus, TaskStatus } from './data';

// Simple in-memory store
// Note: This resets when the serverless function cold starts on Vercel
let globalBookings: Booking[] = [
  {
    id: "1",
    customerName: "Anh Tuấn",
    phone: "0901234567",
    dateTime: new Date(new Date().getTime() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours from now
    guestsCount: 15,
    menu: ["2 Gà nướng bản đôn", "1 Lẩu cá lăng", "2 Salad cá hồi"],
    specialRequest: "Không ăn hành, ăn cay ít",
    decorRequest: "Trang trí bong bóng tone vàng đen, bảng tên 'Happy Birthday Tuấn'",
    status: "confirmed",
    receptionStatus: "done",
    kitchenStatus: "in_progress",
    floorStatus: "pending"
  },
  {
    id: "2",
    customerName: "Chị Lan",
    phone: "0912345678",
    dateTime: new Date(new Date().getTime() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
    guestsCount: 4,
    menu: ["2 Bò bít tết", "2 Súp cua"],
    specialRequest: "",
    decorRequest: "Setup bàn nến lãng mạn",
    status: "confirmed",
    receptionStatus: "done",
    kitchenStatus: "pending",
    floorStatus: "pending"
  },
  {
    id: "3",
    customerName: "Công ty ABC",
    phone: "0923456789",
    dateTime: new Date(new Date().getTime() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    guestsCount: 40,
    menu: ["Set menu VIP 1"],
    specialRequest: "Xuất hóa đơn VAT",
    decorRequest: "Hoa tươi, máy chiếu",
    status: "completed",
    receptionStatus: "done",
    kitchenStatus: "done",
    floorStatus: "done"
  }
];

export function getBookings() {
  return globalBookings;
}

export function addBooking(booking: Omit<Booking, 'id'>) {
  const newBooking = {
    ...booking,
    id: Math.random().toString(36).substring(7)
  };
  globalBookings.push(newBooking);
  return newBooking;
}

export function updateKitchenStatus(id: string, status: TaskStatus) {
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, kitchenStatus: status } : b);
}

export function updateFloorStatus(id: string, status: TaskStatus) {
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, floorStatus: status } : b);
}

export function updateBookingStatus(id: string, status: BookingStatus) {
  globalBookings = globalBookings.map(b => b.id === id ? { ...b, status } : b);
}
