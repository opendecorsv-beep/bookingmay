import { fetchBookings } from "@/app/actions";
import FloorPlanClient from "./FloorPlanClient";

export default async function FloorPlanPage() {
  const allBookings = await fetchBookings();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Sơ đồ phòng / bàn</h1>
        <p className="text-slate-500">Xem tình trạng trống và đặt phòng theo thời gian</p>
      </div>
      <FloorPlanClient initialBookings={allBookings} />
    </div>
  );
}
