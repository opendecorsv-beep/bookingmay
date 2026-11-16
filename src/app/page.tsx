import { redirect } from "next/navigation";
import { fetchReceptionLogs, fetchBookings, getAuthUserAction } from "@/app/actions";
import ReceptionClient from "@/components/ReceptionClient";

export const dynamic = 'force-dynamic';

export default async function ReceptionPage() {
  const user = await getAuthUserAction();
  if (user?.role === 'staff') {
    redirect('/nv/chat');
  }

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
