"use client";

import { useState } from "react";
import { Booking } from "@/lib/data";
import { format, isSameDay, differenceInHours } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const FLOORS = [
  { name: "Tầng 1", rooms: ["Mây 101", "Mây 102", "Mây 103", "Mây 104", "Mây 105", "Mây 106"] },
  { name: "Tầng 2", rooms: ["Mây 201", "Mây 202", "Mây 203", "Mây 204"] },
  { name: "Tầng 3", rooms: ["Mây 301", "Mây 302", "Mây 303", "Mây 304"] },
  { name: "Tầng 4", rooms: Array.from({length: 25}, (_, i) => `Bàn ${i + 1}`) },
];

export default function FloorPlanClient({ initialBookings }: { initialBookings: Booking[] }) {
  const [selectedDateTime, setSelectedDateTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const activeBookings = initialBookings.filter(b => {
    // Nếu Giám sát đã dọn xong thì trả phòng lại trạng thái Trống
    if (b.receptionStatus === 'clean') return false;
    
    const bTime = new Date(b.dateTime);
    const sTime = new Date(selectedDateTime);
    // Hiển thị TẤT CẢ các tiệc trong cùng ngày (chưa được Clean)
    return isSameDay(bTime, sTime);
  });

  const getRoomBookings = (roomName: string) => {
    return activeBookings.filter(b => {
      // Logic so khớp tên phòng tương đối
      const bRoom = (b.room || "").toLowerCase().trim();
      const rName = roomName.toLowerCase().trim();
      return bRoom === rName;
    }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
            <div className="space-y-2 w-full md:flex-1 md:max-w-sm">
              <Label htmlFor="datetime">Chọn thời gian kiểm tra sơ đồ</Label>
              <Input 
                id="datetime" 
                type="datetime-local" 
                value={selectedDateTime} 
                onChange={(e) => setSelectedDateTime(e.target.value)} 
                className="w-full"
              />
            </div>
            <div className="flex flex-wrap gap-3 md:pb-2 text-sm justify-start md:justify-end w-full md:w-auto mt-1 md:mt-0">
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-green-100 border border-green-200 rounded shrink-0"></div> <span className="whitespace-nowrap">Trống</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-red-100 border border-red-200 rounded shrink-0"></div> <span className="whitespace-nowrap">Đã đặt</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-gradient-to-br from-purple-100 to-fuchsia-200 border border-fuchsia-400 rounded shrink-0"></div> <span className="whitespace-nowrap">VIP</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-gradient-to-br from-amber-100 to-yellow-300 border border-yellow-500 rounded shrink-0"></div> <span className="whitespace-nowrap">SVIP</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {FLOORS.map(floor => (
          <Card key={floor.name} className="overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-3">
              <CardTitle className="text-lg">{floor.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-[#f8efe6]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {floor.rooms.map(room => {
                  const roomBookings = getRoomBookings(room);
                  const isBooked = roomBookings.length > 0;
                  
                  // Xác định background dựa trên booking ưu tiên cao nhất trong phòng
                  let bgClass = 'bg-white border-green-200 text-slate-700 hover:border-green-300';
                  if (isBooked) {
                    const hasSVIP = roomBookings.some(b => b.customerName.includes('[SVIP]'));
                    const hasVIP = roomBookings.some(b => b.customerName.includes('[VIP]'));
                    
                    if (hasSVIP) {
                      bgClass = 'bg-gradient-to-br from-amber-100 to-yellow-300 border-yellow-500 text-yellow-950 ring-2 ring-yellow-400 shadow-yellow-200 shadow-lg';
                    } else if (hasVIP) {
                      bgClass = 'bg-gradient-to-br from-purple-100 to-fuchsia-200 border-fuchsia-400 text-fuchsia-950 ring-1 ring-fuchsia-300 shadow-md';
                    } else {
                      bgClass = 'bg-red-50 border-red-200 text-red-900';
                    }
                  }

                  return (
                    <div 
                      key={room} 
                      className={`p-4 rounded-lg border-2 flex flex-col items-center justify-start text-center min-h-[100px] transition-all ${bgClass}`}
                    >
                      <span className="font-bold mb-1">{room}</span>
                      
                      {isBooked ? (
                        <div className="flex flex-col gap-3 w-full">
                          {roomBookings.map(booking => {
                            const isVIP = booking.customerName.includes('[VIP]');
                            const isSVIP = booking.customerName.includes('[SVIP]');
                            let displayName = booking.customerName;
                            if (isVIP) displayName = displayName.replace('[VIP]', '').trim();
                            if (isSVIP) displayName = displayName.replace('[SVIP]', '').trim();

                            return (
                              <div 
                                key={booking.id} 
                                onClick={() => setSelectedBooking(booking)}
                                className="mt-1 text-xs flex flex-col items-center gap-1 border-t border-black/10 pt-2 first:border-0 first:pt-0 cursor-pointer hover:bg-black/5 w-full rounded p-1 transition-colors"
                              >
                                <div className="flex gap-1">
                                  {isSVIP && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider shadow-sm leading-none">SVIP</span>}
                                  {isVIP && <span className="bg-fuchsia-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm leading-none">VIP</span>}
                                </div>
                                <span className="font-semibold text-[13px]">{displayName}</span>
                                <div className="flex items-center gap-2 opacity-80">
                                  <span>{booking.guestsCount} khách</span>
                                  <span className="font-bold">• {format(new Date(booking.dateTime), "HH:mm")}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="mt-auto mb-auto text-xs text-green-600 font-medium">Trống</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chi tiết tiệc</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-500 mb-1">Khách hàng</h4>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-lg">{selectedBooking.customerName.replace(/\[(VIP|SVIP)\]/g, '').trim()}</span>
                  {selectedBooking.customerName.includes('[SVIP]') && <Badge className="bg-yellow-500 hover:bg-yellow-600">SVIP</Badge>}
                  {selectedBooking.customerName.includes('[VIP]') && !selectedBooking.customerName.includes('[SVIP]') && <Badge className="bg-fuchsia-600 hover:bg-fuchsia-700">VIP</Badge>}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  SĐT: {selectedBooking.customerPhone}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-500">Phòng / Bàn</h4>
                  <p className="font-medium">{selectedBooking.room}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500">Thời gian</h4>
                  <p className="font-medium">{format(new Date(selectedBooking.dateTime), "HH:mm - dd/MM/yyyy")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500">Số lượng</h4>
                  <p className="font-medium">{selectedBooking.guestsCount} khách</p>
                </div>
              </div>

              {selectedBooking.menu && selectedBooking.menu.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">Thực đơn đã gọi</h4>
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-100 max-h-40 overflow-y-auto space-y-2">
                    {selectedBooking.menu.map((item, idx) => (
                      <div key={idx} className="text-sm text-slate-700 pb-2 border-b border-slate-200 last:border-0 last:pb-0">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBooking.decorRequest && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 mb-1">Gói Decor</h4>
                  <p className="text-sm bg-purple-50 text-purple-800 p-2 rounded border border-purple-100">
                    {(() => {
                      const req = selectedBooking.decorRequest;
                      let parts = req.split('|');
                      let occ = parts[0] || "";
                      let pkg = "";
                      let note = "";
                      parts.forEach(p => {
                        if (p.startsWith('PKG:')) pkg = p.replace('PKG:', '');
                        if (p.startsWith('NOTE:')) note = p.replace('NOTE:', '');
                      });
                      
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
              )}

              {selectedBooking.specialRequest && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 mb-1">Yêu cầu khác</h4>
                  <p className="text-sm text-slate-700 italic bg-amber-50 p-2 rounded border border-amber-100">
                    {selectedBooking.specialRequest.replace(/\[Cọc:\s*[^\]]+\]/g, '').replace(/\[Nguồn:\s*[^\]]+\]/g, '').replace(/\[Giảm giá:\s*[^\]]+\]/g, '').trim() || "Không có"}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
