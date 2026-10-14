import { fetchReceptionLogs, fetchBookings } from "@/app/actions";
import ReceptionClient from "@/components/ReceptionClient";

export const dynamic = 'force-dynamic';

export default async function ReceptionPage() {
  const [logs, allBookings] = await Promise.all([
    fetchReceptionLogs(),
    fetchBookings()
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <ReceptionClient initialLogs={logs} allBookings={allBookings} />
    </div>
  );
}
