'use client';

import React, { useState, useMemo } from 'react';
import { Booking, ReceptionEntry } from '@/lib/data';
import { getVietnamTodayString } from '@/lib/bookingUtils';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Clock, 
  Building2, 
  HeartHandshake, 
  PieChart, 
  Share2, 
  Footprints, 
  Award,
  Smile,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';

interface DashboardClientProps {
  initialBookings: Booking[];
  initialReceptionLogs: ReceptionEntry[];
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export default function DashboardClient({ initialBookings, initialReceptionLogs }: DashboardClientProps) {
  const [filter, setFilter] = useState<TimeFilter>('all');
  const todayStr = useMemo(() => getVietnamTodayString(), []);

  // Calculate 7 days ago string
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  const currentMonthPrefix = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    const valid = initialBookings.filter(b => !b.id.startsWith('CONFIG_') && b.status !== 'cancelled');
    if (filter === 'today') {
      return valid.filter(b => b.dateTime.startsWith(todayStr));
    }
    if (filter === 'week') {
      return valid.filter(b => b.dateTime.substring(0, 10) >= sevenDaysAgoStr);
    }
    if (filter === 'month') {
      return valid.filter(b => b.dateTime.startsWith(currentMonthPrefix));
    }
    return valid;
  }, [initialBookings, filter, todayStr, sevenDaysAgoStr, currentMonthPrefix]);

  // Filter Reception Logs
  const filteredReceptionLogs = useMemo(() => {
    const valid = initialReceptionLogs.filter(r => !r.id.startsWith('CONFIG_'));
    if (filter === 'today') {
      return valid.filter(r => r.date === todayStr);
    }
    if (filter === 'week') {
      return valid.filter(r => r.date >= sevenDaysAgoStr);
    }
    if (filter === 'month') {
      return valid.filter(r => r.date.startsWith(currentMonthPrefix));
    }
    return valid;
  }, [initialReceptionLogs, filter, todayStr, sevenDaysAgoStr, currentMonthPrefix]);

  // 1. Source extraction logic from bookings & reception
  const sourceStats = useMemo(() => {
    const counts: Record<string, { bookings: number; guests: number; category: string }> = {};

    filteredBookings.forEach(b => {
      let src = 'Không ghi nhận';
      const match = (b.specialRequest || '').match(/\[Nguồn:\s*([^\]]+)\]/i);
      if (match) {
        src = match[1].trim();
      } else if (b.customerName?.toLowerCase().includes('quen') || b.specialRequest?.toLowerCase().includes('quen')) {
        src = 'Khách quen';
      }

      // Categorize
      let category = 'Khác';
      const lower = src.toLowerCase();
      if (lower.includes('facebook') || lower.includes('fb')) {
        src = 'Facebook';
        category = 'Mạng Xã Hội';
      } else if (lower.includes('tiktok')) {
        src = 'TikTok';
        category = 'Mạng Xã Hội';
      } else if (lower.includes('quen')) {
        src = 'Khách quen';
        category = 'Khách Quen';
      } else if (lower.includes('trang')) {
        src = 'Trang (Marketing/Sale)';
        category = 'Nội Bộ Giới Thiệu';
      } else if (lower.includes('huynh') || lower.includes('huỳnh')) {
        src = 'Boss Huỳnh';
        category = 'Nội Bộ Giới Thiệu';
      } else if (lower.includes('quỳnh')) {
        src = 'Boss Quỳnh';
        category = 'Nội Bộ Giới Thiệu';
      } else if (lower.includes('thuấn')) {
        src = 'Anh Thuấn';
        category = 'Nội Bộ Giới Thiệu';
      } else if (lower.includes('huy')) {
        src = 'Giám Sát Huy';
        category = 'Nội Bộ Giới Thiệu';
      } else if (lower.includes('hotline') || lower.includes('gọi')) {
        src = 'Hotline / Điện thoại';
        category = 'Trực Tiếp';
      }

      if (!counts[src]) {
        counts[src] = { bookings: 0, guests: 0, category };
      }
      counts[src].bookings += 1;
      counts[src].guests += (b.guestsCount || 0);
    });

    const totalBookings = filteredBookings.length || 1;
    const sorted = Object.entries(counts)
      .map(([name, data]) => ({
        name,
        ...data,
        percentage: Math.round((data.bookings / totalBookings) * 100)
      }))
      .sort((a, b) => b.bookings - a.bookings);

    return sorted;
  }, [filteredBookings]);

  // 2. Walk-in vs Booking Ratios across Day, Week, Month, All Time
  const walkinRatios = useMemo(() => {
    const calc = (logs: ReceptionEntry[]) => {
      const total = logs.length;
      const walkin = logs.filter(l => l.type === 'walkin');
      const booking = logs.filter(l => l.type === 'booking');
      const walkinGuests = walkin.reduce((acc, cur) => acc + (cur.guestsCount || 0), 0);
      const bookingGuests = booking.reduce((acc, cur) => acc + (cur.guestsCount || 0), 0);
      const totalGuests = walkinGuests + bookingGuests;
      const walkinPct = total > 0 ? Math.round((walkin.length / total) * 100) : 0;
      const walkinGuestPct = totalGuests > 0 ? Math.round((walkinGuests / totalGuests) * 100) : 0;
      return {
        total,
        walkinCount: walkin.length,
        bookingCount: booking.length,
        walkinGuests,
        bookingGuests,
        totalGuests,
        walkinPct,
        walkinGuestPct
      };
    };

    const all = initialReceptionLogs.filter(l => !l.id.startsWith('CONFIG_'));
    const day = all.filter(l => l.date === todayStr);
    const week = all.filter(l => l.date >= sevenDaysAgoStr);
    const month = all.filter(l => l.date.startsWith(currentMonthPrefix));

    return {
      today: calc(day),
      week: calc(week),
      month: calc(month),
      all: calc(all)
    };
  }, [initialReceptionLogs, todayStr, sevenDaysAgoStr, currentMonthPrefix]);

  // 3. Repeat Customer Retention Rate & Loyal Customers List
  const loyalCustomerStats = useMemo(() => {
    // Map phone or normalized customer name
    const customerMap: Record<string, {
      name: string;
      phone: string;
      visitCount: number;
      totalGuests: number;
      lastDate: string;
      rooms: string[];
      isVIP: boolean;
    }> = {};

    // From Bookings
    initialBookings.forEach(b => {
      if (b.id.startsWith('CONFIG_') || b.status === 'cancelled') return;
      const cleanName = (b.customerName || '').replace(/\[(VIP|SVIP)\]/gi, '').trim();
      const key = b.phone && b.phone.length > 8 ? b.phone.trim() : cleanName.toLowerCase();
      if (!key) return;

      if (!customerMap[key]) {
        customerMap[key] = {
          name: cleanName || 'Khách hàng',
          phone: b.phone && b.phone !== 'Xxxxx' ? b.phone : 'Chưa lưu SĐT',
          visitCount: 0,
          totalGuests: 0,
          lastDate: b.dateTime.substring(0, 10),
          rooms: [],
          isVIP: b.customerName?.includes('VIP') || false
        };
      }
      customerMap[key].visitCount += 1;
      customerMap[key].totalGuests += (b.guestsCount || 0);
      if (b.dateTime.substring(0, 10) > customerMap[key].lastDate) {
        customerMap[key].lastDate = b.dateTime.substring(0, 10);
      }
      if (b.room && !customerMap[key].rooms.includes(b.room)) {
        customerMap[key].rooms.push(b.room);
      }
      if (b.customerName?.includes('VIP')) {
        customerMap[key].isVIP = true;
      }
    });

    const allCustomers = Object.values(customerMap);
    const totalUnique = allCustomers.length;
    const repeatCustomers = allCustomers.filter(c => c.visitCount >= 2);
    const repeatCount = repeatCustomers.length;
    const repeatRate = totalUnique > 0 ? Math.round((repeatCount / totalUnique) * 100) : 0;

    const topLoyal = [...allCustomers]
      .sort((a, b) => b.visitCount !== a.visitCount ? b.visitCount - a.visitCount : b.totalGuests - a.totalGuests)
      .slice(0, 6);

    return {
      totalUnique,
      repeatCount,
      repeatRate,
      topLoyal
    };
  }, [initialBookings]);

  // 4. Meal Shift: Lunch (Ca trưa) vs Dinner (Ca tối)
  const shiftStats = useMemo(() => {
    let lunchCount = 0;
    let dinnerCount = 0;
    let lunchGuests = 0;
    let dinnerGuests = 0;

    filteredBookings.forEach(b => {
      const timeStr = b.dateTime.split('T')[1] || '';
      const hour = parseInt(timeStr.substring(0, 2), 10);
      const guests = b.guestsCount || 0;
      if (hour < 15) {
        lunchCount += 1;
        lunchGuests += guests;
      } else {
        dinnerCount += 1;
        dinnerGuests += guests;
      }
    });

    const total = (lunchCount + dinnerCount) || 1;
    return {
      lunchCount,
      lunchGuests,
      lunchPct: Math.round((lunchCount / total) * 100),
      dinnerCount,
      dinnerGuests,
      dinnerPct: Math.round((dinnerCount / total) * 100)
    };
  }, [filteredBookings]);

  // 5. Floor & Room Popularity
  const roomStats = useMemo(() => {
    let floor1 = 0;
    let floor2 = 0;
    let floor4 = 0;
    const roomCounts: Record<string, number> = {};

    filteredBookings.forEach(b => {
      const room = b.room || '';
      roomCounts[room] = (roomCounts[room] || 0) + 1;
      if (room.includes('101') || room.includes('102') || room.includes('103') || room.includes('104') || room.includes('105') || room.includes('106')) {
        floor1 += 1;
      } else if (room.includes('201') || room.includes('202') || room.includes('203') || room.includes('204') || room.includes('205') || room.includes('206')) {
        floor2 += 1;
      } else {
        floor4 += 1;
      }
    });

    const total = filteredBookings.length || 1;
    const topRooms = Object.entries(roomCounts)
      .filter(([name]) => name && name !== 'Chưa chọn')
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      floor1,
      floor1Pct: Math.round((floor1 / total) * 100),
      floor2,
      floor2Pct: Math.round((floor2 / total) * 100),
      floor4,
      floor4Pct: Math.round((floor4 / total) * 100),
      topRooms
    };
  }, [filteredBookings]);

  // 6. Party Size Distribution
  const partySizeStats = useMemo(() => {
    let small = 0; // 1-4
    let medium = 0; // 5-9
    let large = 0; // 10-19
    let event = 0; // 20+

    filteredBookings.forEach(b => {
      const g = b.guestsCount || 0;
      if (g <= 4) small += 1;
      else if (g <= 9) medium += 1;
      else if (g <= 19) large += 1;
      else event += 1;
    });

    const total = filteredBookings.length || 1;
    return {
      small,
      smallPct: Math.round((small / total) * 100),
      medium,
      mediumPct: Math.round((medium / total) * 100),
      large,
      largePct: Math.round((large / total) * 100),
      event,
      eventPct: Math.round((event / total) * 100)
    };
  }, [filteredBookings]);

  // 7. Decor & Party Menu Sets Adoption Rate
  const serviceStats = useMemo(() => {
    let withDecor = 0;
    let withMenuSet = 0;

    filteredBookings.forEach(b => {
      if (b.decorRequest && b.decorRequest !== 'Không có' && b.decorRequest.trim() !== '') {
        withDecor += 1;
      }
      if (Array.isArray(b.menu) && b.menu.some(m => typeof m === 'string' && (m.includes('[SET]') || m.includes('Thực Đơn')))) {
        withMenuSet += 1;
      }
    });

    const total = filteredBookings.length || 1;
    return {
      withDecor,
      decorPct: Math.round((withDecor / total) * 100),
      withMenuSet,
      menuSetPct: Math.round((withMenuSet / total) * 100)
    };
  }, [filteredBookings]);

  // 8. CSAT & Feedback
  const feedbackStats = useMemo(() => {
    let veryGood = 0;
    let good = 0;
    let neutral = 0;
    let bad = 0;
    const comments: { name: string; text: string; rating: string; date: string }[] = [];

    filteredReceptionLogs.forEach(r => {
      if (r.feedback) {
        if (r.feedback.rating === 'very_satisfied') veryGood += 1;
        else if (r.feedback.rating === 'satisfied') good += 1;
        else if (r.feedback.rating === 'neutral') neutral += 1;
        else if (r.feedback.rating === 'unsatisfied') bad += 1;

        if (r.feedback.comment && r.feedback.comment.trim() !== '') {
          comments.push({
            name: r.customerName,
            text: r.feedback.comment,
            rating: r.feedback.rating || 'satisfied',
            date: r.date
          });
        }
      }
    });

    const totalEvaluated = veryGood + good + neutral + bad;
    const positiveRate = totalEvaluated > 0 ? Math.round(((veryGood + good) / totalEvaluated) * 100) : 100;

    return {
      totalEvaluated,
      positiveRate,
      veryGood,
      good,
      neutral,
      bad,
      recentComments: comments.slice(-4).reverse()
    };
  }, [filteredReceptionLogs]);

  // Total summary for current active filter
  const totalGuests = useMemo(() => {
    return filteredBookings.reduce((sum, b) => sum + (b.guestsCount || 0), 0);
  }, [filteredBookings]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <PieChart className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              Dashboard Báo Cáo & Phân Tích
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Số liệu thời gian thực về nguồn khách, tỉ lệ vãng lai, khách quen và hiệu suất vận hành nhà hàng
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'today'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'week'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 ngày qua
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'month'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      {/* Row 1: 4 Quick Stat Metric Cards (Bento) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Khách đặt trước */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-orange-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Tiệc Đặt Trước</span>
            <span className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {filteredBookings.length} <span className="text-xs font-medium text-slate-400">tiệc</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Quy mô: <strong>{totalGuests}</strong> khách</span>
              <span className="text-orange-600 font-semibold">100% bàn</span>
            </div>
          </div>
        </div>

        {/* Card 2: Khách Vãng Lai */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Tỉ Lệ Vãng Lai</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Footprints className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {walkinRatios[filter === 'today' ? 'today' : filter === 'week' ? 'week' : filter === 'month' ? 'month' : 'all'].walkinPct}%
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Lễ tân đón: <strong>{walkinRatios[filter === 'today' ? 'today' : filter === 'week' ? 'week' : filter === 'month' ? 'month' : 'all'].walkinCount}</strong> lượt</span>
              <span className="text-emerald-700 font-medium">({walkinRatios[filter === 'today' ? 'today' : filter === 'week' ? 'week' : filter === 'month' ? 'month' : 'all'].walkinGuests} khách)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Tỉ lệ khách quen */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Khách Quen Quay Lại</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <HeartHandshake className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
              {loyalCustomerStats.repeatRate}%
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Đã đến ≥ 2 lần: <strong>{loyalCustomerStats.repeatCount}</strong></span>
              <span className="text-slate-400">/ {loyalCustomerStats.totalUnique} khách</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tỉ Lệ Đặt Menu Tiệc & Decor */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Tiệc Có Decor / Set</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-600">
              {serviceStats.decorPct}% <span className="text-xs font-normal text-slate-400">decor</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Menu Set 10 pax: <strong>{serviceStats.menuSetPct}%</strong></span>
              <span className="text-purple-600 font-medium">{serviceStats.withDecor} tiệc decor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Deep Dive Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Section 1: Customer Sources Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Share2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Phân Bổ Nguồn Khách Đến</h3>
                  <p className="text-[11px] text-slate-400">Tỉ trọng các kênh booking thực tế tại Mây</p>
                </div>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-semibold text-slate-600">
                {sourceStats.length} kênh
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {sourceStats.slice(0, 7).map((src, idx) => {
                const isFb = src.name === 'Facebook';
                const isTiktok = src.name === 'TikTok';
                const isLoyal = src.name === 'Khách quen';
                const isInternal = src.category === 'Nội Bộ Giới Thiệu';

                return (
                  <div key={src.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          isFb ? 'bg-blue-600' : isTiktok ? 'bg-black' : isLoyal ? 'bg-emerald-500' : isInternal ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        <span className="text-slate-800 font-semibold">{src.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 shrink-0">
                        <span>{src.bookings} tiệc ({src.guests} khách)</span>
                        <span className="font-bold text-slate-800 w-9 text-right">{src.percentage}%</span>
                      </div>
                    </div>
                    {/* Bar visual */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFb ? 'bg-blue-500' : isTiktok ? 'bg-slate-900' : isLoyal ? 'bg-emerald-500' : isInternal ? 'bg-amber-500' : 'bg-slate-400'
                        }`} 
                        style={{ width: `${Math.max(src.percentage, 3)}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Kênh nổi trội nhất: <strong className="text-blue-600">Facebook ({sourceStats[0]?.percentage || 0}%)</strong></span>
            <span>Nội bộ / Quen: <strong className="text-emerald-600">
              {sourceStats.filter(s => s.name === 'Khách quen' || s.category === 'Nội Bộ Giới Thiệu').reduce((sum, s) => sum + s.percentage, 0)}%
            </strong></span>
          </div>
        </div>

        {/* Section 2: Walk-in Breakdown by Day, Week, Month (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Footprints className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Tỉ Lệ Khách Vãng Lai Theo Chu Kỳ</h3>
                  <p className="text-[11px] text-slate-400">So sánh lượng khách đột xuất (Walk-in) với khách đặt trước</p>
                </div>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                Dữ liệu thực tế Lễ Tân
              </span>
            </div>

            {/* Comparison Cards: Day vs Week vs Month vs All */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4">
              {/* Today */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hôm Nay</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {walkinRatios.today.walkinPct}%
                </div>
                <div className="text-[11px] text-slate-500">
                  {walkinRatios.today.walkinCount} / {walkinRatios.today.total} lượt đón
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold pt-0.5">
                  {walkinRatios.today.walkinGuests} khách vãng lai
                </div>
              </div>

              {/* 7 Days */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">7 Ngày Qua</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {walkinRatios.week.walkinPct}%
                </div>
                <div className="text-[11px] text-slate-500">
                  {walkinRatios.week.walkinCount} / {walkinRatios.week.total} lượt đón
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold pt-0.5">
                  {walkinRatios.week.walkinGuests} khách vãng lai
                </div>
              </div>

              {/* Month */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tháng Này</span>
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {walkinRatios.month.walkinPct}%
                </div>
                <div className="text-[11px] text-slate-500">
                  {walkinRatios.month.walkinCount} / {walkinRatios.month.total} lượt đón
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold pt-0.5">
                  {walkinRatios.month.walkinGuests} khách vãng lai
                </div>
              </div>
            </div>

            {/* Mini Progress Ratio Visual */}
            <div className="mt-5 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Khách vãng lai: <strong>{walkinRatios.all.walkinCount} lượt ({walkinRatios.all.walkinPct}%)</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Khách đặt bàn: <strong>{walkinRatios.all.bookingCount} lượt ({100 - walkinRatios.all.walkinPct}%)</strong>
                </span>
              </div>
              <div className="h-3 w-full bg-orange-200 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${walkinRatios.all.walkinPct}%` }} 
                />
                <div 
                  className="h-full bg-orange-500 transition-all duration-500" 
                  style={{ width: `${100 - walkinRatios.all.walkinPct}%` }} 
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Vãng lai trung bình: ~{Math.round(walkinRatios.all.walkinGuests / (walkinRatios.all.walkinCount || 1))} khách / bàn</span>
                <span>Đặt trước trung bình: ~{Math.round(walkinRatios.all.bookingGuests / (walkinRatios.all.bookingCount || 1))} khách / bàn</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>💡 <em>Khách vãng lai chiếm gần 1/3 tổng lượng phục vụ, tập trung đông vào khung giờ ăn tối.</em></span>
          </div>
        </div>

      </div>

      {/* Row 3: Loyal Customers Leaderboard & Operations Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Loyal Repeat Customers Table (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Award className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Top Khách Thân Thiết & Tỉ Lệ Quay Lại</h3>
                  <p className="text-[11px] text-slate-400">Những thực khách VIP có tần suất đặt bàn và ủng hộ cao nhất</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Quay lại: {loyalCustomerStats.repeatRate}%
                </span>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {loyalCustomerStats.topLoyal.map((customer, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 truncate">{customer.name}</span>
                        {customer.isVIP && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-white rounded">VIP</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{customer.phone}</span>
                        <span>•</span>
                        <span>Phòng ưa thích: {customer.rooms.slice(0, 2).join(', ') || 'VIP'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-800">{customer.visitCount} lần ghé</div>
                    <div className="text-[11px] text-slate-400">Tổng {customer.totalGuests} khách</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tổng khách hàng đã lưu hồ sơ: <strong>{loyalCustomerStats.totalUnique} khách</strong></span>
            <span>Khách quay lại: <strong>{loyalCustomerStats.repeatCount} khách</strong></span>
          </div>
        </div>

        {/* Operational Patterns: Shifts, Floors & Party Size (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Mô Hình Vận Hành & Khung Giờ</h3>
                  <p className="text-[11px] text-slate-400">Hiệu suất Ca Trưa vs Ca Tối và khu vực phòng</p>
                </div>
              </div>
            </div>

            {/* Shift comparison */}
            <div className="mt-4 space-y-3">
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Khung Giờ Phục Vụ (Ca Làm Việc)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60">
                  <div className="font-medium text-amber-900">Ca Trưa (10h - 14h)</div>
                  <div className="text-lg font-bold text-amber-800 mt-1">{shiftStats.lunchCount} tiệc</div>
                  <div className="text-[11px] text-amber-700">{shiftStats.lunchGuests} khách ({shiftStats.lunchPct}%)</div>
                </div>
                <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-200/60">
                  <div className="font-medium text-indigo-900">Ca Tối (17h - 22h)</div>
                  <div className="text-lg font-bold text-indigo-800 mt-1">{shiftStats.dinnerCount} tiệc</div>
                  <div className="text-[11px] text-indigo-700">{shiftStats.dinnerGuests} khách ({shiftStats.dinnerPct}%)</div>
                </div>
              </div>
            </div>

            {/* Floor Popularity */}
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Khu Vực / Tầng Ưa Chuộng</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold">TẦNG 1 (VIP 1)</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">{roomStats.floor1} tiệc</div>
                  <div className="text-[10px] text-slate-500 font-medium">{roomStats.floor1Pct}%</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold">TẦNG 2 (VIP 2)</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">{roomStats.floor2} tiệc</div>
                  <div className="text-[10px] text-slate-500 font-medium">{roomStats.floor2Pct}%</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold">TẦNG 4 (SẢNH TIỆC)</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">{roomStats.floor4} tiệc</div>
                  <div className="text-[10px] text-slate-500 font-medium">{roomStats.floor4Pct}%</div>
                </div>
              </div>
            </div>

            {/* Party Size Distribution */}
            <div className="mt-4 space-y-1.5">
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Quy Mô Bàn Tiệc (Số Lượng Khách/Tiệc)</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                <div className="p-1.5 bg-slate-50 rounded-md border border-slate-100">
                  <div className="text-slate-400 text-[10px]">1-4 pax</div>
                  <div className="font-bold text-slate-700">{partySizeStats.smallPct}%</div>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-md border border-slate-100">
                  <div className="text-slate-400 text-[10px]">5-9 pax</div>
                  <div className="font-bold text-slate-700">{partySizeStats.mediumPct}%</div>
                </div>
                <div className="p-1.5 bg-orange-50 rounded-md border border-orange-200">
                  <div className="text-orange-600 text-[10px] font-bold">10-19 pax</div>
                  <div className="font-bold text-orange-800">{partySizeStats.largePct}%</div>
                </div>
                <div className="p-1.5 bg-purple-50 rounded-md border border-purple-200">
                  <div className="text-purple-600 text-[10px] font-bold">≥ 20 pax</div>
                  <div className="font-bold text-purple-800">{partySizeStats.eventPct}%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>🔥 Cao điểm: <strong>Ca Tối ({shiftStats.dinnerPct}%)</strong></span>
            <span>Tiệc chủ lực: <strong>Nhóm 10-19 khách ({partySizeStats.largePct}%)</strong></span>
          </div>
        </div>

      </div>

      {/* Row 4: Customer Satisfaction & Feedback Audit */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Smile className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Chỉ Số Hài Lòng Khách Hàng (CSAT & Feedback)</h3>
              <p className="text-[11px] text-slate-400">Được tổng hợp từ các đánh giá kết thúc tiệc tại Lễ Tân</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Tỉ lệ hài lòng chung:</span>
            <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-full font-bold">
              {feedbackStats.positiveRate}% Hài lòng
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
            <div className="text-xl font-black text-emerald-700">{feedbackStats.veryGood}</div>
            <div className="text-xs font-semibold text-emerald-800 mt-0.5">Rất hài lòng ⭐⭐⭐⭐⭐</div>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60">
            <div className="text-xl font-black text-blue-700">{feedbackStats.good}</div>
            <div className="text-xs font-semibold text-blue-800 mt-0.5">Hài lòng ⭐⭐⭐⭐</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xl font-black text-slate-700">{feedbackStats.neutral}</div>
            <div className="text-xs font-medium text-slate-600 mt-0.5">Bình thường ⭐⭐⭐</div>
          </div>
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/60">
            <div className="text-xl font-black text-rose-700">{feedbackStats.bad}</div>
            <div className="text-xs font-medium text-rose-800 mt-0.5">Cần cải thiện ⚠️</div>
          </div>
        </div>

        {feedbackStats.recentComments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700 mb-2">Ghi nhận phản hồi thực tế từ thực khách:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {feedbackStats.recentComments.map((comment, i) => (
                <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <strong className="text-slate-700">{comment.name}</strong>
                    <span>{comment.date}</span>
                  </div>
                  <p className="text-slate-600 italic">“{comment.text}”</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
