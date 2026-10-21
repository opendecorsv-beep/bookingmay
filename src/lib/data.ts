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

export interface PartyMenuItem {
  name: string;
  unit?: string; // ĐĨA, Bát, Con, Phần, KG, Nồi...
  quantity?: number | string; // 1, 0.7...
  note?: string; // Ghi chú
}

export interface PartyMenuSet {
  id: string;
  title: string; // Thực Đơn 1
  paxRange: string; // 8 - 10 Người/ Mâm
  price: number; // 5000000
  priceText: string; // 5.000.000 đ
  description?: string;
  items: PartyMenuItem[];
  createdAt?: string;
  updatedAt?: string;
}

export const defaultPartyMenuSets: PartyMenuSet[] = [
  {
    id: "SET-01",
    title: "Thực Đơn 1",
    paxRange: "8 - 10 Người/ Mâm",
    price: 5000000,
    priceText: "5.000.000 đ",
    description: "Thực đơn tiệc tiêu chuẩn cho 8 - 10 người/ mâm gồm 9 món đặc sắc",
    items: [
      { name: "Gỏi Rau Càng Cua vs Thịt Bò Áp Chảo", unit: "ĐĨA", quantity: 1, note: "" },
      { name: "Súp Măng Tây Cua Bể", unit: "Bát", quantity: 1, note: "" },
      { name: "Gà Ta Hấp Nấm Lá Thơm", unit: "Con", quantity: 1, note: "" },
      { name: "Thăn Bò Striploin Angus Nướng vs Sốt Tiêu Xanh", unit: "Phần", quantity: 1, note: "" },
      { name: "Cá Hồi Áp Chảo vs Sốt Chanh Leo", unit: "KG", quantity: 1, note: "" },
      { name: "Tôm Sú Bỏ Lò Phomai Ăn Kèm Bánh Mì Nướng", unit: "KG", quantity: 0.7, note: "" },
      { name: "Lẩu Bầu Bắp Bò Sườn Non", unit: "Nồi", quantity: 1, note: "" },
      { name: "Bầu Non Luộc Chấm Kho Quẹt", unit: "Đĩa", quantity: 1, note: "" },
      { name: "Hoa Quả Tráng Miệng", unit: "Đĩa", quantity: 1, note: "" }
    ],
    createdAt: "2026-10-16T00:00:00.000Z",
    updatedAt: "2026-10-16T00:00:00.000Z"
  }
];

export const defaultReceptionLogs: ReceptionEntry[] = [];


