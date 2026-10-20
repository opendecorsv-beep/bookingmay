import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, ChefHat, CheckSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { setKitchenStatus, fetchBookings } from "@/app/actions";

import { isBookingArchived, getVietnamNow, parseSpecialRequest } from "@/lib/bookingUtils";

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
  const allBookings = await fetchBookings();
  const now = getVietnamNow();
  const pendingBookings = allBookings
    .filter(b => !isBookingArchived(b, now))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const groupedBookings = pendingBookings.reduce((acc, b) => {
    const dateStr = format(new Date(b.dateTime), "dd/MM/yyyy");
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(b);
    return acc;
  }, {} as Record<string, typeof pendingBookings>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-orange-100 p-3 rounded-full text-orange-600">
          <ChefHat className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bộ phận Bếp</h1>
          <p className="text-slate-500">Quản lý món ăn cần chuẩn bị</p>
        </div>
      </div>
      
      <div className="space-y-8">
        {Object.entries(groupedBookings).map(([dateStr, dayBookings]) => (
          <div key={dateStr} className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 border-b border-orange-200 pb-2 sticky top-0 bg-[#f8efe6]/90 backdrop-blur z-10 pt-2 flex items-center gap-2 shadow-sm rounded-t px-2">
              Ngày {dateStr}
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">{dayBookings.length} tiệc</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dayBookings.map((b) => {
          const isSVIP = b.customerName.includes('[SVIP]');
          const isVIP = b.customerName.includes('[VIP]');
          const cleanName = b.customerName.replace(/\[S?VIP\] /g, '');
          
          let cardClass = b.kitchenStatus === 'in_progress' ? 'border-orange-300 shadow-md ' : 'border-slate-200 ';
          let headerClass = "pb-3 border-b ";
          
          if (isSVIP) {
            cardClass += 'border-2 border-yellow-500 shadow-lg shadow-yellow-100';
            headerClass += 'bg-yellow-50/50';
          } else if (isVIP) {
            cardClass += 'border-2 border-fuchsia-500 shadow-lg shadow-fuchsia-100';
            headerClass += 'bg-fuchsia-50/50';
          }

          const cleanSpecialRequest = parseSpecialRequest(b.specialRequest).cleanNotes;

          return (
          <Card key={b.id} className={cardClass}>
            <CardHeader className={headerClass}>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex flex-col gap-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    {cleanName} - {b.guestsCount} khách
                    {b.room && b.room !== 'Chưa chọn' && (
                      <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded border border-orange-200">
                        {b.room}
                      </span>
                    )}
                    {isSVIP && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider">SVIP</span>}
                    {isVIP && <span className="bg-fuchsia-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">VIP</span>}
                    {cleanSpecialRequest && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                        📝 Có dặn dò
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-normal text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4"/> {format(new Date(b.dateTime), "HH:mm - dd/MM")}
                  </span>
                </CardTitle>
                <Badge variant={b.kitchenStatus === 'done' ? 'secondary' : (b.kitchenStatus === 'in_progress' ? 'default' : 'outline')} className={b.kitchenStatus === 'in_progress' ? 'bg-orange-500' : (b.kitchenStatus === 'done' ? 'bg-green-100 text-green-700 hover:bg-green-200' : '')}>
                  {b.kitchenStatus === 'done' ? 'Đã nấu xong' : (b.kitchenStatus === 'in_progress' ? 'Đang nấu' : 'Chờ làm')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-2">Danh sách món (Menu):</h4>
                <ul className="space-y-2">
                  {b.menu.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              {cleanSpecialRequest && (
                <div className="bg-red-50 border-2 border-red-300 text-red-950 p-3.5 rounded-xl text-sm shadow-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-red-800 uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Lưu ý Bếp (Dặn Dò Quan Trọng):</span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-lg border border-red-200 font-semibold whitespace-pre-line leading-relaxed shadow-2xs">
                    {cleanSpecialRequest}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                {b.kitchenStatus === 'pending' && (
                  <form action={setKitchenStatus.bind(null, b.id, 'in_progress')} className="w-full">
                    <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">Bắt đầu nấu</Button>
                  </form>
                )}
                {b.kitchenStatus !== 'done' && b.kitchenStatus === 'in_progress' && (
                  <form action={setKitchenStatus.bind(null, b.id, 'done')} className="w-full">
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                      <CheckSquare className="w-4 h-4 mr-2"/> Báo Xong
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        )})}
            </div>
          </div>
        ))}
        {pendingBookings.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
            Không có đơn tiệc nào đang chờ!
          </div>
        )}
      </div>
    </div>
  );
}
