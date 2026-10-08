import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockBookings } from "@/lib/data";
import { format } from "date-fns";
import { Sparkles, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { setFloorStatus, fetchBookings } from "@/app/actions";

export const dynamic = 'force-dynamic';

export default async function FloorPage() {
  const allBookings = await fetchBookings();
  const pendingBookings = allBookings.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  
  let decorBookings = pendingBookings.filter(b => {
    let occasion = "Không có";
    let pkg = "";
    let note = "";
    const parts = (b.decorRequest || "").split('|');
    occasion = parts[0] || "Không có";
    parts.forEach(p => {
      if (p.startsWith('PKG:')) pkg = p.replace('PKG:', '');
      if (p.startsWith('NOTE:')) note = p.replace('NOTE:', '');
    });
    return occasion !== 'Không có' || pkg !== '' || note !== '';
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 p-3 rounded-full text-purple-600">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bộ phận Sảnh / Decor</h1>
          <p className="text-slate-500">Quản lý không gian, bàn tiệc và trang trí</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {decorBookings.map((b) => {
          let occasion = "Không có";
          let pkg = "";
          let note = "";
          const parts = (b.decorRequest || "").split('|');
          occasion = parts[0] || "Không có";
          parts.forEach(p => {
            if (p.startsWith('PKG:')) pkg = p.replace('PKG:', '');
            if (p.startsWith('NOTE:')) note = p.replace('NOTE:', '');
          });

          const isSVIP = b.customerName.includes('[SVIP]');
          const isVIP = b.customerName.includes('[VIP]');
          const cleanName = b.customerName.replace(/\[S?VIP\] /g, '');
          
          let cardClass = "border-purple-200 ";
          let headerClass = "pb-3 border-b bg-purple-50/50 ";
          
          if (isSVIP) {
            cardClass += 'border-2 border-yellow-500 shadow-lg shadow-yellow-100';
            headerClass += 'bg-yellow-100/50';
          } else if (isVIP) {
            cardClass += 'border-2 border-fuchsia-500 shadow-lg shadow-fuchsia-100';
            headerClass += 'bg-fuchsia-100/50';
          }

          // Also remove deposit from special request here, decor only needs notes
          const cleanSpecialRequest = b.specialRequest ? b.specialRequest.replace(/\[Cọc:\s*[^\]]+\]/g, '').trim() : '';

          return (
          <Card key={b.id} className={cardClass}>
            <CardHeader className={headerClass}>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex flex-col gap-1">
                  <span className="text-purple-900 font-bold flex items-center gap-2">
                    {cleanName}
                    {isSVIP && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider">SVIP</span>}
                    {isVIP && <span className="bg-fuchsia-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">VIP</span>}
                  </span>
                  <span className="text-sm font-normal text-slate-600 flex items-center gap-1">
                    <Users className="w-4 h-4"/> {b.guestsCount} khách | {format(new Date(b.dateTime), "HH:mm - dd/MM")}
                  </span>
                </CardTitle>
                <Badge variant={b.floorStatus === 'done' ? 'secondary' : (b.floorStatus === 'in_progress' ? 'default' : 'outline')} className={b.floorStatus === 'in_progress' ? 'bg-purple-600' : (b.floorStatus === 'done' ? 'bg-green-100 text-green-700 hover:bg-green-200' : '')}>
                  {b.floorStatus === 'done' ? 'Đã hoàn thành' : (b.floorStatus === 'in_progress' ? 'Đang setup' : 'Chờ xử lý')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-1">Yêu cầu Decor:</h4>
                <div className="text-slate-700 bg-white p-3 rounded border border-slate-200 min-h-[60px] space-y-2">
                  <p><strong>Dịp:</strong> {occasion}</p>
                  {note && <p><strong>Ghi chú Decor:</strong> {note}</p>}
                </div>
              </div>

              {pkg && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 mb-1">Gói Decor: Mây {pkg}</h4>
                  <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`/images/decor/decor${pkg}.jpg`} 
                      alt={`Gói Decor ${pkg}`} 
                      className="w-full h-auto object-cover max-h-48"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
              
              {cleanSpecialRequest && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 mb-1">Ghi chú riêng:</h4>
                  <p className="text-slate-600 italic bg-yellow-50 p-2 rounded text-sm border border-yellow-100">
                    {cleanSpecialRequest}
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-2 justify-end border-t">
                {b.floorStatus === 'pending' && (
                  <form action={setFloorStatus.bind(null, b.id, 'in_progress')}>
                    <Button type="submit" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">Bắt đầu Setup</Button>
                  </form>
                )}
                {b.floorStatus !== 'done' && (
                  <form action={setFloorStatus.bind(null, b.id, 'done')}>
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                      <CheckCircle className="w-4 h-4 mr-2"/> Hoàn tất Setup
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        )})}
        {decorBookings.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
            Không có đơn tiệc nào yêu cầu Decor đang chờ!
          </div>
        )}
      </div>
    </div>
  );
}
