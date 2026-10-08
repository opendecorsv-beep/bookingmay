"use client";

import { useState } from "react";
import { Booking } from "@/lib/data";
import { format, isSameDay, differenceInHours } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FLOORS = [
  { name: "Tầng 1", rooms: ["Mây 101", "Mây 102", "Mây 103", "Mây 104", "Mây 105", "Mây 106"] },
  { name: "Tầng 2", rooms: ["Mây 201", "Mây 202", "Mây 203", "Mây 204"] },
  { name: "Tầng 3", rooms: ["Mây 301", "Mây 302", "Mây 303", "Mây 304"] },
  { name: "Tầng 4", rooms: Array.from({length: 25}, (_, i) => `Bàn ${i + 1}`) },
];

export default function FloorPlanClient({ initialBookings }: { initialBookings: Booking[] }) {
  const [selectedDateTime, setSelectedDateTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const activeBookings = initialBookings.filter(b => {
    // Nếu Giám sát đã dọn xong thì trả phòng lại trạng thái Trống
    if (b.receptionStatus === 'clean') return false;
    
    const bTime = new Date(b.dateTime);
    const sTime = new Date(selectedDateTime);
    // Cùng ngày và cách nhau không quá 4 tiếng
    return isSameDay(bTime, sTime) && Math.abs(differenceInHours(bTime, sTime)) <= 4;
  });

  const getRoomBooking = (roomName: string) => {
    return activeBookings.find(b => {
      // Logic so khớp tên phòng tương đối
      const bRoom = b.room.toLowerCase();
      const rName = roomName.toLowerCase();
      return bRoom === rName || bRoom.includes(rName) || rName.includes(bRoom);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 max-w-sm">
              <Label htmlFor="datetime">Chọn thời gian kiểm tra sơ đồ</Label>
              <Input 
                id="datetime" 
                type="datetime-local" 
                value={selectedDateTime} 
                onChange={(e) => setSelectedDateTime(e.target.value)} 
              />
            </div>
            <div className="flex flex-wrap gap-4 pb-2 text-sm">
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div> Trống</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div> Đã đặt</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gradient-to-br from-purple-100 to-fuchsia-200 border border-fuchsia-400 rounded"></div> VIP</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gradient-to-br from-amber-100 to-yellow-300 border border-yellow-500 rounded"></div> SVIP</div>
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
                  const booking = getRoomBooking(room);
                  const isBooked = !!booking;
                  const isVIP = isBooked && booking.customerName.includes('[VIP]');
                  const isSVIP = isBooked && booking.customerName.includes('[SVIP]');
                  
                  // Extract clean name for display
                  let displayName = booking?.customerName || "";
                  if (isVIP) displayName = displayName.replace('[VIP]', '').trim();
                  if (isSVIP) displayName = displayName.replace('[SVIP]', '').trim();

                  let bgClass = 'bg-white border-green-200 text-slate-700 hover:border-green-300';
                  if (isSVIP) {
                    bgClass = 'bg-gradient-to-br from-amber-100 to-yellow-300 border-yellow-500 text-yellow-950 ring-2 ring-yellow-400 shadow-yellow-200 shadow-lg';
                  } else if (isVIP) {
                    bgClass = 'bg-gradient-to-br from-purple-100 to-fuchsia-200 border-fuchsia-400 text-fuchsia-950 ring-1 ring-fuchsia-300 shadow-md';
                  } else if (isBooked) {
                    bgClass = 'bg-red-50 border-red-200 text-red-900';
                  }

                  return (
                    <div 
                      key={room} 
                      className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center text-center min-h-[100px] transition-all ${bgClass}`}
                    >
                      <span className="font-bold">{room}</span>
                      {isBooked && (
                        <div className="mt-2 text-xs flex flex-col items-center gap-1">
                          {isSVIP && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider shadow-sm">SVIP</span>}
                          {isVIP && <span className="bg-fuchsia-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm">VIP</span>}
                          <span className="font-semibold">{displayName}</span>
                          <span className="opacity-80">{booking.guestsCount} khách</span>
                          <span className="opacity-80 font-medium">{format(new Date(booking.dateTime), "HH:mm")}</span>
                        </div>
                      )}
                      {!isBooked && (
                        <span className="mt-2 text-xs text-green-600 font-medium">Trống</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
