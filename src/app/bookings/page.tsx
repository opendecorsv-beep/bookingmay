import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchBookings, setBookingStatus } from "@/app/actions";
import { format } from "date-fns";
import { Users, CalendarDays, ClipboardList, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddBookingDialog from "@/components/AddBookingDialog";
import EditBookingDialog from "@/components/EditBookingDialog";
import DeleteBookingButton from "@/components/DeleteBookingButton";
import StatusSelect from "@/components/StatusSelect";

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const bookings = await fetchBookings();
  const sortedBookings = [...bookings].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  
  const groupedBookings = sortedBookings.reduce((acc, b) => {
    const dateStr = format(new Date(b.dateTime), "dd/MM/yyyy");
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(b);
    return acc;
  }, {} as Record<string, typeof sortedBookings>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Danh Sách Đặt Bàn</h1>
        <AddBookingDialog />
      </div>
      
      <div className="space-y-8">
        {Object.entries(groupedBookings).map(([dateStr, dayBookings]) => (
          <div key={dateStr} className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 border-b border-orange-200 pb-2 sticky top-0 bg-[#f8efe6]/90 backdrop-blur z-10 pt-2 flex items-center gap-2 shadow-sm rounded-t px-2">
              <CalendarDays className="w-5 h-5 text-orange-600" />
              Ngày {dateStr}
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800 hover:bg-orange-200">{dayBookings.length} tiệc</Badge>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {dayBookings.map((b) => (
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
                        <div className="flex items-center gap-1 ml-2">
                          <EditBookingDialog booking={b} />
                          <DeleteBookingButton id={b.id} customerName={b.customerName} />
                        </div>
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
                        {(() => {
                           const sourceMatch = (b.specialRequest || "").match(/\[Nguồn:\s*([^\]]+)\]/);
                           if (sourceMatch) {
                             return (
                               <div className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
                                 {sourceMatch[1]}
                               </div>
                             );
                           }
                           return null;
                        })()}
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
                        <p className="text-sm text-slate-600">
                          {(() => {
                            const raw = b.decorRequest || "Không có";
                            if (!raw.includes('|PKG:')) return raw;
                            const parts = raw.split('|');
                            const occ = parts[0] || "Không có";
                            const pkgStr = parts.find(p => p.startsWith('PKG:')) || "";
                            const noteStr = parts.find(p => p.startsWith('NOTE:')) || "";
                            
                            const pkg = pkgStr.replace('PKG:', '');
                            const note = noteStr.replace('NOTE:', '');
                            
                            let res = occ;
                            if (pkg) {
                              const pkgNames: Record<string, string> = {"1": "Bướm Ngũ Sắc", "2": "Bướm Trắng", "3": "Bướm Đỏ", "4": "Nơ Trắng", "5": "Background Nâu", "6": "Nơ Hồng"};
                              res += ` - Gói Mây ${pkg} (${pkgNames[pkg] || ""})`;
                            }
                            if (note) res += ` - Ghi chú: ${note}`;
                            return res;
                          })()}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <h4 className="font-semibold text-sm text-slate-700 mb-1">Tiền cọc:</h4>
                          <p className="text-sm font-semibold text-orange-600">
                            {(() => {
                              const match = (b.specialRequest || "").match(/\[Cọc:\s*([^\]]+)\]/);
                              if (!match) return "Chưa cọc";
                              const val = match[1];
                              const num = parseInt(val.replace(/[^\d]/g, ''));
                              if (!isNaN(num) && num >= 1000) {
                                return num.toLocaleString('vi-VN') + " đ";
                              }
                              return val;
                            })()}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-700 mb-1">Giảm giá:</h4>
                          <p className="text-sm font-semibold text-green-600">
                            {(() => {
                              const match = (b.specialRequest || "").match(/\[Giảm giá:\s*([^\]]+)\]/);
                              if (!match) return "Không có";
                              const val = match[1];
                              const num = parseInt(val.replace(/[^\d]/g, ''));
                              if (!isNaN(num) && num >= 1000) {
                                return num.toLocaleString('vi-VN') + " đ";
                              }
                              return val;
                            })()}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-1">Tổng tiền (Món + Decor - Giảm giá):</h4>
                        <p className="text-sm font-bold text-red-600">
                          {(() => {
                            let total = 0;
                            b.menu.forEach(item => {
                              const m = item.match(/^(\d+)\s*x\s*(.*)\s*-\s*(.*)$/);
                              if (m) {
                                const qty = parseInt(m[1]);
                                const priceText = m[3];
                                const priceMatch = priceText.match(/[\d\.\,]+/);
                                if (priceMatch) {
                                  const price = parseInt(priceMatch[0].replace(/[^\d]/g, ''));
                                  if (!isNaN(price) && price > 0) {
                                    total += qty * price;
                                  }
                                }
                              }
                            });
                            if ((b.decorRequest || "").includes('|PKG:')) {
                               const pkgStr = b.decorRequest.split('|').find(p => p.startsWith('PKG:'));
                               if (pkgStr && pkgStr !== 'PKG:') {
                                 total += 3700000;
                               }
                            }
                            
                            // Subtract discount
                            const discountMatch = (b.specialRequest || "").match(/\[Giảm giá:\s*([^\]]+)\]/);
                            if (discountMatch) {
                              const num = parseInt(discountMatch[1].replace(/[^\d]/g, ''));
                              if (!isNaN(num) && num > 0) {
                                total -= num;
                              }
                            }

                            return total > 0 ? total.toLocaleString('vi-VN') + " đ" : "Chưa tính";
                          })()}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-1">Yêu cầu Riêng (Ghi chú):</h4>
                        <p className="text-sm text-slate-600 italic">
                          {(b.specialRequest || "").replace(/\[Cọc:\s*[^\]]+\]/g, '').replace(/\[Nguồn:\s*[^\]]+\]/g, '').replace(/\[Giảm giá:\s*[^\]]+\]/g, '').trim() || "Không có"}
                        </p>
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
            </div>
          </div>
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
