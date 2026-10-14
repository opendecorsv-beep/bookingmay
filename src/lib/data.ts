export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'clean';

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  dateTime: string;
  guestsCount: number;
  room: string;
  menu: string[];
  decorRequest: string;
  specialRequest: string;
  status: BookingStatus;
  
  // Trạng thái của từng bộ phận
  receptionStatus: TaskStatus;
  kitchenStatus: TaskStatus;
  floorStatus: TaskStatus;
}

export type CustomerType = 'booking' | 'walkin';
export type VisitStatus = 'dining' | 'left';
export type FeedbackRating = 'very_satisfied' | 'satisfied' | 'neutral' | 'unsatisfied' | 'none';

export interface ReceptionFeedback {
  rating?: FeedbackRating;
  comment?: string;
  tags?: string[];
  submittedAt?: string;
}

export interface ReceptionEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: CustomerType;
  bookingId?: string;
  customerName: string;
  phone?: string;
  guestsCount: number;
  room?: string;
  status: VisitStatus;
  notes?: string;
  feedback?: ReceptionFeedback;
  createdAt: string;
  updatedAt: string;
}

export const defaultReceptionLogs: ReceptionEntry[] = [];


export const mockBookings: Booking[] = [
  {
    id: 'B001',
    customerName: 'Nguyễn Văn A',
    phone: '0901234567',
    dateTime: '2026-10-07T18:30:00+07:00',
    guestsCount: 4,
    menu: ['Set Menu A', 'Rượu Vang Đỏ'],
    decorRequest: 'Trang trí bàn tiệc lãng mạn, có hoa hồng',
    specialRequest: 'Khách VIP, phục vụ phòng riêng',
    status: 'confirmed',
    receptionStatus: 'done',
    kitchenStatus: 'in_progress',
    floorStatus: 'pending' // Chưa hoàn thành decor
  },
  {
    id: 'B002',
    customerName: 'Trần Thị B',
    phone: '0912345678',
    dateTime: '2026-10-08T19:00:00+07:00',
    guestsCount: 10,
    menu: ['A la carte', 'Bánh sinh nhật'],
    decorRequest: 'Sinh nhật, bong bóng Happy Birthday',
    specialRequest: 'Người nhà dị ứng hải sản',
    status: 'pending',
    receptionStatus: 'pending',
    kitchenStatus: 'pending',
    floorStatus: 'pending'
  },
  {
    id: 'B003',
    customerName: 'Lê Văn C',
    phone: '0987654321',
    dateTime: '2026-10-07T20:00:00+07:00',
    guestsCount: 2,
    menu: ['Set Menu B'],
    decorRequest: 'Không',
    specialRequest: 'Ghi chú cầu hôn',
    status: 'confirmed',
    receptionStatus: 'done',
    kitchenStatus: 'done',
    floorStatus: 'done'
  }
];

export interface SeafoodItem {
  id: string;
  name: string;
  qty: string;
  size: string;
  isUrgent?: boolean; // Tình trạng đẩy hàng (hàng ngợp cần đẩy gấp)
  urgentNote?: string;
}

export interface SeafoodCategory {
  id: string;
  title: string;
  color: string;
  bgHeader: string;
  items: SeafoodItem[];
}

export const defaultSeafoodCategories: SeafoodCategory[] = [
  {
    id: "tom",
    title: "Tôm",
    color: "border-orange-200",
    bgHeader: "bg-orange-50/50",
    items: [
      { id: "tom_1", name: "Hùm Alaska", qty: "8 con", size: "size 2-3kg" },
      { id: "tom_2", name: "Hùm Úc", qty: "10 con", size: "size 1,5- 2kg" },
      { id: "tom_3", name: "Hùm Baby", qty: "47 con", size: "size 0,3-0,5kg" },
      { id: "tom_4", name: "Hùm Bông", qty: "19 con", size: "size 0,8- 1kg" },
      { id: "tom_5", name: "Mũ Ni", qty: "11 con", size: "0,3-0,8kg" },
    ]
  },
  {
    id: "cua",
    title: "Cua",
    color: "border-red-200",
    bgHeader: "bg-red-50/50",
    items: [
      { id: "cua_1", name: "Cua hoàng đế", qty: "11 con", size: "2,5-3kg" },
      { id: "cua_2", name: "Cua gạch", qty: "Liên hệ", size: "" },
      { id: "cua_3", name: "Cua thịt", qty: "Liên hệ", size: "" },
    ]
  },
  {
    id: "ca",
    title: "Cá",
    color: "border-blue-200",
    bgHeader: "bg-blue-50/50",
    items: [
      { id: "ca_1", name: "Mú đỏ", qty: "9 con", size: "1,7 -2kg" },
      { id: "ca_2", name: "Mú đen", qty: "11 con", size: "1,7-2kg" },
      { id: "ca_3", name: "Bơn vàng", qty: "5 con", size: "1,7-2kg" },
      { id: "ca_4", name: "Bơn nâu", qty: "5 con", size: "1,5-1,8kg" },
      { id: "ca_5", name: "Cá mặt quỷ", qty: "6 con", size: "1,7-2,2kg" },
      { id: "ca_6", name: "Cá lăng", qty: "6 con", size: "3-4kg" },
      { id: "ca_7", name: "Cá bò giáp", qty: "6 con", size: "2-2,5kg" },
      { id: "ca_8", name: "Cá tầm", qty: "8 con", size: "2-3kg" },
      { id: "ca_9", name: "Cá chình hoa", qty: "2 con", size: "4-5kg" },
      { id: "ca_10", name: "Cá chình trắng", qty: "21 con", size: "1,2-1,5kg" },
    ]
  },
  {
    id: "oc",
    title: "Ốc & Ngao Sò",
    color: "border-purple-200",
    bgHeader: "bg-purple-50/50",
    items: [
      { id: "oc_1", name: "Nữ hoàng", qty: "5 con", size: "1,6-2kg" },
      { id: "oc_2", name: "Sò dương", qty: "6 con", size: "1kg 4-5 con" },
      { id: "oc_3", name: "Sò bung", qty: "4 con", size: "8 lạng 4 con" },
      { id: "oc_4", name: "Vòi voi canada", qty: "3 con", size: "0,8-1kg" },
      { id: "oc_5", name: "Tu hài", qty: "Liên hệ", size: "" },
      { id: "oc_6", name: "Ốc hương", qty: "Liên hệ", size: "" },
      { id: "oc_7", name: "Bào ngư", qty: "200 con", size: "" },
    ]
  }
];
