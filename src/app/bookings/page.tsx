import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchBookings, setBookingStatus } from "@/app/actions";
import { format } from "date-fns";
import { Users, CalendarDays, ClipboardList, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddBookingDialog from "@/components/AddBookingDialog";
import StatusSelect from "@/components/StatusSelect";

export default async function BookingsPage() {
  const bookings = await fetchBookings();
  const sortedBookings = [...bookings].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Danh Sách Đặt Bàn</h1>
        <AddBookingDialog />
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {sortedBookings.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                        {b.customerName.replace(/\[S?VIP\] /g, '')}
                        {b.customerName.includes('[SVIP]') && <span className="bg-yellow-500 text-white text-[12px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">SVIP</span>}
                        {b.customerName.includes('[VIP]') && <span className="bg-fuchsia-600 text-white text-[12px] px-2 py-0.5 rounded font-bold shadow-sm">VIP</span>}
                        - {b.phone}
                        <Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'} className={b.status === 'confirmed' ? 'bg-green-600 ml-auto' : 'ml-auto'}>
                          {b.status === 'confirmed' ? 'Đã chốt' : 'Đang chờ'}
                        </Badge>
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4"/> 
                          {format(new Date(b.dateTime), "HH:mm - dd/MM/yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4"/> 
                          {b.guestsCount} khách
                        </div>
                      </div>
                    </div>
                    {b.status === 'pending' && (
                      <form action={setBookingStatus.bind(null, b.id, 'confirmed')}>
                        <Button type="submit" variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                          Xác nhận Tiệc
                        </Button>
                      </form>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-700 mb-1 flex items-center gap-1">
                        <ClipboardList className="w-4 h-4"/> Menu Đã Đặt:
                      </h4>
                      <ul className="list-disc list-inside text-sm text-slate-600 ml-1">
                        {b.menu.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-1">Yêu cầu Decor:</h4>
                        <p className="text-sm text-slate-600">{b.decorRequest || "Không có"}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-1">Yêu cầu Riêng (Ghi chú):</h4>
                        <p className="text-sm text-slate-600 italic">{b.specialRequest || "Không có"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-64 space-y-3 border-l pl-0 md:pl-6 pt-4 md:pt-0">
                  <h4 className="font-semibold text-sm text-slate-700">Trạng thái công việc</h4>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Giám sát:</span>
                    <StatusSelect id={b.id} role="reception" currentStatus={b.receptionStatus} />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Bếp:</span>
                    <StatusSelect id={b.id} role="kitchen" currentStatus={b.kitchenStatus} />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Sảnh / Decor:</span>
                    <StatusSelect id={b.id} role="floor" currentStatus={b.floorStatus} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sortedBookings.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
            Chưa có dữ liệu đặt tiệc nào.
          </div>
        )}
      </div>
    </div>
  );
}
