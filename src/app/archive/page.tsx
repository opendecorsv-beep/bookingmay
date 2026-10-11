import { fetchBookings } from "@/app/actions";
import { isBookingArchived, getVietnamNow } from "@/lib/bookingUtils";
import ArchiveClient from "./ArchiveClient";

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const allBookings = await fetchBookings();
  const now = getVietnamNow();
  // Lọc toàn bộ các tiệc đã dọn xong (clean) hoặc đã qua thời gian 8 tiếng
  const archivedBookings = allBookings.filter(b => isBookingArchived(b, now));

  return <ArchiveClient initialBookings={archivedBookings} />;
}