export const mockBookings: Booking[] = [
  {
    id: 'B001',
    customerName: 'Nguyễn Văn A',
    phone: '0901234567',
    dateTime: '2026-10-07T18:30:00+07:00',
    guestsCount: 4,
    room: 'Mây 101',
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
    room: 'Mây 201',
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
    room: 'Mây 102',
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

export type CommissionCategory = 'product' | 'booking_bill' | 'wine' | 'custom';

export interface CommissionEntry {
  id: string; // e.g. "CMS-20261020-1234"
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  staffName: string; // e.g. "Ngô Nguyễn Khánh Ly"
  category: CommissionCategory;
  productName?: string; // e.g. "Cá bơn", "Vang > 3tr", "Bàn booking T2-T5"
  unitPriceOrReward: number; // VNĐ
  quantity: number; // Số lượng (con, chai, bàn...)
  billAmount?: number; // Tổng bill nếu tính % bill
  billPercent?: number; // 1% hoặc 2%
  totalReward: number; // Tổng tiền thưởng nhận được (VNĐ)
  tableOrRoom?: string; // Bàn / phòng phục vụ (vd: "Mây 102", "Bàn 14")
  note?: string; // Ghi chú thêm
  createdByName: string; // "Giám Sát Huy", "Giám Sát Mai", "Giám Sát Tiến", "Quản Lý Mây"
  createdById: string; // "gshuy", "gsmai", "gstien", "maybmt"
  createdAt: string; // ISO string
}

export interface CommissionProductReward {
  id: string;
  name: string;
  category: 'seafood' | 'meat' | 'wine';
  reward: number; // VNĐ
  unit: string;
}

export const CMS_STANDARD_PRODUCTS: CommissionProductReward[] = [
  { id: 'ca-bon', name: 'Cá bơn', category: 'seafood', reward: 100000, unit: 'con/phần' },
  { id: 'mu-do', name: 'Mú đỏ', category: 'seafood', reward: 100000, unit: 'con/phần' },
  { id: 'mu-ni', name: 'Mú ni', category: 'seafood', reward: 30000, unit: 'con/phần' },
  { id: 'hum-uc', name: 'Hùm Úc', category: 'seafood', reward: 100000, unit: 'con/phần' },
  { id: 'hum-bong', name: 'Hùm bông', category: 'seafood', reward: 50000, unit: 'con/phần' },
  { id: 'alaska', name: 'Alaska', category: 'seafood', reward: 100000, unit: 'con/phần' },
  { id: 'tomahawk-wagyu', name: 'Tomahawk / Wagyu', category: 'meat', reward: 50000, unit: 'phần' },
  { id: 'oc-nu-hoang', name: 'Ốc nữ hoàng', category: 'seafood', reward: 50000, unit: 'con/phần' },
  { id: 'voi-voi', name: 'Vòi voi', category: 'seafood', reward: 50000, unit: 'con/phần' },
  { id: 'cua-hoang-de', name: 'Cua hoàng đế', category: 'seafood', reward: 100000, unit: 'con/phần' },
];

export const CMS_WINE_PRODUCTS: CommissionProductReward[] = [
  { id: 'wine-over-3m', name: 'Rượu Vang > 3.000.000 đ/chai', category: 'wine', reward: 150000, unit: 'chai' },
  { id: 'wine-under-3m', name: 'Rượu Vang ≤ 3.000.000 đ/chai', category: 'wine', reward: 100000, unit: 'chai' },
];

export interface RestaurantStaff {
  stt: number;
  name: string;
  phone: string;
  role: string;
}

export const RESTAURANT_STAFF_LIST: RestaurantStaff[] = [
  { stt: 1, name: "Lê Thị Thanh Thuý", phone: "0338144180", role: "Phục vụ" },
  { stt: 2, name: "Lê Thị Thuỳ Trâm", phone: "0822240969", role: "Phục vụ" },
  { stt: 3, name: "Lương Huyền Linh", phone: "0359517075", role: "Phục vụ" },
  { stt: 4, name: "Nguyễn Thị Thanh Mai", phone: "0933444225", role: "Giám sát" },
  { stt: 5, name: "Ngô Nguyễn Khánh Ly", phone: "0835198971", role: "Phục vụ" },
  { stt: 6, name: "Ngô Nguyễn Thúy Vy", phone: "0328633427", role: "Captain" },
  { stt: 7, name: "Phạm Thị Quỳnh Như", phone: "0338217057", role: "Phục vụ" },
  { stt: 8, name: "Phạm Trần Mỹ Tâm", phone: "0947548919", role: "Thu ngân" },
  { stt: 9, name: "Trương Ánh Tuyết", phone: "0329960862", role: "Phục vụ" },
  { stt: 10, name: "Trần Diệu Xoan", phone: "0943439248", role: "Thu ngân" },
  { stt: 11, name: "Trần Thị Bích Loan", phone: "0813505008", role: "Phục vụ" },
  { stt: 12, name: "Trần Thị Phương Linh", phone: "0347654452", role: "Phục vụ" },
  { stt: 15, name: "Trần Thị Thùy Linh", phone: "0932497747", role: "Nhân viên bếp" },
  { stt: 18, name: "Bùi Thị Hồng Thúy", phone: "0398409429", role: "Lễ tân" },
  { stt: 20, name: "Vũ Thị Lâm Nhi", phone: "0964650510", role: "Lễ tân" },
  { stt: 21, name: "Võ Thị Ánh Hồng", phone: "0898372482", role: "Phục vụ" },
  { stt: 22, name: "Nguyễn Thị Kim Trúc", phone: "0813432794", role: "Phục vụ" },
  { stt: 25, name: "Đào Thị Ngọc Huyền", phone: "0965367186", role: "Phục vụ" },
  { stt: 26, name: "Phạm Thị Kim Yến", phone: "0399509187", role: "Phục vụ" },
  { stt: 31, name: "Đoàn Thị Nhật Ánh", phone: "0965801826", role: "Nhân viên" },
  { stt: 32, name: "Nguyễn Thị Ngọc Hà", phone: "0877560735", role: "Phục vụ" },
  { stt: 33, name: "Vũ Thị Tuyết Mai", phone: "0366889818", role: "Phục vụ" },
  { stt: 34, name: "Lê Thị Như Quỳnh", phone: "0949903324", role: "Lễ tân" },
  { stt: 35, name: "Nguyễn Thị Là", phone: "0352200584", role: "Phục vụ" },
  { stt: 36, name: "Đào Thị Nga", phone: "0965501710", role: "Phục vụ" },
  { stt: 38, name: "Nguyễn Thị Ngọc Bích", phone: "0795888186", role: "Phục vụ" },
  { stt: 40, name: "Nguyễn Thị Ngọc Cúc", phone: "0946613083", role: "Phục vụ" },
  { stt: 41, name: "Bùi Thị Thanh Tuyền", phone: "0823648314", role: "Phục vụ" },
  { stt: 42, name: "Lê Thị Thùy Trang", phone: "0926688188", role: "CSKH" },
  { stt: 43, name: "Lê Nguyễn Anh Huy", phone: "", role: "Giám sát" },
  { stt: 44, name: "Đồng Văn Tiến", phone: "", role: "Giám sát" },
];

export const defaultStaffCommissions: CommissionEntry[] = [];

export type UserRole = 'admin' | 'supervisor' | 'staff';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

export const KNOWN_ACCOUNTS: Record<string, { pass: string; name: string; role: UserRole }> = {
  maybmt: { pass: '1122334455', name: 'Quản Lý Mây', role: 'admin' },
  gshuy: { pass: 'huy135', name: 'Giám Sát Huy (Lê Nguyễn Anh Huy)', role: 'supervisor' },
  gsmai: { pass: 'mai123', name: 'Giám Sát Mai (Nguyễn Thị Thanh Mai)', role: 'supervisor' },
  gstien: { pass: 'tien246', name: 'Giám Sát Tiến (Đồng Văn Tiến)', role: 'supervisor' },
  nhanvien: { pass: 'may2026', name: 'Nhân Viên Mây', role: 'staff' },
};

