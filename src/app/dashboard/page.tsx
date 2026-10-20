import { fetchBookings } from "@/app/actions";
import { getReceptionLogs } from "@/lib/store";
import DashboardClient from "./DashboardClient";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [bookings, receptionLogs] = await Promise.all([
    fetchBookings(),
    getReceptionLogs(),
  ]);

  return <DashboardClient initialBookings={bookings} initialReceptionLogs={receptionLogs} />;
}
