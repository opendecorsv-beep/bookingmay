import { fetchBookings } from "@/app/actions";
import ArchiveClient from "./ArchiveClient";

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const allBookings = await fetchBookings();
  // Lọc toàn bộ các tiệc mà Giám sát đã đánh dấu "Dọn xong (clean)"
  const archivedBookings = allBookings.filter(b => b.receptionStatus === 'clean');

  return <ArchiveClient initialBookings={archivedBookings} />;
}
