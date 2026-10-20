import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Sparkles, Users, CheckCircle, MapPin, DoorOpen, Clock, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { setFloorStatus, fetchBookings } from "@/app/actions";

import { isBookingArchived, getVietnamNow, parseSpecialRequest, parseDecorRequest, DECOR_PACKAGE_NAMES } from "@/lib/bookingUtils";

function getFloorFromRoom(room?: string): string {
  if (!room || room === 'Chưa chọn') return '';
  if (room.startsWith('Mây 1')) return 'Khu vực Tầng 1';
  if (room.startsWith('Mây 2')) return 'Khu vực Tầng 2';
  if (room.startsWith('Mây 3')) return 'Khu vực Tầng 3';
  if (room.startsWith('Bàn ')) return 'Khu vực Tầng 4 (Sân thượng)';
  return '';
}

export const dynamic = 'force-dynamic';

export default async function FloorPage() {
  const allBookings = await fetchBookings();
  const now = getVietnamNow();
  const pendingBookings = allBookings
    .filter(b => !isBookingArchived(b, now))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  
  let decorBookings = pendingBookings.filter(b => {
    const { occasion, pkg, note } = parseDecorRequest(b.decorRequest);
    return (occasion && occasion !== 'Không có') || pkg !== '' || note !== '';
  });

  const groupedBookings = decorBookings.reduce((acc, b) => {
    const dateStr = format(new Date(b.dateTime), "dd/MM/yyyy");
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(b);
    return acc;
  }, {} as Record<string, typeof decorBookings>);

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
      
      <div className="space-y-8">
        {Object.entries(groupedBookings).map(([dateStr, dayBookings]) => (
          <div key={dateStr} className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 border-b border-purple-200 pb-2 sticky top-0 bg-[#f8efe6]/90 backdrop-blur z-10 pt-2 flex items-center gap-2 shadow-sm rounded-t px-2">
              Ngày {dateStr}
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800">{dayBookings.length} tiệc</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dayBookings.map((b) => {
          const { occasion, pkg, price, note, pkgName } = parseDecorRequest(b.decorRequest);

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

          const cleanSpecialRequest = parseSpecialRequest(b.specialRequest).cleanNotes;

          return (
          <Card key={b.id} className={cardClass}>
            <CardHeader className={headerClass}>
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-lg flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-purple-900 font-bold text-lg">
                      {cleanName}
                    </span>
                    {isSVIP && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider shadow-xs">SVIP</span>}
                    {isVIP && <span className="bg-fuchsia-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-xs">VIP</span>}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs ${
                      b.room && b.room !== 'Chưa chọn'
                        ? 'bg-purple-600 text-white'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      <MapPin className="w-3.5 h-3.5" />
                      {b.room && b.room !== 'Chưa chọn' ? b.room : 'Chưa xếp phòng'}
                    </span>
                    {cleanSpecialRequest && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                        📝 Có dặn dò
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-normal text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-purple-950">
                      <Clock className="w-4 h-4 text-purple-600"/> {format(new Date(b.dateTime), "HH:mm")}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-slate-500"/> {b.guestsCount} khách
                    </span>
                    {b.phone && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500 text-xs">
                          <Phone className="w-3.5 h-3.5 text-slate-400"/> {b.phone}
                        </span>
                      </>
                    )}
                  </div>
                </CardTitle>
                <Badge variant={b.floorStatus === 'done' ? 'secondary' : (b.floorStatus === 'in_progress' ? 'default' : 'outline')} className={b.floorStatus === 'in_progress' ? 'bg-purple-600 text-white' : (b.floorStatus === 'done' ? 'bg-green-100 text-green-700 hover:bg-green-200' : '')}>
                  {b.floorStatus === 'done' ? 'Đã hoàn thành' : (b.floorStatus === 'in_progress' ? 'Đang setup' : 'Chờ xử lý')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Box Thông tin Phòng & Vị trí setup chi tiết */}
              <div className="bg-purple-50/80 border border-purple-200/90 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 text-white p-2.5 rounded-lg shadow-xs shrink-0">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                      Phòng / Không gian Setup
                    </span>
                    <div className="text-base font-bold text-slate-800 flex items-center gap-2 flex-wrap mt-0.5">
                      {b.room && b.room !== 'Chưa chọn' ? (
                        <>
                          <span className="text-purple-950">{b.room}</span>
                          {(() => {
                            const floorInfo = getFloorFromRoom(b.room);
                            return floorInfo ? (
                              <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                                {floorInfo}
                              </span>
                            ) : null;
                          })()}
                        </>
                      ) : (
                        <span className="text-amber-700 font-semibold text-sm">
                          ⚠️ Chưa chọn phòng / bàn (Cần liên hệ Lễ tân/Quản lý)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-200/60 shrink-0">
                  <span className="text-xs text-slate-500 block">Thời gian tiệc</span>
                  <span className="text-sm font-bold text-purple-950">{format(new Date(b.dateTime), "HH:mm - dd/MM/yyyy")}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-1">Yêu cầu Decor:</h4>
                <div className="text-slate-700 bg-white p-3 rounded border border-slate-200 min-h-[60px] space-y-2">
                  <p><strong>Dịp:</strong> {occasion}</p>
                  {note && <p><strong>Ghi chú Decor:</strong> {note}</p>}
                </div>
              </div>

              {pkg && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 mb-1">
                    {pkg === 'custom' ? (
                      `Gói Decor: Decor Yêu Cầu${price ? ` - Giá: ${price}` : ''}`
                    ) : (
                      `Gói Decor: ${pkgName || DECOR_PACKAGE_NAMES[pkg] || `Mây ${pkg}`}`
                    )}
                  </h4>
                  {pkg !== 'custom' ? (
                    <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      <img 
                        src={`/images/decor/decor${pkg}.jpg`} 
                        alt={`Gói Decor ${pkg}`} 
                        className="w-full h-auto object-contain rounded-md"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-sm text-purple-900">
                      ✨ <strong>Decor theo yêu cầu riêng của khách</strong> (Setup theo ghi chú chi tiết bên trên)
                    </div>
                  )}
                </div>
              )}
              
              {cleanSpecialRequest && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Lưu Ý &amp; Dặn Dò Của Khách (Quan Trọng):</span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200 text-xs sm:text-sm font-semibold text-amber-950 whitespace-pre-line leading-relaxed shadow-2xs">
                    {cleanSpecialRequest}
                  </div>
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
            </div>
          </div>
        ))}
        {decorBookings.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
            Không có đơn tiệc nào yêu cầu Decor đang chờ!
          </div>
        )}
      </div>
    </div>
  );
}
