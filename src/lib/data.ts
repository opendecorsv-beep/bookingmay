export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'done';

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
