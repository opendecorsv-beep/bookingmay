import { fetchBookings, fetchReceptionLogs } from "@/app/actions";
import FloorPlanClient from "./FloorPlanClient";

export const dynamic = 'force-dynamic';

export default async function FloorPlanPage() {
  const [allBookings, receptionLogs] = await Promise.all([
    fetchBookings(),
    fetchReceptionLogs()
  ]);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Sơ đồ phòng / bàn</h1>
        <p className="text-slate-500">Xem tình trạng trống và đặt phòng theo thời gian thực</p>
      </div>
      <FloorPlanClient initialBookings={allBookings} initialReceptionLogs={receptionLogs} />
    </div>
  );
}
