import { fetchReceptionLogs, fetchBookings } from "@/app/actions";
import ReceptionClient from "@/components/ReceptionClient";

export const dynamic = 'force-dynamic';

export default async function ReceptionPage() {
  const [logs, allBookings] = await Promise.all([
    fetchReceptionLogs(),
    fetchBookings()
  ]);

  // Filter active/today bookings to easily assist receptionists auto-populating
  const todayBookings = allBookings.filter(b => {
    return b.status !== 'cancelled' && b.receptionStatus !== 'clean';
  });

  return (
    <div className="max-w-6xl mx-auto">
      <ReceptionClient initialLogs={logs} todayBookings={todayBookings} />
    </div>
  );
}
