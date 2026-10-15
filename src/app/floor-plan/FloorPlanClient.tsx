"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Booking, ReceptionEntry } from "@/lib/data";
import { format, isSameDay } from "date-fns";
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
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  Home,
  Star,
  CheckCircle2,
  Calendar,
  TrendingUp,
  MessageSquare,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { isBookingArchived, isVisitExpired, getVietnamTodayString } from "@/lib/bookingUtils";

const FLOORS = [
  { name: "Tầng 1", rooms: ["Mây 101", "Mây 102", "Mây 103", "Mây 104", "Mây 105", "Mây 106"] },
  { name: "Tầng 2", rooms: ["Mây 201", "Mây 202", "Mây 203", "Mây 204"] },
  { name: "Tầng 3", rooms: ["Mây 301", "Mây 302", "Mây 303", "Mây 304"] },
  { name: "Tầng 4", rooms: Array.from({ length: 25 }, (_, i) => `Bàn ${i + 1}`) },
];

interface FloorPlanClientProps {
  initialBookings: Booking[];
  initialReceptionLogs?: ReceptionEntry[];
}

export default function FloorPlanClient({
  initialBookings,
  initialReceptionLogs = [],
}: FloorPlanClientProps) {
  const [selectedDateTime, setSelectedDateTime] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );

  // Selected item to view details
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<{
    roomName: string;
    booking?: Booking;
    reception?: ReceptionEntry;
  } | null>(null);

  const todayStr = useMemo(() => getVietnamTodayString(), []);

  const selectedDate = useMemo(
    () => selectedDateTime.split("T")[0] || todayStr,
    [selectedDateTime, todayStr]
  );

  const isSelectedToday = selectedDate === todayStr;

  // Reception logs for the selected date
  const dayReceptionLogs = useMemo(() => {
    return initialReceptionLogs.filter((log) => log.date === selectedDate);
  }, [initialReceptionLogs, selectedDate]);

  // Active bookings for the selected date
  const activeBookings = useMemo(() => {
    return initialBookings.filter((b) => {
      if (isBookingArchived(b)) return false;
      const bDate = b.dateTime.split("T")[0];
      return bDate === selectedDate;
    });
  }, [initialBookings, selectedDate]);

  // Combined Restaurant Statistics (Lễ Tân + Sơ Đồ Bàn Thống Nhất)
  const unifiedStats = useMemo(() => {
    // 1. Guests currently dining in restaurant - ONLY for TODAY and NOT expired
    const diningLogs = isSelectedToday
      ? dayReceptionLogs.filter((l) => l.status === "dining" && !isVisitExpired(l.date, l.time))
      : [];
    const diningGuests = diningLogs.reduce(
      (sum, l) => sum + (l.guestsCount || 0),
      0
    );
    const diningTables = diningLogs.length;

    // 2. Guests who have departed:
    // If today: all with status === 'left' or expired
    // If past day: all logs on that day have completed/departed
    const leftLogs = isSelectedToday
      ? dayReceptionLogs.filter((l) => l.status === "left" || isVisitExpired(l.date, l.time))
      : dayReceptionLogs;
    const leftGuests = leftLogs.reduce(
      (sum, l) => sum + (l.guestsCount || 0),
      0
    );
    const leftTables = leftLogs.length;

    // 3. Bookings for today not checked-in yet
    const checkedInBookingIds = new Set(
      dayReceptionLogs.map((l) => l.bookingId).filter(Boolean)
    );
    const pendingBookings = isSelectedToday
      ? activeBookings.filter((b) => !checkedInBookingIds.has(b.id))
      : [];
    const pendingGuests = pendingBookings.reduce(
      (sum, b) => sum + (b.guestsCount || 0),
      0
    );

    // 4. Totals for the day
    const notCheckedInCount = activeBookings.filter((b) => !checkedInBookingIds.has(b.id)).length;
    const totalDayGuests = diningGuests + leftGuests + (isSelectedToday ? pendingGuests : 0);
    const totalDayTables = diningTables + leftTables + (isSelectedToday ? pendingBookings.length : 0);

    const walkinCount = dayReceptionLogs.filter((l) => l.type === "walkin").length;
    const bookingCount = dayReceptionLogs.filter((l) => l.type === "booking").length + (isSelectedToday ? pendingBookings.length : notCheckedInCount);

    return {
      diningGuests,
      diningTables,
      leftGuests,
      leftTables,
      pendingGuests,
      pendingTables: pendingBookings.length,
      totalDayGuests,
      totalDayTables,
      walkinCount,
      bookingCount,
    };
  }, [dayReceptionLogs, activeBookings, isSelectedToday]);

  // Helper to find bookings for a room
  const getRoomBookings = (roomName: string) => {
    return activeBookings
      .filter((b) => {
        const bRoom = (b.room || "").toLowerCase().trim();
        const rName = roomName.toLowerCase().trim();
        return bRoom === rName;
      })
      .sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );
  };

  // Helper to find reception entry for a room
  const getRoomReception = (roomName: string) => {
    return dayReceptionLogs.find((l) => {
      const lRoom = (l.room || "").toLowerCase().trim();
      const rName = roomName.toLowerCase().trim();
      return lRoom === rName;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Unified Dashboard Banner (Lễ Tân & Sơ Đồ Bàn Thống Nhất) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  Thống Kê Khách Toàn Nhà Hàng
                </h2>
                <Badge className="bg-orange-600 text-white font-bold text-[10px]">
                  Realtime
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Ngày {format(new Date(selectedDate), "dd/MM/yyyy")} • Đồng bộ trực tiếp với Lễ Tân & Đặt Bàn
              </p>
            </div>
          </div>

          <Link href="/">
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9"
            >
              Xem Lễ Tân Đón Khách
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        {/* 3 Unified Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5">
          {/* Metric 1: Khách đang có mặt tại quán */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-emerald-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Đang Có Mặt Tại Quán
              </span>
              <span className="text-[11px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full">
                {unifiedStats.diningTables} bàn đang dùng
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {unifiedStats.diningGuests}
              </span>
              <span className="text-xs text-slate-300 font-medium">khách</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Lễ tân đã đón &amp; đang ngồi tại bàn
            </div>
          </div>

          {/* Metric 2: Tổng khách trong ngày */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Tổng Khách Trong Ngày
              </span>
              <span className="text-[11px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full">
                {unifiedStats.totalDayTables} lượt bàn
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {unifiedStats.totalDayGuests}
              </span>
              <span className="text-xs text-slate-300 font-medium">khách</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-2">
              <span>📅 {unifiedStats.bookingCount} Booking</span>
              <span>•</span>
              <span>🚶 {unifiedStats.walkinCount} Vãng lai</span>
            </div>
          </div>

          {/* Metric 3: Khách đã ra về */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Khách Đã Ra Về
              </span>
              <span className="text-[11px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full">
                {unifiedStats.leftTables} bàn đã về
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-300">
                {unifiedStats.leftGuests}
              </span>
              <span className="text-xs text-slate-400 font-medium">khách</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Đã hoàn tất tiệc &amp; ghi nhận cảm nhận
            </div>
          </div>
        </div>
      </div>

      {/* 2. Time Filter & Legend Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
            <div className="space-y-2 w-full md:flex-1 md:max-w-sm">
              <Label htmlFor="datetime" className="font-bold text-slate-700 text-xs sm:text-sm">
                Chọn thời gian kiểm tra sơ đồ
              </Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={selectedDateTime}
                onChange={(e) => setSelectedDateTime(e.target.value)}
                className="w-full text-xs sm:text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2.5 sm:gap-3 md:pb-2 text-xs sm:text-sm justify-start md:justify-end w-full md:w-auto mt-1 md:mt-0">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-emerald-500 border border-emerald-600 rounded shrink-0"></div>
                <span className="whitespace-nowrap font-medium text-emerald-800">🟢 Đang có khách</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-red-100 border border-red-200 rounded shrink-0"></div>
                <span className="whitespace-nowrap">Đã đặt trước</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-gradient-to-br from-purple-100 to-fuchsia-200 border border-fuchsia-400 rounded shrink-0"></div>
                <span className="whitespace-nowrap">VIP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-gradient-to-br from-amber-100 to-yellow-300 border border-yellow-500 rounded shrink-0"></div>
                <span className="whitespace-nowrap">SVIP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-green-100 border border-green-200 rounded shrink-0"></div>
                <span className="whitespace-nowrap">Trống</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Floors and Rooms Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {FLOORS.map((floor) => (
          <Card key={floor.name} className="overflow-hidden border-slate-200">
            <CardHeader className="bg-slate-50 border-b py-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{floor.name}</span>
                <span className="text-xs font-normal text-slate-500">
                  {floor.rooms.length} phòng/bàn
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-[#f8efe6]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {floor.rooms.map((room) => {
                  const roomBookings = getRoomBookings(room);
                  const roomReception = getRoomReception(room);

                  // LIVE dining: strictly only when viewing today AND status is dining AND not expired
                  const isDiningNow = Boolean(
                    isSelectedToday &&
                    roomReception &&
                    roomReception.status === "dining" &&
                    !isVisitExpired(roomReception.date, roomReception.time)
                  );
                  const isLeft = Boolean(
                    roomReception &&
                    (roomReception.status === "left" ||
                     isVisitExpired(roomReception.date, roomReception.time) ||
                     !isSelectedToday)
                  );
                  const isBooked = roomBookings.length > 0;

                  // Styling logic
                  let bgClass = "bg-white border-green-200 text-slate-700 hover:border-green-300";
                  let borderRing = "";

                  if (isDiningNow) {
                    // LIVE: Customers are eating right now!
                    bgClass = "bg-emerald-50/90 border-emerald-500 text-emerald-950 shadow-md ring-2 ring-emerald-400";
                  } else if (isBooked) {
                    const hasSVIP = roomBookings.some((b) => b.customerName.includes("[SVIP]"));
                    const hasVIP = roomBookings.some((b) => b.customerName.includes("[VIP]"));

                    if (hasSVIP) {
                      bgClass = "bg-gradient-to-br from-amber-100 to-yellow-300 border-yellow-500 text-yellow-950 ring-2 ring-yellow-400 shadow-yellow-200 shadow-lg";
                    } else if (hasVIP) {
                      bgClass = "bg-gradient-to-br from-purple-100 to-fuchsia-200 border-fuchsia-400 text-fuchsia-950 ring-1 ring-fuchsia-300 shadow-md";
                    } else {
                      bgClass = "bg-red-50 border-red-200 text-red-900";
                    }
                  } else if (isLeft) {
                    bgClass = "bg-slate-50 border-slate-300 text-slate-600";
                  }

                  return (
                    <div
                      key={room}
                      onClick={() =>
                        setSelectedRoomDetail({
                          roomName: room,
                          booking: roomBookings[0],
                          reception: roomReception,
                        })
                      }
                      className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-start text-center min-h-[105px] transition-all cursor-pointer hover:scale-[1.02] ${bgClass} ${borderRing}`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-xs sm:text-sm">{room}</span>
                        {isDiningNow && (
                          <span className="relative flex h-2.5 w-2.5" title="Đang dùng bữa">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>

                      {/* Display content */}
                      {isDiningNow ? (
                        <div className="flex flex-col gap-1 w-full mt-1">
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider leading-none self-center">
                            🟢 ĐANG CÓ KHÁCH
                          </span>
                          <span className="font-bold text-xs truncate" title={roomReception.customerName}>
                            {roomReception.customerName}
                          </span>
                          <div className="flex items-center justify-center gap-1.5 text-[11px] opacity-90 font-medium">
                            <span>👥 {roomReception.guestsCount} khách</span>
                            <span>• {roomReception.time}</span>
                          </div>
                          {roomReception.type === "walkin" && (
                            <span className="text-[10px] text-emerald-700 italic">
                              (Khách vãng lai)
                            </span>
                          )}
                        </div>
                      ) : isBooked ? (
                        <div className="flex flex-col gap-2 w-full mt-1">
                          {roomBookings.map((booking) => {
                            const isVIP = booking.customerName.includes("[VIP]");
                            const isSVIP = booking.customerName.includes("[SVIP]");
                            let displayName = booking.customerName
                              .replace(/\[(VIP|SVIP)\]/g, "")
                              .trim();

                            return (
                              <div
                                key={booking.id}
                                className="text-xs flex flex-col items-center gap-0.5 border-t border-black/10 pt-1.5 first:border-0 first:pt-0 w-full"
                              >
                                <div className="flex gap-1">
                                  {isSVIP && (
                                    <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider shadow-sm leading-none">
                                      SVIP
                                    </span>
                                  )}
                                  {isVIP && (
                                    <span className="bg-fuchsia-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm leading-none">
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-xs truncate max-w-[120px]">
                                  {displayName}
                                </span>
                                <div className="flex items-center gap-1 opacity-80 text-[11px]">
                                  <span>{booking.guestsCount} khách</span>
                                  <span className="font-bold">
                                    • {format(new Date(booking.dateTime), "HH:mm")}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : isLeft ? (
                        <div className="mt-auto mb-auto flex flex-col items-center gap-0.5">
                          <span className="text-[11px] text-slate-500 font-semibold">
                            ⚪ Đã dọn xong
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Khách về lúc {roomReception.time}
                          </span>
                        </div>
                      ) : (
                        <span className="mt-auto mb-auto text-xs text-green-600 font-medium">
                          Trống
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Unified Room / Table Details Modal */}
      <Dialog
        open={!!selectedRoomDetail}
        onOpenChange={(open) => !open && setSelectedRoomDetail(null)}
      >
        <DialogContent className="sm:max-w-[450px] p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Home className="w-5 h-5 text-orange-500" />
              Chi tiết phòng: {selectedRoomDetail?.roomName}
            </DialogTitle>
          </DialogHeader>

          {selectedRoomDetail && (
            <div className="space-y-4 py-2 text-xs sm:text-sm">
              {/* Reception Live Visit Status */}
              {selectedRoomDetail.reception && (() => {
                const isDialogDining = Boolean(
                  isSelectedToday &&
                  selectedRoomDetail.reception.status === "dining" &&
                  !isVisitExpired(selectedRoomDetail.reception.date, selectedRoomDetail.reception.time)
                );

                return (
                  <div className={`p-3.5 rounded-xl space-y-2 border ${
                    isDialogDining ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-sm flex items-center gap-1.5 ${
                        isDialogDining ? 'text-emerald-900' : 'text-slate-800'
                      }`}>
                        {isDialogDining ? (
                          <>
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            Đang Có Khách Ngồi Dùng Bữa
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-slate-500" />
                            Khách Đã Ra Về ({selectedRoomDetail.reception.time})
                          </>
                        )}
                      </span>
                      <Badge
                        className={
                          selectedRoomDetail.reception.type === "booking"
                            ? "bg-blue-600"
                            : "bg-emerald-600"
                        }
                      >
                        {selectedRoomDetail.reception.type === "booking"
                          ? "Booking"
                          : "Khách Vãng Lai"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Khách đại diện:</span>
                        <span className="font-bold">{selectedRoomDetail.reception.customerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Số lượng khách:</span>
                        <span className="font-bold">{selectedRoomDetail.reception.guestsCount} người</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Giờ vào:</span>
                        <span className="font-medium">{selectedRoomDetail.reception.time}</span>
                      </div>
                      {selectedRoomDetail.reception.phone && (
                        <div>
                          <span className="text-slate-500 text-[11px] block">Số điện thoại:</span>
                          <span className="font-medium text-blue-600">{selectedRoomDetail.reception.phone}</span>
                        </div>
                      )}
                    </div>

                    {selectedRoomDetail.reception.notes && (
                      <div className="text-xs text-slate-600 pt-1 border-t border-slate-200">
                        <span className="font-semibold">Ghi chú lễ tân:</span> {selectedRoomDetail.reception.notes}
                      </div>
                    )}

                    {/* Customer Feedback if departed */}
                    {selectedRoomDetail.reception.feedback &&
                      selectedRoomDetail.reception.feedback.rating &&
                      selectedRoomDetail.reception.feedback.rating !== "none" && (
                        <div className="mt-2 pt-2 border-t border-slate-200 bg-white p-2.5 rounded-lg">
                          <div className="flex items-center gap-1 font-bold text-xs text-slate-800">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>Cảm nhận khách hàng:</span>
                            <span className="text-emerald-700 ml-1">
                              {selectedRoomDetail.reception.feedback.rating === "very_satisfied" && "🤩 Rất hài lòng"}
                              {selectedRoomDetail.reception.feedback.rating === "satisfied" && "😊 Hài lòng"}
                              {selectedRoomDetail.reception.feedback.rating === "neutral" && "😐 Bình thường"}
                              {selectedRoomDetail.reception.feedback.rating === "unsatisfied" && "🙁 Cần cải thiện"}
                            </span>
                          </div>
                          {selectedRoomDetail.reception.feedback.comment && (
                            <p className="text-xs text-slate-600 italic mt-1">
                              &ldquo;{selectedRoomDetail.reception.feedback.comment}&rdquo;
                            </p>
                          )}
                          {selectedRoomDetail.reception.feedback.tags && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedRoomDetail.reception.feedback.tags.map((t, idx) => (
                                <span key={idx} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                );
              })()}

              {/* Booking Details if scheduled */}
              {selectedRoomDetail.booking ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500">Khách đặt trước</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-base text-slate-800">
                          {selectedRoomDetail.booking.customerName.replace(/\[(VIP|SVIP)\]/g, "").trim()}
                        </span>
                        {selectedRoomDetail.booking.customerName.includes("[SVIP]") && (
                          <Badge className="bg-yellow-500 hover:bg-yellow-600">SVIP</Badge>
                        )}
                        {selectedRoomDetail.booking.customerName.includes("[VIP]") &&
                          !selectedRoomDetail.booking.customerName.includes("[SVIP]") && (
                            <Badge className="bg-fuchsia-600 hover:bg-fuchsia-700">VIP</Badge>
                          )}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        SĐT: {selectedRoomDetail.booking.phone}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 block">Thời gian tiệc</span>
                      <span className="font-bold text-orange-600 text-sm">
                        {format(new Date(selectedRoomDetail.booking.dateTime), "HH:mm")}
                      </span>
                      <span className="text-xs text-slate-500 block">
                        {selectedRoomDetail.booking.guestsCount} khách
                      </span>
                    </div>
                  </div>

                  {/* Menu */}
                  {selectedRoomDetail.booking.menu && selectedRoomDetail.booking.menu.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 mb-1">Thực đơn đã gọi:</h4>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-36 overflow-y-auto space-y-1">
                        {selectedRoomDetail.booking.menu.map((item, idx) => (
                          <div key={idx} className="text-xs text-slate-700 pb-1 border-b border-slate-200 last:border-0 last:pb-0">
                            • {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decor Request */}
                  {selectedRoomDetail.booking.decorRequest && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 mb-1">Gói Decor:</h4>
                      <p className="text-xs bg-purple-50 text-purple-800 p-2 rounded border border-purple-100">
                        {selectedRoomDetail.booking.decorRequest}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                !selectedRoomDetail.reception && (
                  <div className="text-center py-6 text-slate-400">
                    Phòng hiện đang trống, chưa có tiệc đặt nào.
                  </div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
