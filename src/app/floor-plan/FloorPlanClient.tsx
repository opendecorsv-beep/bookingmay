"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Booking, ReceptionEntry, VisitStatus } from "@/lib/data";
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
  ArrowRight,
  AlertCircle,
  FileText,
  Phone,
  RefreshCw,
  RotateCcw,
  Plus
} from "lucide-react";
import DirectFloorBookingDialog from "@/components/DirectFloorBookingDialog";
import {
  isBookingArchived,
  isVisitExpired,
  getVietnamTodayString,
  parseBookingDate,
  DECOR_PACKAGE_NAMES,
  parseSpecialRequest,
  parseDecorRequest,
  isSameRoom,
  normalizeRoomName
} from "@/lib/bookingUtils";
import { transferReceptionRoomAction, cleanRoomTableAction, resetCleanRoomAction, checkInBookingFromFloorAction } from "@/app/actions";

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
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [receptionLogs, setReceptionLogs] = useState<ReceptionEntry[]>(initialReceptionLogs);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    setReceptionLogs(initialReceptionLogs);
  }, [initialReceptionLogs]);

  const [selectedDateTime, setSelectedDateTime] = useState(() => {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  });

  // Chế độ xem ca: 'all' = Cả ngày (Trưa & Tối), 'lunch' = Ca Trưa, 'dinner' = Ca Tối
  const [sessionFilter, setSessionFilter] = useState<'all' | 'lunch' | 'dinner'>('all');

  // Trạng thái modal đặt tiệc nhanh tại sơ đồ bàn
  const [isDirectBookingOpen, setIsDirectBookingOpen] = useState(false);
  const [directBookingRoom, setDirectBookingRoom] = useState("Mây 101");
  const [directBookingSession, setDirectBookingSession] = useState<'lunch' | 'dinner'>("lunch");

  // Helper xác định Ca Trưa (< 15:00) vs Ca Tối (>= 15:00)
  const getMealSession = (timeOrIsoString?: string): 'lunch' | 'dinner' => {
    if (!timeOrIsoString) return 'lunch';
    let hour = 12;
    if (timeOrIsoString.includes('T')) {
      const timePart = timeOrIsoString.split('T')[1];
      if (timePart) hour = parseInt(timePart.split(':')[0], 10);
    } else if (timeOrIsoString.includes(':')) {
      hour = parseInt(timeOrIsoString.split(':')[0], 10);
    }
    return hour < 15 ? 'lunch' : 'dinner';
  };

  const handleOpenDirectBooking = (roomName?: string, session?: 'lunch' | 'dinner') => {
    if (roomName) setDirectBookingRoom(roomName);
    if (session) {
      setDirectBookingSession(session);
    } else {
      const nowHour = new Date().getHours();
      setDirectBookingSession(nowHour >= 15 ? 'dinner' : 'lunch');
    }
    setIsDirectBookingOpen(true);
  };

  const handleBookingCreated = (newBooking: Booking) => {
    setBookings(prev => [...prev, newBooking]);
    setSelectedRoomDetail(prev => {
      if (!prev || !isSameRoom(prev.roomName, newBooking.room)) return prev;
      const updatedBookings = [...(prev.bookings || []), newBooking];
      return {
        ...prev,
        booking: prev.booking || newBooking,
        bookings: updatedBookings
      };
    });
  };

  // Selected item to view details
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<{
    roomName: string;
    booking?: Booking;
    bookings?: Booking[];
    reception?: ReceptionEntry;
  } | null>(null);

  const [transferRoom, setTransferRoom] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);

  const handleCheckInBooking = async (bookingId: string) => {
    setIsCheckingIn(true);
    try {
      const res = await checkInBookingFromFloorAction(bookingId);
      if (res && 'error' in res && res.error) {
        alert(res.error);
        return;
      }
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, receptionStatus: 'in_progress' as const } : b));
      setSelectedRoomDetail(prev => {
        if (!prev) return null;
        const updatedBookings = (prev.bookings || []).map(b => b.id === bookingId ? { ...b, receptionStatus: 'in_progress' as const } : b);
        return {
          ...prev,
          booking: prev.booking?.id === bookingId ? { ...prev.booking, receptionStatus: 'in_progress' as const } : prev.booking,
          bookings: updatedBookings
        };
      });
    } catch (err) {
      console.error("Lỗi khi đón khách:", err);
      alert("Có lỗi khi đón khách vào bàn!");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const ALL_ROOM_OPTIONS = useMemo(() => {
    return FLOORS.flatMap(f => f.rooms);
  }, []);

  const handleTransfer = async (receptionId: string, currentRoom: string) => {
    if (!transferRoom || transferRoom === currentRoom) {
      alert("Vui lòng chọn bàn/phòng mới để chuyển!");
      return;
    }
    setIsTransferring(true);
    try {
      await transferReceptionRoomAction(receptionId, transferRoom);
      setReceptionLogs(prev => prev.map(l => l.id === receptionId ? { ...l, room: transferRoom, updatedAt: new Date().toISOString() } : l));
      setSelectedRoomDetail(null);
      setTransferRoom("");
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi chuyển bàn!");
    } finally {
      setIsTransferring(false);
    }
  };

  const todayStr = useMemo(() => getVietnamTodayString(), []);

  const selectedDate = useMemo(
    () => selectedDateTime.split("T")[0] || todayStr,
    [selectedDateTime, todayStr]
  );

  const isSelectedToday = selectedDate === todayStr;
  const isFutureDate = selectedDate > todayStr;
  const isPastDate = selectedDate < todayStr;

  const tomorrowStr = useMemo(() => {
    const d = parseBookingDate(`${todayStr}T12:00`);
    d.setDate(d.getDate() + 1);
    return format(d, "yyyy-MM-dd");
  }, [todayStr]);

  const dayAfterTomorrowStr = useMemo(() => {
    const d = parseBookingDate(`${todayStr}T12:00`);
    d.setDate(d.getDate() + 2);
    return format(d, "yyyy-MM-dd");
  }, [todayStr]);

  const handleSetQuickDate = (targetDateStr: string) => {
    const currentTime = selectedDateTime.includes("T")
      ? selectedDateTime.split("T")[1]
      : format(new Date(), "HH:mm");
    setSelectedDateTime(`${targetDateStr}T${currentTime}`);
  };

  // Reception logs for the selected date
  const dayReceptionLogs = useMemo(() => {
    return receptionLogs.filter((log) => log.date === selectedDate);
  }, [receptionLogs, selectedDate]);

  // All bookings for the selected date (excluding CONFIG rows & cancelled)
  const allDayBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (!b || b.room === "CONFIG" || b.status === "cancelled") return false;
      const bDate = (b.dateTime || "").split("T")[0];
      return bDate === selectedDate;
    });
  }, [bookings, selectedDate]);

  // Action: Clean room/table directly from Floor Plan
  const handleCleanRoom = async (roomName: string, receptionId?: string, bookingId?: string, markCleaned = true) => {
    setIsCleaning(true);
    try {
      // 1. Optimistic updates
      setReceptionLogs(prev => prev.map(item => {
        if (receptionId && item.id === receptionId) {
          return {
            ...item,
            status: 'left' as VisitStatus,
            isCleaned: markCleaned,
            cleanedAt: markCleaned ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString()
          };
        }
        if (!receptionId && isSameRoom(item.room, roomName) && item.date === selectedDate && (item.status === 'dining' || (markCleaned && item.status === 'left' && !item.isCleaned))) {
          return {
            ...item,
            status: 'left' as VisitStatus,
            isCleaned: markCleaned,
            cleanedAt: markCleaned ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      }));

      setBookings(prev => prev.map(b => {
        if (bookingId && b.id === bookingId) {
          return {
            ...b,
            receptionStatus: markCleaned ? ('clean' as const) : ('done' as const),
            floorStatus: markCleaned ? ('clean' as const) : ('done' as const)
          };
        }
        if (!bookingId && isSameRoom(b.room, roomName) && (b.dateTime || '').startsWith(selectedDate)) {
          // Chỉ dọn các booking đã phục vụ (in_progress hoặc done), không dọn các booking pending của ca sau!
          if (b.receptionStatus === 'in_progress' || b.receptionStatus === 'done') {
            return {
              ...b,
              receptionStatus: markCleaned ? ('clean' as const) : ('done' as const),
              floorStatus: markCleaned ? ('clean' as const) : ('done' as const)
            };
          }
        }
        return b;
      }));

      // 2. Call server action
      await cleanRoomTableAction({
        roomName,
        date: selectedDate,
        bookingId,
        receptionId,
        markCleaned
      });

      // 3. Update currently opened dialog detail
      setSelectedRoomDetail(prev => {
        if (!prev) return null;
        const updatedBookings = (prev.bookings || []).map(b => {
          if (bookingId ? b.id === bookingId : (b.receptionStatus === 'in_progress' || b.receptionStatus === 'done')) {
            return {
              ...b,
              receptionStatus: markCleaned ? ('clean' as const) : ('done' as const),
              floorStatus: markCleaned ? ('clean' as const) : ('done' as const)
            };
          }
          return b;
        });
        const activeBookingAfterClean = updatedBookings.find(b => b.receptionStatus !== 'clean');
        return {
          ...prev,
          booking: activeBookingAfterClean || (prev.booking ? {
            ...prev.booking,
            receptionStatus: markCleaned ? ('clean' as const) : ('done' as const),
            floorStatus: markCleaned ? ('clean' as const) : ('done' as const)
          } : undefined),
          bookings: updatedBookings,
          reception: prev.reception ? {
            ...prev.reception,
            status: 'left' as const,
            isCleaned: markCleaned,
            cleanedAt: markCleaned ? new Date().toISOString() : undefined
          } : undefined
        };
      });
    } catch (err) {
      console.error("Lỗi khi dọn bàn:", err);
      alert("Có lỗi khi dọn bàn!");
    } finally {
      setIsCleaning(false);
    }
  };

  // Action: Reset/undo clean status
  const handleResetClean = async (roomName: string, bookingId?: string, receptionId?: string) => {
    setIsCleaning(true);
    try {
      setReceptionLogs(prev => prev.map(item => {
        const isTarget = receptionId ? item.id === receptionId : (isSameRoom(item.room, roomName) && item.date === selectedDate);
        if (isTarget && item.isCleaned) {
          return {
            ...item,
            isCleaned: false,
            cleanedAt: undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      }));

      setBookings(prev => prev.map(b => {
        if (bookingId && b.id === bookingId) {
          return { ...b, receptionStatus: 'pending' as const, floorStatus: 'pending' as const };
        }
        if (!bookingId && isSameRoom(b.room, roomName) && (b.dateTime || '').startsWith(selectedDate)) {
          return { ...b, receptionStatus: 'pending' as const, floorStatus: 'pending' as const };
        }
        return b;
      }));

      await resetCleanRoomAction({
        bookingId,
        roomName,
        date: selectedDate,
        receptionId
      });

      setSelectedRoomDetail(prev => {
        if (!prev) return null;
        const updatedBookings = (prev.bookings || []).map(b => {
          if (bookingId ? b.id === bookingId : true) {
            return { ...b, receptionStatus: 'pending' as const, floorStatus: 'pending' as const };
          }
          return b;
        });
        return {
          ...prev,
          booking: prev.booking ? { ...prev.booking, receptionStatus: 'pending' as const, floorStatus: 'pending' as const } : undefined,
          bookings: updatedBookings,
          reception: prev.reception ? {
            ...prev.reception,
            isCleaned: false,
            cleanedAt: undefined
          } : undefined
        };
      });
    } catch (err) {
      console.error("Lỗi hoàn tác:", err);
      alert("Có lỗi khi hoàn tác dọn bàn!");
    } finally {
      setIsCleaning(false);
    }
  };

  // Combined Restaurant Statistics (Lễ Tân + Sơ Đồ Bàn Thống Nhất)
  const unifiedStats = useMemo(() => {
    // 1. Total Booking guests on this date
    const totalBookingGuests = allDayBookings.reduce(
      (sum, b) => sum + (b.guestsCount || 0),
      0
    );
    const totalBookingsCount = allDayBookings.length;
    const uniqueBookedRooms = new Set(
      allDayBookings.map((b) => b.room?.trim()).filter(Boolean)
    ).size;

    // 2. Walkin logs on this date
    const walkinLogs = dayReceptionLogs.filter((l) => l.type === "walkin");
    const walkinGuests = walkinLogs.reduce(
      (sum, l) => sum + (l.guestsCount || 0),
      0
    );
    const walkinCount = walkinLogs.length;

    // 3. Guests currently dining in restaurant - ONLY for TODAY and NOT expired
    const diningLogs = isSelectedToday
      ? dayReceptionLogs.filter((l) => l.status === "dining" && !isVisitExpired(l.date, l.time))
      : [];
    const diningGuests = diningLogs.reduce(
      (sum, l) => sum + (l.guestsCount || 0),
      0
    );
    const diningTables = diningLogs.length;

    // 4. Guests who have departed:
    const leftLogs = isSelectedToday
      ? dayReceptionLogs.filter((l) => l.status === "left" || isVisitExpired(l.date, l.time))
      : dayReceptionLogs.filter((l) => l.status === "left");
    const leftGuests = leftLogs.reduce(
      (sum, l) => sum + (l.guestsCount || 0),
      0
    );
    const leftTables = leftLogs.length;

    // 5. Bookings not checked-in yet AND not cleaned
    const checkedInBookingIds = new Set(
      dayReceptionLogs.map((l) => l.bookingId).filter(Boolean)
    );
    const pendingBookings = isSelectedToday
      ? allDayBookings.filter(
          (b) =>
            !checkedInBookingIds.has(b.id) &&
            b.receptionStatus !== "clean" &&
            !isBookingArchived(b)
        )
      : isFutureDate
      ? allDayBookings.filter((b) => b.receptionStatus !== "clean")
      : [];
    const pendingGuests = pendingBookings.reduce(
      (sum, b) => sum + (b.guestsCount || 0),
      0
    );

    // 6. Totals for the day
    let totalDayGuests = 0;
    let totalDayTables = 0;

    if (isSelectedToday) {
      totalDayGuests = diningGuests + leftGuests + pendingGuests;
      totalDayTables = diningTables + leftTables + pendingBookings.length;
    } else if (isFutureDate) {
      totalDayGuests = totalBookingGuests + walkinGuests;
      totalDayTables = totalBookingsCount + walkinCount;
    } else {
      totalDayGuests = leftGuests + totalBookingGuests;
      totalDayTables = leftTables + totalBookingsCount;
    }

    const totalRestaurantRooms = 39;
    const availableRoomsCount = Math.max(0, totalRestaurantRooms - uniqueBookedRooms);

    return {
      totalBookingGuests,
      totalBookingsCount,
      uniqueBookedRooms,
      walkinCount,
      walkinGuests,
      diningGuests,
      diningTables,
      leftGuests,
      leftTables,
      pendingGuests,
      pendingTables: pendingBookings.length,
      totalDayGuests,
      totalDayTables,
      totalRestaurantRooms,
      availableRoomsCount,
    };
  }, [dayReceptionLogs, allDayBookings, isSelectedToday, isFutureDate, isPastDate]);

  // Helper to find all bookings for a room on selected date
  const getAllRoomBookings = (roomName: string) => {
    return allDayBookings
      .filter((b) => isSameRoom(b.room, roomName))
      .sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );
  };

  // Helper to find active upcoming bookings for a room on selected date
  const getActiveUpcomingRoomBookings = (roomName: string) => {
    const list = getAllRoomBookings(roomName);
    return list.filter((b) => {
      if (b.receptionStatus === "clean") return false;
      if (isSelectedToday && isBookingArchived(b)) return false;
      return true;
    });
  };

  // Helper to find dining reception entry for a room
  const getRoomDiningReception = (roomName: string) => {
    return dayReceptionLogs.find((l) => {
      return isSameRoom(l.room, roomName) && l.status === "dining" && !isVisitExpired(l.date, l.time);
    });
  };

  // Helper to find latest reception entry for a room (whether dining or left)
  const getRoomLatestReception = (roomName: string) => {
    const list = dayReceptionLogs.filter((l) => isSameRoom(l.room, roomName));
    if (list.length === 0) return undefined;
    const dining = list.find((l) => l.status === "dining" && !isVisitExpired(l.date, l.time));
    if (dining) return dining;
    return [...list].sort((a, b) => (b.time || '').localeCompare(a.time || ''))[0];
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
                {isSelectedToday ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                    🟢 Hôm nay (Realtime)
                  </Badge>
                ) : isFutureDate ? (
                  <Badge className="bg-orange-600 text-white font-bold text-[10px]">
                    📅 Ngày dự kiến ({format(new Date(selectedDate), "dd/MM")})
                  </Badge>
                ) : (
                  <Badge className="bg-slate-600 text-white font-bold text-[10px]">
                    📁 Lịch sử ({format(new Date(selectedDate), "dd/MM")})
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Ngày {format(new Date(selectedDate), "dd/MM/yyyy")} • Đồng bộ trực tiếp với Lễ Tân &amp; Đặt Bàn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => handleOpenDirectBooking()}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs h-9 shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Đặt Tiệc / Bàn Mới</span>
            </Button>
            <Link href="/">
              <Button
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-xs h-9"
              >
                Xem Lễ Tân Đón Khách
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Unified Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5">
          {/* Metric 1 */}
          {isSelectedToday ? (
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
          ) : isFutureDate ? (
            <div className="bg-slate-800/80 rounded-xl p-3 border border-orange-500/40 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                  Khách Dự Kiến (Booking)
                </span>
                <span className="text-[11px] font-bold text-orange-200 bg-orange-950/80 border border-orange-800 px-2 py-0.5 rounded-full">
                  {unifiedStats.totalBookingsCount} tiệc đã đặt
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-orange-400">
                  {unifiedStats.totalBookingGuests}
                </span>
                <span className="text-xs text-slate-300 font-medium">khách dự trù</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Đã xếp trước {unifiedStats.uniqueBookedRooms} phòng/bàn đón tiệc
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  Lượt Phục Vụ Thực Tế
                </span>
                <span className="text-[11px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full">
                  {unifiedStats.totalDayTables} lượt bàn
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-300">
                  {unifiedStats.totalDayGuests}
                </span>
                <span className="text-xs text-slate-300 font-medium">khách</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Tổng lượt phục vụ ghi nhận trong ngày
              </div>
            </div>
          )}

          {/* Metric 2: Tổng khách trong ngày */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isFutureDate ? "Tổng Khách Dự Trù" : "Tổng Khách Trong Ngày"}
              </span>
              <span className="text-[11px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full">
                {unifiedStats.totalDayTables} lượt bàn/tiệc
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {unifiedStats.totalDayGuests}
              </span>
              <span className="text-xs text-slate-300 font-medium">khách</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-2">
              <span>📅 {unifiedStats.totalBookingsCount} Booking ({unifiedStats.totalBookingGuests} k)</span>
              <span>•</span>
              <span>🚶 {unifiedStats.walkinCount} Vãng lai ({unifiedStats.walkinGuests} k)</span>
            </div>
          </div>

          {/* Metric 3: Khách đã ra về / Tình trạng phòng bàn */}
          {isFutureDate ? (
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Tình Trạng Phòng / Bàn
                </span>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Còn trống {unifiedStats.availableRoomsCount} bàn
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-200">
                  {unifiedStats.uniqueBookedRooms}
                  <span className="text-lg font-normal text-slate-400"> / {unifiedStats.totalRestaurantRooms}</span>
                </span>
                <span className="text-xs text-slate-400 font-medium">phòng bàn có tiệc</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Đã đặt {Math.round((unifiedStats.uniqueBookedRooms / unifiedStats.totalRestaurantRooms) * 100)}% công suất toàn nhà hàng
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {isSelectedToday ? "Khách Đã Ra Về" : "Lưu Trữ Hoàn Tất"}
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
                {isSelectedToday ? "Đã hoàn tất tiệc & ghi nhận cảm nhận" : "Dữ liệu lịch sử đã lưu trữ"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Time Filter & Legend Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
            <div className="space-y-2 w-full md:flex-1 md:max-w-md">
              <Label htmlFor="datetime" className="font-bold text-slate-700 text-xs sm:text-sm flex items-center justify-between">
                <span>Chọn thời gian kiểm tra sơ đồ:</span>
                <span className="text-xs text-orange-600 font-semibold">
                  {format(new Date(selectedDate), "EEEE, dd/MM/yyyy")}
                </span>
              </Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={selectedDateTime}
                onChange={(e) => setSelectedDateTime(e.target.value)}
                className="w-full text-xs sm:text-sm font-semibold"
              />
              {/* Quick Date Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(todayStr)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    selectedDate === todayStr
                      ? "bg-orange-600 text-white border-orange-600 shadow-2xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Hôm Nay ({format(parseBookingDate(`${todayStr}T12:00`), "dd/MM")})
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(tomorrowStr)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    selectedDate === tomorrowStr
                      ? "bg-orange-600 text-white border-orange-600 shadow-2xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Ngày Mai ({format(parseBookingDate(`${tomorrowStr}T12:00`), "dd/MM")})
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(dayAfterTomorrowStr)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    selectedDate === dayAfterTomorrowStr
                      ? "bg-orange-600 text-white border-orange-600 shadow-2xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Ngày Kia ({format(parseBookingDate(`${dayAfterTomorrowStr}T12:00`), "dd/MM")})
                </button>
              </div>

              {/* Quick Session Switcher: Tất cả / Ca Trưa / Ca Tối */}
              <div className="flex items-center gap-1.5 pt-1.5">
                <span className="text-xs font-bold text-slate-600 shrink-0">Bộ lọc ca:</span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSessionFilter('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      sessionFilter === 'all'
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🔄 Cả Ngày (Trưa &amp; Tối)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionFilter('lunch')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      sessionFilter === 'lunch'
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-slate-600 hover:text-amber-800"
                    }`}
                  >
                    <span>☀️ Ca Trưa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionFilter('dinner')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      sessionFilter === 'dinner'
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-indigo-800"
                    }`}
                  >
                    <span>🌙 Ca Tối</span>
                  </button>
                </div>
              </div>
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
                <span className="whitespace-nowrap font-medium text-purple-900">VIP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-gradient-to-br from-amber-100 to-yellow-300 border border-yellow-500 rounded shrink-0"></div>
                <span className="whitespace-nowrap font-medium text-amber-900">SVIP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-amber-100 border border-amber-400 rounded shrink-0"></div>
                <span className="whitespace-nowrap font-medium text-amber-800">🧹 Cần dọn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-slate-100 border border-slate-300 rounded shrink-0"></div>
                <span className="whitespace-nowrap font-medium text-slate-700">⚪ Trống sạch</span>
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
                  const allRoomBookings = getAllRoomBookings(room);
                  const activeRoomBookings = getActiveUpcomingRoomBookings(room);
                  const diningReception = isSelectedToday ? getRoomDiningReception(room) : undefined;
                  const latestReception = getRoomLatestReception(room);

                  // 1. Phân loại theo Ca Trưa & Ca Tối
                  const lunchBookings = allRoomBookings.filter(b => getMealSession(b.dateTime) === 'lunch');
                  const dinnerBookings = allRoomBookings.filter(b => getMealSession(b.dateTime) === 'dinner');

                  const lunchActiveBookings = activeRoomBookings.filter(b => getMealSession(b.dateTime) === 'lunch');
                  const dinnerActiveBookings = activeRoomBookings.filter(b => getMealSession(b.dateTime) === 'dinner');

                  const roomReceptions = dayReceptionLogs.filter(l => isSameRoom(l.room, room));
                  const lunchReception = isSelectedToday
                    ? roomReceptions.find(l => getMealSession(l.time) === 'lunch' && l.status === 'dining' && !isVisitExpired(l.date, l.time))
                    : undefined;
                  const dinnerReception = isSelectedToday
                    ? roomReceptions.find(l => getMealSession(l.time) === 'dinner' && l.status === 'dining' && !isVisitExpired(l.date, l.time))
                    : undefined;

                  const lunchInProgress = isSelectedToday ? lunchActiveBookings.find(b => b.receptionStatus === 'in_progress') : undefined;
                  const dinnerInProgress = isSelectedToday ? dinnerActiveBookings.find(b => b.receptionStatus === 'in_progress') : undefined;

                  const isLunchDining = Boolean(isSelectedToday && (lunchReception || lunchInProgress));
                  const isDinnerDining = Boolean(isSelectedToday && (dinnerReception || dinnerInProgress));
                  const isDiningNow = isLunchDining || isDinnerDining;

                  const lunchPending = lunchActiveBookings.find(b => b.receptionStatus !== 'in_progress');
                  const dinnerPending = dinnerActiveBookings.find(b => b.receptionStatus !== 'in_progress');

                  // Khách về ca trưa & ca tối
                  const lunchLatestRec = [...roomReceptions].filter(l => getMealSession(l.time) === 'lunch').sort((a,b) => (b.time||'').localeCompare(a.time||''))[0];
                  const dinnerLatestRec = [...roomReceptions].filter(l => getMealSession(l.time) === 'dinner').sort((a,b) => (b.time||'').localeCompare(a.time||''))[0];

                  const isLunchDirty = Boolean(
                    isSelectedToday && !isLunchDining && !lunchPending &&
                    ((lunchLatestRec && lunchLatestRec.status === 'left' && !lunchLatestRec.isCleaned) ||
                     lunchBookings.some(b => (b.dateTime || '').startsWith(selectedDate) && b.receptionStatus === 'done'))
                  );
                  const isDinnerDirty = Boolean(
                    isSelectedToday && !isDinnerDining && !dinnerPending &&
                    ((dinnerLatestRec && dinnerLatestRec.status === 'left' && !dinnerLatestRec.isCleaned) ||
                     dinnerBookings.some(b => (b.dateTime || '').startsWith(selectedDate) && b.receptionStatus === 'done'))
                  );

                  const isLunchCleaned = Boolean(
                    !isLunchDining && !lunchPending && !isLunchDirty &&
                    ((lunchLatestRec && lunchLatestRec.status === 'left' && Boolean(lunchLatestRec.isCleaned)) ||
                     lunchBookings.some(b => (b.dateTime || '').startsWith(selectedDate) && b.receptionStatus === 'clean'))
                  );
                  const isDinnerCleaned = Boolean(
                    !isDinnerDining && !dinnerPending && !isDinnerDirty &&
                    ((dinnerLatestRec && dinnerLatestRec.status === 'left' && Boolean(dinnerLatestRec.isCleaned)) ||
                     dinnerBookings.some(b => (b.dateTime || '').startsWith(selectedDate) && b.receptionStatus === 'clean'))
                  );

                  const isLunchEmpty = !isLunchDining && !lunchPending && !isLunchDirty && !isLunchCleaned;
                  const isDinnerEmpty = !isDinnerDining && !dinnerPending && !isDinnerDirty && !isDinnerCleaned;

                  // VIP / SVIP check across room
                  const hasSVIP = allRoomBookings.some(b => b.customerName.includes("[SVIP]")) ||
                                  roomReceptions.some(l => l.customerName.includes("[SVIP]"));
                  const hasVIP = !hasSVIP && (
                    allRoomBookings.some(b => b.customerName.includes("[VIP]")) ||
                    roomReceptions.some(l => l.customerName.includes("[VIP]"))
                  );

                  // Border & Styling
                  let cardBorder = "border-slate-200 bg-white hover:border-orange-400";
                  if (isDiningNow) {
                    if (hasSVIP) {
                      cardBorder = "bg-amber-50/80 border-yellow-500 ring-2 ring-yellow-400 shadow-md";
                    } else if (hasVIP) {
                      cardBorder = "bg-purple-50/80 border-fuchsia-400 ring-2 ring-fuchsia-300 shadow-md";
                    } else {
                      cardBorder = "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400 shadow-md";
                    }
                  } else if (hasSVIP) {
                    cardBorder = "bg-amber-50/40 border-yellow-400 shadow-2xs";
                  } else if (hasVIP) {
                    cardBorder = "bg-purple-50/40 border-purple-300 shadow-2xs";
                  } else if (lunchPending || dinnerPending) {
                    cardBorder = "bg-red-50/40 border-red-200 shadow-2xs";
                  }

                  return (
                    <div
                      key={room}
                      onClick={() =>
                        setSelectedRoomDetail({
                          roomName: room,
                          booking: activeRoomBookings[0] || allRoomBookings[0],
                          bookings: allRoomBookings,
                          reception: diningReception || latestReception,
                        })
                      }
                      className={`p-2.5 sm:p-3 rounded-xl border-2 flex flex-col justify-between text-center min-h-[125px] transition-all cursor-pointer hover:scale-[1.02] shadow-2xs ${cardBorder}`}
                    >
                      {/* 1. Header: Room Name + Badges */}
                      <div className="flex items-center justify-between w-full pb-1.5 border-b border-black/5">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-800">{room}</span>
                        <div className="flex items-center gap-1">
                          {isDiningNow && (
                            <span className="relative flex h-2.5 w-2.5" title="Đang có khách ngồi tại bàn">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                          )}
                          {hasSVIP && (
                            <span className="bg-yellow-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider leading-none shadow-xs">
                              👑 SVIP
                            </span>
                          )}
                          {hasVIP && (
                            <span className="bg-fuchsia-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider leading-none shadow-xs">
                              ⭐ VIP
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. Dual-Session Rows (Trưa & Tối) */}
                      <div className="flex flex-col gap-1.5 w-full pt-1.5 text-left text-xs my-auto">
                        {/* ROW 1: CA TRƯA */}
                        {(sessionFilter === 'all' || sessionFilter === 'lunch') && (
                          <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1 transition-all ${
                            isLunchDining
                              ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                              : lunchPending
                              ? (lunchPending.customerName.includes("[SVIP]") ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold' : lunchPending.customerName.includes("[VIP]") ? 'bg-purple-100 border-purple-300 text-purple-950 font-semibold' : 'bg-red-50 border-red-200 text-red-900')
                              : isLunchDirty
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : isLunchCleaned
                              ? 'bg-slate-100/70 border-slate-200 text-slate-500'
                              : 'bg-white/90 border-slate-200 text-slate-500 hover:border-orange-300'
                          }`}>
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span className="text-[10px] font-black text-amber-700 shrink-0">☀️ Trưa:</span>
                              {isLunchDining ? (
                                <span className="truncate text-[10px] font-bold text-emerald-900">
                                  🟢 Đang ăn ({lunchReception?.customerName?.replace(/\[(VIP|SVIP)\]/g, '').trim() || lunchInProgress?.customerName?.replace(/\[(VIP|SVIP)\]/g, '').trim()})
                                </span>
                              ) : lunchPending ? (
                                <div className="truncate text-[10px] flex items-center gap-1 font-medium">
                                  <span className="font-bold text-orange-700">{format(new Date(lunchPending.dateTime), "HH:mm")}</span>
                                  <span className="truncate font-semibold text-slate-800">{lunchPending.customerName.replace(/\[(VIP|SVIP)\]/g, '').trim()}</span>
                                  <span className="text-slate-500 shrink-0">({lunchPending.guestsCount}k)</span>
                                </div>
                              ) : isLunchDirty ? (
                                <span className="text-[10px] text-amber-800 font-bold">🧹 Cần dọn</span>
                              ) : isLunchCleaned ? (
                                <span className="text-[10px] text-slate-500 font-medium">⚪ Đã dọn</span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-medium">Trống</span>
                              )}
                            </div>

                            {/* Quick button to book lunch */}
                            {isLunchEmpty && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDirectBooking(room, 'lunch');
                                }}
                                className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 transition-colors cursor-pointer"
                                title="Đặt tiệc ca trưa cho bàn này"
                              >
                                + Đặt
                              </button>
                            )}
                          </div>
                        )}

                        {/* ROW 2: CA TỐI */}
                        {(sessionFilter === 'all' || sessionFilter === 'dinner') && (
                          <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1 transition-all ${
                            isDinnerDining
                              ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                              : dinnerPending
                              ? (dinnerPending.customerName.includes("[SVIP]") ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold' : dinnerPending.customerName.includes("[VIP]") ? 'bg-purple-100 border-purple-300 text-purple-950 font-semibold' : 'bg-red-50 border-red-200 text-red-900')
                              : isDinnerDirty
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : isDinnerCleaned
                              ? 'bg-slate-100/70 border-slate-200 text-slate-500'
                              : 'bg-white/90 border-slate-200 text-slate-500 hover:border-indigo-300'
                          }`}>
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span className="text-[10px] font-black text-indigo-700 shrink-0">🌙 Tối:</span>
                              {isDinnerDining ? (
                                <span className="truncate text-[10px] font-bold text-emerald-900">
                                  🟢 Đang ăn ({dinnerReception?.customerName?.replace(/\[(VIP|SVIP)\]/g, '').trim() || dinnerInProgress?.customerName?.replace(/\[(VIP|SVIP)\]/g, '').trim()})
                                </span>
                              ) : dinnerPending ? (
                                <div className="truncate text-[10px] flex items-center gap-1 font-medium">
                                  <span className="font-bold text-orange-700">{format(new Date(dinnerPending.dateTime), "HH:mm")}</span>
                                  <span className="truncate font-semibold text-slate-800">{dinnerPending.customerName.replace(/\[(VIP|SVIP)\]/g, '').trim()}</span>
                                  <span className="text-slate-500 shrink-0">({dinnerPending.guestsCount}k)</span>
                                </div>
                              ) : isDinnerDirty ? (
                                <span className="text-[10px] text-amber-800 font-bold">🧹 Cần dọn</span>
                              ) : isDinnerCleaned ? (
                                <span className="text-[10px] text-slate-500 font-medium">⚪ Đã dọn</span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-medium">Trống</span>
                              )}
                            </div>

                            {/* Quick button to book dinner */}
                            {isDinnerEmpty && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDirectBooking(room, 'dinner');
                                }}
                                className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 transition-colors cursor-pointer"
                                title="Đặt tiệc ca tối cho bàn này"
                              >
                                + Đặt
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-5">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 w-full flex-wrap sm:flex-nowrap">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800">
                <Home className="w-5 h-5 text-orange-500 shrink-0" />
                <span>Chi tiết: {selectedRoomDetail?.roomName}</span>
              </DialogTitle>
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenDirectBooking(selectedRoomDetail?.roomName)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-8 px-2.5 flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Đặt tiệc bàn này</span>
              </Button>
            </div>
          </DialogHeader>

          {selectedRoomDetail && (() => {
            const hasDining = Boolean(
              isSelectedToday &&
              selectedRoomDetail.reception?.status === "dining" &&
              !isVisitExpired(selectedRoomDetail.reception.date, selectedRoomDetail.reception.time)
            );
            const allDialogBookings = selectedRoomDetail.bookings || (selectedRoomDetail.booking ? [selectedRoomDetail.booking] : []);
            const activeBookingsInDialog = allDialogBookings.filter(b => b.receptionStatus !== 'clean');
            
            const inProgressBooking = activeBookingsInDialog.find(b => b.receptionStatus === 'in_progress');
            const doneBooking = activeBookingsInDialog.find(b => b.receptionStatus === 'done');
            const pendingBookings = activeBookingsInDialog.filter(b => !b.receptionStatus || b.receptionStatus === 'pending');
            const cleanedBookings = allDialogBookings.filter(b => b.receptionStatus === 'clean');

            const isDiningNow = hasDining || Boolean(inProgressBooking);

            // Detect SVIP / VIP for this room in dialog:
            const dialogBookingLinked = selectedRoomDetail.reception?.bookingId
              ? allDialogBookings.find(b => b.id === selectedRoomDetail.reception?.bookingId)
              : (inProgressBooking || allDialogBookings.find(b => (b.dateTime || '').startsWith(selectedDate) && (b.receptionStatus === 'in_progress' || b.receptionStatus === 'done')));

            const dialogCustRaw = (selectedRoomDetail.reception?.customerName || inProgressBooking?.customerName || dialogBookingLinked?.customerName || '');
            const dialogNotesRaw = (selectedRoomDetail.reception?.notes || inProgressBooking?.specialRequest || dialogBookingLinked?.specialRequest || '');

            const dialogIsSVIP = Boolean(
              dialogCustRaw.includes("[SVIP]") ||
              dialogNotesRaw.includes("[SVIP]") ||
              (dialogBookingLinked && dialogBookingLinked.customerName.includes("[SVIP]"))
            );

            const dialogIsVIP = Boolean(
              !dialogIsSVIP && (
                dialogCustRaw.includes("[VIP]") ||
                dialogNotesRaw.includes("[VIP]") ||
                (dialogBookingLinked && dialogBookingLinked.customerName.includes("[VIP]"))
              )
            );

            // Bàn cần dọn: nếu khách đã về nhưng CHƯA dọn (!isCleaned) HOẶC có booking chờ dọn ('done')
            const isReceptionDirty = Boolean(
              selectedRoomDetail.reception &&
              selectedRoomDetail.reception.status === 'left' &&
              !selectedRoomDetail.reception.isCleaned
            );
            const isDirtyNow = !isDiningNow && (isReceptionDirty || Boolean(doneBooking));
            const hasPendingOnly = !isDiningNow && !isDirtyNow && pendingBookings.length > 0;
            const isCleanOnly = !isDiningNow && !isDirtyNow && !hasPendingOnly && (cleanedBookings.length > 0 || Boolean(selectedRoomDetail.reception?.isCleaned));

            return (
              <div className="space-y-4 py-2 text-xs sm:text-sm">
                {/* Master Action Banner with Precise Real-world Restaurant States */}
                {isDiningNow ? (
                  <div className={`p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs border ${
                    dialogIsSVIP
                      ? 'bg-gradient-to-r from-amber-100 to-yellow-200 border-yellow-400'
                      : dialogIsVIP
                        ? 'bg-gradient-to-r from-purple-100 to-fuchsia-200 border-fuchsia-400'
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
                  }`}>
                    <div>
                      <div className={`font-extrabold text-xs uppercase tracking-wide flex items-center gap-1.5 ${
                        dialogIsSVIP ? 'text-amber-950' : dialogIsVIP ? 'text-purple-950' : 'text-emerald-900'
                      }`}>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            dialogIsSVIP ? 'bg-amber-400' : dialogIsVIP ? 'bg-fuchsia-400' : 'bg-emerald-400'
                          }`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            dialogIsSVIP ? 'bg-amber-500' : dialogIsVIP ? 'bg-fuchsia-500' : 'bg-emerald-500'
                          }`}></span>
                        </span>
                        {dialogIsSVIP ? '👑 Tiệc SVIP Đang Dùng Bữa Tại Phòng' : dialogIsVIP ? '⭐ Tiệc VIP Đang Dùng Bữa Tại Phòng' : 'Phòng Đang Có Khách Ngồi Dùng Bữa'}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${
                        dialogIsSVIP ? 'text-amber-900' : dialogIsVIP ? 'text-purple-900' : 'text-emerald-800/90'
                      }`}>
                        Khách đang dùng bữa tại bàn. Khi khách thanh toán ra về, bấm nút bên phải để chuyển sang trạng thái dọn phòng.
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={isCleaning}
                      onClick={() => handleCleanRoom(selectedRoomDetail.roomName, selectedRoomDetail.reception?.id, inProgressBooking?.id, false)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-9 px-3.5 flex items-center gap-1.5 shadow-sm shrink-0 w-full sm:w-auto"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      {isCleaning ? "Đang xử lý..." : "Khách Ra Về & Dọn Bàn"}
                    </Button>
                  </div>
                ) : isDirtyNow ? (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div>
                      <div className="font-extrabold text-xs text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Bàn Cần Dọn Dẹp (Khách Đã Dùng Bữa Xong)
                      </div>
                      <p className="text-[11px] text-amber-800/90 mt-0.5">
                        Khách đã dùng bữa xong. Sau khi dọn sạch bàn ghế, bấm Clean để đưa bàn về trạng thái trống sạch.
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={isCleaning}
                      onClick={() => handleCleanRoom(selectedRoomDetail.roomName, selectedRoomDetail.reception?.id, doneBooking?.id, true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs h-9 px-3.5 flex items-center gap-1.5 shadow-sm shrink-0 w-full sm:w-auto"
                    >
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      {isCleaning ? "Đang xử lý..." : "Dọn Xong (Clean) - Trả Bàn Trống"}
                    </Button>
                  </div>
                ) : hasPendingOnly ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div>
                      <div className="font-extrabold text-xs text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Phòng Đã Đặt Trước (Chờ Đón Khách)
                      </div>
                      <p className="text-[11px] text-blue-800/90 mt-0.5">
                        Bàn hiện đang trống để giữ chỗ đón tiệc lúc {format(new Date(pendingBookings[0].dateTime), "HH:mm")} ({pendingBookings[0].guestsCount} khách).
                      </p>
                    </div>
                    {isSelectedToday && (
                      <Button
                        type="button"
                        disabled={isCheckingIn}
                        onClick={() => handleCheckInBooking(pendingBookings[0].id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-9 px-3.5 flex items-center gap-1.5 shadow-sm shrink-0 w-full sm:w-auto"
                      >
                        <Users className="w-4 h-4 text-blue-200" />
                        {isCheckingIn ? "Đang đón khách..." : "Đón Khách Vào Bàn (Check-in)"}
                      </Button>
                    )}
                  </div>
                ) : isCleanOnly ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div>
                      <div className="font-extrabold text-xs text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Bàn Đã Dọn Xong (Trống Sạch - Sẵn Sàng Đón Khách)
                      </div>
                      <p className="text-[11px] text-emerald-800/90 mt-0.5">
                        Bàn đã được vệ sinh sạch sẽ, đã trả về trạng thái bàn trống để đón lượt khách tiếp theo.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isCleaning}
                      onClick={() => handleResetClean(selectedRoomDetail.roomName, cleanedBookings[0]?.id, selectedRoomDetail.reception?.id)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 border-slate-300 h-8 px-2.5 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Mở lại bàn cần dọn
                    </Button>
                  </div>
                ) : (
                  <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Phòng trống sạch - Sẵn sàng đón tiếp khách mới
                    </span>
                  </div>
                )}

                {/* Reception Live Visit Status */}
                {selectedRoomDetail.reception && (() => {
                  const isBookingLinkedDining = (selectedRoomDetail.bookings || (selectedRoomDetail.booking ? [selectedRoomDetail.booking] : []))
                    .some(b => b.receptionStatus === 'in_progress');
                  const isDialogDining = Boolean(
                    isSelectedToday &&
                    (
                      (selectedRoomDetail.reception.status === "dining" &&
                       !isVisitExpired(selectedRoomDetail.reception.date, selectedRoomDetail.reception.time)) ||
                      isBookingLinkedDining
                    )
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
                        ) : selectedRoomDetail.reception.isCleaned ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Khách Đã Về ({selectedRoomDetail.reception.time}) • Bàn Đã Dọn Sạch
                          </>
                        ) : (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Khách Đã Ra Về ({selectedRoomDetail.reception.time}) • Chờ Dọn Bàn
                          </>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        {dialogIsSVIP && (
                          <Badge className="bg-yellow-500 text-white text-[10px] font-black shadow-xs">
                            👑 SVIP
                          </Badge>
                        )}
                        {dialogIsVIP && !dialogIsSVIP && (
                          <Badge className="bg-fuchsia-600 text-white text-[10px] font-bold shadow-xs">
                            ⭐ VIP
                          </Badge>
                        )}
                        <Badge
                          className={
                            selectedRoomDetail.reception.type === "booking"
                              ? "bg-blue-600 text-white"
                              : "bg-emerald-600 text-white"
                          }
                        >
                          {selectedRoomDetail.reception.type === "booking"
                            ? "Booking"
                            : "Khách Vãng Lai"}
                        </Badge>
                      </div>
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

                    {/* Quick Transfer & Clean Controls for Live Dining */}
                    {isDialogDining && (
                      <div className="pt-2 border-t border-emerald-200/90 mt-2 space-y-2">
                        <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                            <Home className="w-3.5 h-3.5 text-orange-600" />
                            Đổi bàn/phòng:
                          </span>
                          <select
                            value={transferRoom}
                            onChange={(e) => setTransferRoom(e.target.value)}
                            className="text-xs h-8 px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 flex-1 font-semibold text-slate-800"
                          >
                            <option value="">-- Chọn bàn / phòng mới --</option>
                            {ALL_ROOM_OPTIONS.map((r) => (
                              <option key={r} value={r} disabled={r === selectedRoomDetail.roomName}>
                                {r} {r === selectedRoomDetail.roomName ? "(Đang ngồi)" : ""}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={!transferRoom || transferRoom === selectedRoomDetail.roomName || isTransferring}
                            onClick={() => handleTransfer(selectedRoomDetail.reception!.id, selectedRoomDetail.roomName)}
                            className="h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shrink-0 shadow-2xs"
                          >
                            {isTransferring ? "Đang đổi..." : "Chuyển Bàn Ngay"}
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          disabled={isCleaning}
                          onClick={() => handleCleanRoom(selectedRoomDetail.roomName, selectedRoomDetail.reception!.id, selectedRoomDetail.reception!.bookingId, false)}
                          className="w-full h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isCleaning ? "Đang xử lý..." : "Khách Ra Về & Bắt Đầu Dọn Bàn"}
                        </Button>
                      </div>
                    )}

                    {selectedRoomDetail.reception.notes && (
                      <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2">
                        <span className="font-bold flex items-center gap-1 mb-0.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Ghi chú lễ tân lúc đón khách:
                        </span>
                        <span className="whitespace-pre-line font-medium">{selectedRoomDetail.reception.notes}</span>
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
              {((selectedRoomDetail.bookings && selectedRoomDetail.bookings.length > 0) || selectedRoomDetail.booking) ? (
                <div className="space-y-4 pt-1">
                  {(selectedRoomDetail.bookings && selectedRoomDetail.bookings.length > 0
                    ? selectedRoomDetail.bookings
                    : [selectedRoomDetail.booking!]
                  ).map((booking, bIdx, arr) => {
                    const parsedReq = parseSpecialRequest(booking.specialRequest);
                    const decorParsed = parseDecorRequest(booking.decorRequest);
                    const isVIP = booking.customerName.includes("[VIP]");
                    const isSVIP = booking.customerName.includes("[SVIP]");
                    const cleanCustomerName = booking.customerName.replace(/\[(VIP|SVIP)\]/g, "").trim();

                    return (
                      <div
                        key={booking.id || bIdx}
                        className={`space-y-3 ${
                          arr.length > 1
                            ? "p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 shadow-2xs"
                            : ""
                        }`}
                      >
                        {arr.length > 1 && (
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <span className="font-extrabold text-xs text-orange-600 uppercase tracking-wider">
                              Tiệc {bIdx + 1}: {format(new Date(booking.dateTime), "HH:mm")}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-white">
                              {booking.guestsCount} khách
                            </Badge>
                          </div>
                        )}

                        {/* Customer Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                              Khách đặt trước
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="font-bold text-base text-slate-900">
                                {cleanCustomerName}
                              </span>
                              {isSVIP && (
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-[10px] font-black text-white">
                                  SVIP
                                </Badge>
                              )}
                              {isVIP && !isSVIP && (
                                <Badge className="bg-fuchsia-600 hover:bg-fuchsia-700 text-[10px] font-bold text-white">
                                  VIP
                                </Badge>
                              )}
                              {booking.receptionStatus === 'clean' && (
                                <Badge className="bg-slate-600 hover:bg-slate-700 text-[10px] font-bold text-white">
                                  ⚪ Đã dọn xong (Clean)
                                </Badge>
                              )}
                              {booking.receptionStatus === 'done' && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold text-white">
                                  🟢 Hoàn thành
                                </Badge>
                              )}
                              {booking.receptionStatus === 'in_progress' && (
                                <Badge className="bg-yellow-600 hover:bg-yellow-700 text-[10px] font-bold text-white">
                                  🟡 Đang phục vụ
                                </Badge>
                              )}
                              {(!booking.receptionStatus || booking.receptionStatus === 'pending') && (
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white">
                                  🕒 Chờ đón tiếp
                                </Badge>
                              )}
                            </div>
                            {booking.phone && (
                              <div className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                                <a href={`tel:${booking.phone}`} className="hover:underline font-medium">
                                  {booking.phone}
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="text-right flex flex-col items-end shrink-0">
                            <span className="text-xs font-semibold text-slate-500 block">Thời gian tiệc</span>
                            <span className="font-bold text-orange-600 text-base">
                              {format(new Date(booking.dateTime), "HH:mm")}
                            </span>
                            <span className="text-xs text-slate-600 font-medium block">
                              👥 {booking.guestsCount} khách
                            </span>

                            {/* Action button tailored to booking lifecycle */}
                            <div className="mt-1.5">
                              {booking.receptionStatus === 'clean' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isCleaning}
                                  onClick={() => handleResetClean(selectedRoomDetail.roomName, booking.id)}
                                  className="h-7 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border-slate-300 flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Mở lại bàn
                                </Button>
                              ) : booking.receptionStatus === 'in_progress' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isCleaning}
                                  onClick={() => handleCleanRoom(selectedRoomDetail.roomName, undefined, booking.id, false)}
                                  className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-2xs"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Khách về &amp; Chờ dọn
                                </Button>
                              ) : booking.receptionStatus === 'done' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isCleaning}
                                  onClick={() => handleCleanRoom(selectedRoomDetail.roomName, undefined, booking.id, true)}
                                  className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Dọn xong (Clean)
                                </Button>
                              ) : isSelectedToday ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isCheckingIn}
                                  onClick={() => handleCheckInBooking(booking.id)}
                                  className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-2xs"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  {isCheckingIn ? "Đang đón..." : "Đón khách vào bàn"}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* HIGHLIGHTED NOTE / DẶN DÒ CỦA KHÁCH - GIÁM SÁT / PHỤC VỤ / BẾP */}
                        {parsedReq.cleanNotes ? (
                          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 space-y-2 shadow-xs">
                            <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs uppercase tracking-wide">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Lưu Ý &amp; Dặn Dò Của Khách (Quan Trọng)</span>
                            </div>
                            <div className="bg-white/95 p-3 rounded-lg border border-amber-200 text-xs sm:text-sm font-semibold text-amber-950 whitespace-pre-line leading-relaxed shadow-2xs">
                              {parsedReq.cleanNotes}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-slate-500">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Ghi chú dặn dò: <span className="italic text-slate-400">Không có yêu cầu riêng</span></span>
                          </div>
                        )}

                        {/* Menu */}
                        {booking.menu && booking.menu.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-xs font-bold text-slate-700">
                                Thực đơn đã gọi ({booking.menu.length} món):
                              </h4>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-40 overflow-y-auto space-y-1">
                              {booking.menu.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs text-slate-700 pb-1 border-b border-slate-200/60 last:border-0 last:pb-0 font-medium"
                                >
                                  • {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Decor Request Details */}
                        <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              Yêu Cầu Decor
                            </span>
                            {decorParsed.occasion && decorParsed.occasion !== "Không có" && (
                              <Badge className="bg-purple-600 text-white text-[10px]">
                                {decorParsed.occasion}
                              </Badge>
                            )}
                          </div>

                          {decorParsed.pkg ? (
                            <div className="text-xs font-semibold text-purple-950">
                              {DECOR_PACKAGE_NAMES[decorParsed.pkg] || `Gói: ${decorParsed.pkg}`}
                              {decorParsed.price && (
                                <span className="text-orange-600 ml-1.5 font-bold">
                                  ({decorParsed.price})
                                </span>
                              )}
                            </div>
                          ) : (
                            decorParsed.occasion === "Không có" && (
                              <p className="text-xs text-slate-500 italic">Không có yêu cầu decor</p>
                            )
                          )}

                          {decorParsed.note && (
                            <div className="text-xs text-purple-900 bg-white/90 p-2.5 rounded-lg border border-purple-200 whitespace-pre-line">
                              <span className="font-bold text-purple-950">Ghi chú Decor:</span> {decorParsed.note}
                            </div>
                          )}
                        </div>

                        {/* Deposit, Discount, Source summary if present */}
                        {(parsedReq.deposit || parsedReq.discount || parsedReq.source) && (
                          <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-100 flex-wrap">
                            {parsedReq.deposit && (
                              <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-200 font-semibold text-[11px]">
                                💵 Cọc: {parsedReq.deposit}
                              </span>
                            )}
                            {parsedReq.discount && (
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold text-[11px]">
                                🏷️ Giảm: {parsedReq.discount}
                              </span>
                            )}
                            {parsedReq.source && (
                              <span className="text-slate-400 text-[11px] italic ml-auto">
                                Nguồn: {parsedReq.source}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !selectedRoomDetail.reception ? (
                <div className="text-center py-6 text-slate-400">
                  Phòng hiện đang trống, chưa có tiệc đặt nào.
                </div>
              ) : null}
            </div>
          );
        })()}
        </DialogContent>
      </Dialog>

      {/* 5. Direct Floor Booking Dialog */}
      <DirectFloorBookingDialog
        open={isDirectBookingOpen}
        onOpenChange={setIsDirectBookingOpen}
        defaultRoom={directBookingRoom}
        defaultDate={selectedDate}
        defaultSession={directBookingSession}
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
}
