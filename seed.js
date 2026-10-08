const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://imypeukyfdqngqfsmrzm.supabase.co', 'sb_publishable_gAjjmPTAnr8OYvwH8urthg_Vkk5b-Js');

const mockBookings = [
  {
    id: "MAY-T10-001",
    customerName: "Ms. Tâm (Châu)",
    phone: "0977815829",
    dateTime: "2026-10-12T18:30:00+07:00",
    guestsCount: 6,
    room: "Chưa chọn",
    menu: JSON.stringify([]),
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
    menu: JSON.stringify([]),
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
    menu: JSON.stringify([]),
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
    menu: JSON.stringify([]),
    specialRequest: "",
    decorRequest: "Sinh nhật",
    status: "confirmed",
    receptionStatus: "pending",
    kitchenStatus: "pending",
    floorStatus: "pending"
  },
  {
    id: "MAY-TODAY-001",
    customerName: "Mr. Tuấn (Test Hôm nay)",
    phone: "0912345678",
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    guestsCount: 10,
    room: "Mây 202",
    menu: JSON.stringify(["Gỏi sứa", "Lẩu cá lăng"]),
    specialRequest: "Giao gấp, test 24h",
    decorRequest: "Không có",
    status: "confirmed",
    receptionStatus: "pending",
    kitchenStatus: "in_progress",
    floorStatus: "pending"
  }
];

async function seed() {
  const { data, error } = await supabase.from('bookings').insert(mockBookings);
  console.log('Seeded!', error);
}

seed();
