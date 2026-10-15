'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Clock,
  PlusCircle,
  FileSpreadsheet,
  Search,
  MessageSquare,
  ThumbsUp,
  Smile,
  Meh,
  Frown,
  Star,
  CheckCircle2,
  Trash2,
  Edit,
  Phone,
  Home,
  Percent,
  TrendingUp,
  X,
  Filter,
  Check,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  ReceptionEntry,
  CustomerType,
  VisitStatus,
  FeedbackRating,
  ReceptionFeedback,
  Booking
} from '@/lib/data';
import { isBookingArchived, isVisitExpired, getVietnamTodayString } from '@/lib/bookingUtils';
import {
  addReceptionEntryAction,
  updateReceptionStatusAction,
  updateReceptionFeedbackAction,
  deleteReceptionEntryAction
} from '@/app/actions';
import * as XLSX from 'xlsx';

interface ReceptionClientProps {
  initialLogs: ReceptionEntry[];
  allBookings: Booking[];
}

const QUICK_TAGS = [
  'Đồ ăn rất ngon',
  'Hải sản tươi sống',
  'Phục vụ chu đáo',
  'Không gian đẹp',
  'Ra món nhanh',
  'Decor tiệc đẹp',
  'Cần ra món nhanh hơn',
  'Phòng hơi ồn',
  'Giá cả hợp lý'
];

export default function ReceptionClient({ initialLogs, allBookings }: ReceptionClientProps) {
  const [logs, setLogs] = useState<ReceptionEntry[]>(initialLogs);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const todayStr = useMemo(() => getVietnamTodayString(), []);
  const [selectedFilterTab, setSelectedFilterTab] = useState<'today' | 'yesterday' | 'month' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'booking' | 'walkin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'dining' | 'left'>('all');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [selectedEntryForFeedback, setSelectedEntryForFeedback] = useState<ReceptionEntry | null>(null);

  // New entry form state
  const [newType, setNewType] = useState<CustomerType>('walkin');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGuestsCount, setNewGuestsCount] = useState<number>(2);
  const [newRoom, setNewRoom] = useState('');
  const [newDate, setNewDate] = useState(todayStr);
  const [newTime, setNewTime] = useState(() => format(new Date(), 'HH:mm'));
  const [newNotes, setNewNotes] = useState('');

  // Feedback form state
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>('very_satisfied');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Yesterday date string (Vietnam timezone)
  const yesterdayStr = useMemo(() => {
    const today = getVietnamTodayString();
    const [y, m, d] = today.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    return format(date, 'yyyy-MM-dd');
  }, []);

  const currentMonthStr = useMemo(() => getVietnamTodayString().substring(0, 7), []);

  // Helper to determine real-time status: any past day or >6h dining is automatically considered 'left'
  const getEffectiveStatus = (entry: ReceptionEntry): VisitStatus => {
    if (entry.status === 'left') return 'left';
    if (isVisitExpired(entry.date, entry.time)) return 'left';
    return 'dining';
  };

  // Filtered logs for display
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Date filter
      if (customDate) {
        if (log.date !== customDate) return false;
      } else if (selectedFilterTab === 'today') {
        if (log.date !== todayStr) return false;
      } else if (selectedFilterTab === 'yesterday') {
        if (log.date !== yesterdayStr) return false;
      } else if (selectedFilterTab === 'month') {
        if (!log.date.startsWith(currentMonthStr)) return false;
      }

      // Customer type filter
      if (typeFilter !== 'all' && log.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && getEffectiveStatus(log) !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = log.customerName.toLowerCase().includes(q);
        const matchPhone = log.phone?.toLowerCase().includes(q);
        const matchRoom = log.room?.toLowerCase().includes(q);
        const matchComment = log.feedback?.comment?.toLowerCase().includes(q);
        const matchTags = log.feedback?.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchRoom && !matchComment && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedFilterTab, customDate, todayStr, yesterdayStr, currentMonthStr, typeFilter, statusFilter, searchQuery]);

  // Set of booking IDs that have already checked in
  const checkedInBookingIds = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(log => {
      if (log.bookingId) set.add(log.bookingId);
    });
    return set;
  }, [logs]);

  // Available bookings strictly for the selected check-in date:
  // - Matches newDate (e.g. today or selected date)
  // - Not cancelled
  // - Not clean / archived
  // - NOT already checked in
  // - Sorted chronologically by time ascending
  const availableDayBookings = useMemo(() => {
    return allBookings
      .filter(b => {
        if (b.status === 'cancelled') return false;
        if (b.receptionStatus === 'clean') return false;
        if (isBookingArchived(b)) return false;
        if (checkedInBookingIds.has(b.id)) return false;

        const bDate = b.dateTime.split('T')[0];
        return bDate === newDate;
      })
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [allBookings, newDate, checkedInBookingIds]);

  // Daily / Filtered statistics
  const stats = useMemo(() => {
    const list = filteredLogs;
    const totalEntries = list.length;
    const totalGuests = list.reduce((sum, item) => sum + (item.guestsCount || 0), 0);
    const bookingEntries = list.filter(item => item.type === 'booking').length;
    const walkinEntries = list.filter(item => item.type === 'walkin').length;
    const diningEntries = list.filter(item => getEffectiveStatus(item) === 'dining').length;
    const leftEntries = list.filter(item => getEffectiveStatus(item) === 'left').length;

    const feedbackList = list.filter(item => item.feedback && item.feedback.rating && item.feedback.rating !== 'none');
    const satisfiedCount = feedbackList.filter(item => item.feedback?.rating === 'very_satisfied' || item.feedback?.rating === 'satisfied').length;
    const satisfactionRate = feedbackList.length > 0 ? Math.round((satisfiedCount / feedbackList.length) * 100) : 100;

    const bookingPercent = totalEntries > 0 ? Math.round((bookingEntries / totalEntries) * 100) : 0;
    const walkinPercent = totalEntries > 0 ? Math.round((walkinEntries / totalEntries) * 100) : 0;
    const diningPercent = totalEntries > 0 ? Math.round((diningEntries / totalEntries) * 100) : 0;
    const leftPercent = totalEntries > 0 ? Math.round((leftEntries / totalEntries) * 100) : 0;

    return {
      totalEntries,
      totalGuests,
      bookingEntries,
      walkinEntries,
      diningEntries,
      leftEntries,
      bookingPercent,
      walkinPercent,
      diningPercent,
      leftPercent,
      feedbackCount: feedbackList.length,
      satisfactionRate
    };
  }, [filteredLogs]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setNewType('walkin');
    setSelectedBookingId('');
    setNewCustomerName('');
    setNewPhone('');
    setNewGuestsCount(2);
    setNewRoom('');
    setNewDate(todayStr);
    setNewTime(format(new Date(), 'HH:mm'));
    setNewNotes('');
    setIsAddOpen(true);
  };

  // Handle auto-populate from available booking
  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    if (!bookingId) return;
    const b = allBookings.find(item => item.id === bookingId);
    if (b) {
      setNewCustomerName(b.customerName.replace(/\[(VIP|SVIP)\]/g, '').trim());
      setNewPhone(b.phone || '');
      setNewGuestsCount(b.guestsCount || 2);
      setNewRoom(b.room === 'Chưa chọn' ? '' : b.room);
      const [d, t] = b.dateTime.split('T');
      if (d) setNewDate(d);
      if (t) setNewTime(t.substring(0, 5));
    }
  };

  // Submit Add Customer
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      alert('Vui lòng nhập tên khách hàng!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addReceptionEntryAction({
        date: newDate,
        time: newTime,
        type: newType,
        bookingId: newType === 'booking' && selectedBookingId ? selectedBookingId : undefined,
        customerName: newCustomerName.trim(),
        phone: newPhone.trim(),
        guestsCount: Number(newGuestsCount) || 1,
        room: newRoom.trim() || 'Sảnh chung',
        status: 'dining',
        notes: newNotes.trim()
      });

      if (res.entry) {
        setLogs(prev => [res.entry, ...prev]);
        setIsAddOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi thêm khách mới!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open feedback modal
  const handleOpenFeedback = (entry: ReceptionEntry) => {
    setSelectedEntryForFeedback(entry);
    setFeedbackRating(entry.feedback?.rating || 'very_satisfied');
    setFeedbackComment(entry.feedback?.comment || '');
    setSelectedTags(entry.feedback?.tags || []);
    setIsFeedbackOpen(true);
  };

  // Submit feedback
  const handleSubmitFeedback = async () => {
    if (!selectedEntryForFeedback) return;
    setIsSubmitting(true);
    try {
      const feedbackPayload: ReceptionFeedback = {
        rating: feedbackRating,
        comment: feedbackComment.trim(),
        tags: selectedTags,
        submittedAt: new Date().toISOString()
      };

      await updateReceptionFeedbackAction(selectedEntryForFeedback.id, feedbackPayload);

      setLogs(prev => prev.map(item => {
        if (item.id === selectedEntryForFeedback.id) {
          return {
            ...item,
            status: 'left',
            feedback: feedbackPayload,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      }));

      setIsFeedbackOpen(false);
      setSelectedEntryForFeedback(null);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi lưu feedback!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa lượt đón khách của "${name}"?`)) return;
    try {
      await deleteReceptionEntryAction(id);
      setLogs(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi xóa!');
    }
  };

  // Toggle tag in feedback form
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredLogs.map((item, idx) => {
        let ratingText = 'Chưa có';
        if (item.feedback?.rating === 'very_satisfied') ratingText = 'Rất hài lòng (5★)';
        else if (item.feedback?.rating === 'satisfied') ratingText = 'Hài lòng (4★)';
        else if (item.feedback?.rating === 'neutral') ratingText = 'Bình thường (3★)';
        else if (item.feedback?.rating === 'unsatisfied') ratingText = 'Cần cải thiện (2★)';

        return {
          'STT': idx + 1,
          'Ngày': item.date,
          'Giờ đón': item.time,
          'Loại khách': item.type === 'booking' ? 'Khách Đặt Bàn (Booking)' : 'Khách Vãng Lai',
          'Tên khách hàng': item.customerName,
          'Số điện thoại': item.phone || '',
          'Số lượng khách': item.guestsCount,
          'Phòng / Bàn': item.room || '',
          'Trạng thái': getEffectiveStatus(item) === 'dining' ? 'Đang dùng bữa' : 'Đã ra về',
          'Đánh giá Feedback': ratingText,
          'Ý kiến / Góp ý': item.feedback?.comment || '',
          'Tag đánh giá': (item.feedback?.tags || []).join(', '),
          'Ghi chú đón khách': item.notes || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-fit column widths
      worksheet['!cols'] = [
        { wch: 6 },  // STT
        { wch: 12 }, // Ngày
        { wch: 10 }, // Giờ đón
        { wch: 25 }, // Loại khách
        { wch: 24 }, // Tên khách
        { wch: 15 }, // SĐT
        { wch: 14 }, // Số lượng
        { wch: 15 }, // Phòng/bàn
        { wch: 16 }, // Trạng thái
        { wch: 20 }, // Đánh giá
        { wch: 35 }, // Ý kiến
        { wch: 30 }, // Tag
        { wch: 25 }, // Ghi chú
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'LeTan_MayRestaurant');

      const filterTitle = customDate
        ? `Ngay_${customDate}`
        : selectedFilterTab === 'month'
        ? `Thang_${currentMonthStr}`
        : selectedFilterTab === 'yesterday'
        ? `Ngay_${yesterdayStr}`
        : selectedFilterTab === 'today'
        ? `Ngay_${todayStr}`
        : 'TatCa';

      const fileName = `BaoCao_LeTan_MayRestaurant_${filterTitle}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi xuất file Excel!');
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Header & Primary Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Lễ Tân</h1>
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs">
              Mây Restaurant
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đón khách, theo dõi tỉ lệ khách vào ra & ghi nhận góp ý khách hàng
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <Link href="/floor-plan">
            <Button
              variant="outline"
              size="sm"
              className="h-10 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              <LayoutGrid className="w-4 h-4 mr-1.5 text-slate-500" />
              Sơ Đồ Bàn
            </Button>
          </Link>

          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            className="h-10 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Xuất Excel
          </Button>

          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-100"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            + Đón Khách
          </Button>
        </div>
      </div>

      {/* 2. Compact Smart Dashboard Metrics (Mobile Optimized) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Tổng lượt đón */}
        <Card className="border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Lượt Đón</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.totalEntries}</span>
              <span className="text-xs text-slate-500 font-medium">lượt ({stats.totalGuests} khách)</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {selectedFilterTab === 'today' ? 'Trong ngày hôm nay' : selectedFilterTab === 'month' ? 'Tháng này' : 'Thời gian đã chọn'}
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Booking vs Vãng lai */}
        <Card className="border-blue-100 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Booking / Vãng Lai</span>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-xs font-semibold">
              <span className="text-blue-900 font-bold">{stats.bookingEntries} Booking ({stats.bookingPercent}%)</span>
              <span className="text-emerald-700 font-bold">{stats.walkinEntries} Vãng lai</span>
            </div>
            {/* Visual ratio bar */}
            <div className="mt-2 w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${stats.bookingPercent}%` }}
                title={`Booking: ${stats.bookingPercent}%`}
              />
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${stats.walkinPercent}%` }}
                title={`Vãng lai: ${stats.walkinPercent}%`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Tỉ lệ Vào / Ra */}
        <Card className="border-amber-100 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Tỉ Lệ Vào / Ra</span>
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-xs font-semibold">
              <span className="text-amber-800 font-bold flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                {stats.diningEntries} Đang ăn
              </span>
              <span className="text-slate-600 font-bold">{stats.leftEntries} Đã ra về</span>
            </div>
            {/* Visual ratio bar */}
            <div className="mt-2 w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${stats.diningPercent}%` }}
                title={`Đang dùng bữa: ${stats.diningPercent}%`}
              />
              <div
                className="h-full bg-slate-400 transition-all duration-300"
                style={{ width: `${stats.leftPercent}%` }}
                title={`Đã về: ${stats.leftPercent}%`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Tỉ lệ hài lòng & Feedback */}
        <Card className="border-emerald-100 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Mức Độ Hài Lòng</span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Star className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">{stats.satisfactionRate}%</span>
              <span className="text-xs text-slate-500 font-medium">({stats.feedbackCount} lượt góp ý)</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-700/80 font-medium">
              Khách đánh giá hài lòng / rất hài lòng
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filters Bar (Optimized for Mobile Touch) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs sm:text-sm">
          <button
            onClick={() => { setSelectedFilterTab('today'); setCustomDate(''); }}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              selectedFilterTab === 'today' && !customDate
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hôm Nay
          </button>
          <button
            onClick={() => { setSelectedFilterTab('yesterday'); setCustomDate(''); }}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              selectedFilterTab === 'yesterday' && !customDate
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hôm Qua
          </button>
          <button
            onClick={() => { setSelectedFilterTab('month'); setCustomDate(''); }}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              selectedFilterTab === 'month' && !customDate
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tháng Này ({format(new Date(), 'MM/yyyy')})
          </button>
          <button
            onClick={() => { setSelectedFilterTab('all'); setCustomDate(''); }}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              selectedFilterTab === 'all' && !customDate
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất Cả
          </button>

          {/* Date Picker for arbitrary day */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <span className="text-xs text-slate-400 hidden sm:inline">Chọn ngày:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {customDate && (
              <button
                onClick={() => setCustomDate('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
                title="Bỏ chọn ngày"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Search & Sub-filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, SĐT, số bàn, ý kiến..."
              className="pl-9 h-9 text-xs sm:text-sm bg-slate-50/70 border-slate-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3 flex items-center gap-1">
            <span className="text-xs text-slate-400 shrink-0">Loại:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full h-9 text-xs bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Tất cả loại khách</option>
              <option value="booking">Khách Booking</option>
              <option value="walkin">Khách Vãng Lai</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-1">
            <span className="text-xs text-slate-400 shrink-0">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full h-9 text-xs bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="dining">🟢 Đang dùng bữa</option>
              <option value="left">⚪ Đã ra về</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Customer Visit Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs sm:text-sm font-bold text-slate-700">
            Danh Sách Đón Khách ({filteredLogs.length})
          </span>
          <span className="text-xs text-slate-400">
            Hiển thị mới nhất lên đầu
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-700">Chưa có lượt đón khách nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nhấn nút "+ Đón Khách" để ghi nhận thông tin khách mới vào nhà hàng.
            </p>
            <Button onClick={handleOpenAdd} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              + Đón Khách Mới
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLogs.map((entry) => {
              const isDining = getEffectiveStatus(entry) === 'dining';
              const hasFeedback = entry.feedback && entry.feedback.rating && entry.feedback.rating !== 'none';

              return (
                <div
                  key={entry.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs transition-all relative ${
                    isDining
                      ? 'border-amber-300 ring-1 ring-amber-200/50 hover:border-amber-400'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Room & Type & Time */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-800 text-white font-black text-xs px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Home className="w-3 h-3 text-orange-400" />
                        {entry.room || 'Sảnh chung'}
                      </span>

                      {entry.type === 'booking' ? (
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-[11px] font-semibold text-white">
                          Booking
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[11px] font-semibold text-white">
                          Vãng lai
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{entry.time}</span>
                      <span className="text-slate-300">|</span>
                      <span>{entry.date}</span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="flex items-start justify-between gap-2 mt-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                        {entry.customerName}
                      </h3>
                      {entry.phone ? (
                        <a
                          href={`tel:${entry.phone}`}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3 text-blue-500" />
                          {entry.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Không có SĐT</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-bold">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{entry.guestsCount} khách</span>
                    </div>
                  </div>

                  {/* Notes if any */}
                  {entry.notes && (
                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Ghi chú:</span> {entry.notes}
                    </div>
                  )}

                  {/* Status Indicator */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isDining ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          Đang dùng bữa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          Đã ra về
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteEntry(entry.id, entry.customerName)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100"
                        title="Xóa lượt đón này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Action or Feedback Section */}
                  <div className="mt-3">
                    {isDining ? (
                      <Button
                        onClick={() => handleOpenFeedback(entry)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-9 text-xs sm:text-sm shadow-xs"
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Khách Ra Về & Xin Feedback
                      </Button>
                    ) : (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {entry.feedback?.rating === 'very_satisfied' && (
                              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                <span>🤩</span> Rất hài lòng
                              </span>
                            )}
                            {entry.feedback?.rating === 'satisfied' && (
                              <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                <span>😊</span> Hài lòng
                              </span>
                            )}
                            {entry.feedback?.rating === 'neutral' && (
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <span>😐</span> Bình thường
                              </span>
                            )}
                            {entry.feedback?.rating === 'unsatisfied' && (
                              <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                                <span>🙁</span> Cần cải thiện
                              </span>
                            )}
                            {(!entry.feedback?.rating || entry.feedback?.rating === 'none') && (
                              <span className="text-xs text-slate-400 italic">Chưa có feedback</span>
                            )}
                          </div>

                          <button
                            onClick={() => handleOpenFeedback(entry)}
                            className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                          >
                            <Edit className="w-3 h-3" />
                            {hasFeedback ? 'Sửa góp ý' : '+ Thêm góp ý'}
                          </button>
                        </div>

                        {/* Comment & Tags preview */}
                        {entry.feedback?.comment && (
                          <p className="text-xs text-slate-600 mt-1 italic">
                            &ldquo;{entry.feedback.comment}&rdquo;
                          </p>
                        )}
                        {entry.feedback?.tags && entry.feedback.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {entry.feedback.tags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="bg-white border border-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Dialog: Add New Customer Visit */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-orange-600" />
              Đón Khách Vào Nhà Hàng
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nhập thông tin bàn hoặc phòng đón tiếp khách tại nhà hàng
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-4 mt-2">
            {/* Customer Type Toggle */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Loại Khách Đến</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setNewType('walkin');
                    setSelectedBookingId('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                    newType === 'walkin'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🚶 Khách Vãng Lai
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('booking')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                    newType === 'booking'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  📅 Khách Đặt Bàn (Booking)
                </button>
              </div>
            </div>

            {/* Date & Time (placed before or alongside booking selector so user can pick date) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Ngày Đón</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    setSelectedBookingId(''); // reset selection when date changes
                  }}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Giờ Vào</Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            {/* If Booking: ONLY show bookings on newDate, ordered chronologically, excluding already checked-in */}
            {newType === 'booking' && (
              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-blue-900">
                    Chọn Tiệc Đã Đặt Trong Ngày ({availableDayBookings.length} tiệc chưa đón):
                  </Label>
                  <span className="text-[10px] text-blue-600 font-medium">Theo giờ tiệc</span>
                </div>

                <select
                  value={selectedBookingId}
                  onChange={(e) => handleSelectBooking(e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-blue-300 rounded-md px-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                >
                  {availableDayBookings.length === 0 ? (
                    <option value="">
                      -- Không có tiệc đặt nào chưa đón trong ngày {newDate} --
                    </option>
                  ) : (
                    <>
                      <option value="">-- Bấm để chọn tiệc đặt ({availableDayBookings.length} tiệc) --</option>
                      {availableDayBookings.map((b) => {
                        const timeStr = b.dateTime.includes('T') ? b.dateTime.split('T')[1].substring(0, 5) : '';
                        const cleanName = b.customerName.replace(/\[(VIP|SVIP)\]/g, '').trim();
                        const isVip = b.customerName.includes('[VIP]') || b.customerName.includes('[SVIP]');
                        return (
                          <option key={b.id} value={b.id}>
                            ⏰ {timeStr} | {b.room} - {isVip ? '⭐ ' : ''}{cleanName} ({b.guestsCount} khách)
                          </option>
                        );
                      })}
                    </>
                  )}
                </select>

                <p className="text-[10px] text-blue-600/80">
                  * Tự động điền thông tin và ẩn khỏi danh sách sau khi đón xong để không bị trùng lặp.
                </p>
              </div>
            )}

            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Tên Khách Hàng *</Label>
                <Input
                  required
                  placeholder="Ví dụ: Anh Nam, Chị Hương..."
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="h-9 text-xs sm:text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Số Điện Thoại</Label>
                <Input
                  type="tel"
                  placeholder="09..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-9 text-xs sm:text-sm mt-1"
                />
              </div>
            </div>

            {/* Room/Table & Guest count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Phòng / Bàn *</Label>
                <Input
                  required
                  placeholder="Ví dụ: Mây 101, Bàn 06..."
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  className="h-9 text-xs sm:text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Số Lượng Khách *</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number"
                    min="1"
                    required
                    value={newGuestsCount}
                    onChange={(e) => setNewGuestsCount(Number(e.target.value))}
                    className="h-9 text-xs sm:text-sm"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[2, 4, 6, 10].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setNewGuestsCount(num)}
                        className={`h-9 px-2 text-xs rounded border ${
                          newGuestsCount === num
                            ? 'bg-slate-800 text-white border-slate-800 font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Ghi Chú Đón Khách</Label>
              <Textarea
                placeholder="Yêu cầu ghế em bé, bàn gần cửa sổ, ăn kiêng..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                className="text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="h-9 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold"
              >
                {isSubmitting ? 'Đang lưu...' : 'Xác Nhận Đón Khách'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Dialog: Customer Feedback & Departure */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="max-w-md p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Xin Cảm Nhận Khách Hàng (Feedback)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Khách:{' '}
              <span className="font-bold text-slate-700">
                {selectedEntryForFeedback?.customerName}
              </span>{' '}
              ({selectedEntryForFeedback?.room})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Rating Buttons */}
            <div>
              <Label className="text-xs font-bold text-slate-700">
                Mức Độ Hài Lòng Của Khách:
              </Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setFeedbackRating('very_satisfied')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    feedbackRating === 'very_satisfied'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-2xl">🤩</span>
                  <div>
                    <div className="text-xs font-bold">Rất Hài Lòng</div>
                    <div className="text-[10px] text-slate-500">Khen ngợi, tuyệt vời</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackRating('satisfied')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    feedbackRating === 'satisfied'
                      ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-2xl">😊</span>
                  <div>
                    <div className="text-xs font-bold">Hài Lòng</div>
                    <div className="text-[10px] text-slate-500">Vừa miệng, ổn định</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackRating('neutral')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    feedbackRating === 'neutral'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-2xl">😐</span>
                  <div>
                    <div className="text-xs font-bold">Bình Thường</div>
                    <div className="text-[10px] text-slate-500">Chưa có gì nổi bật</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackRating('unsatisfied')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    feedbackRating === 'unsatisfied'
                      ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-2xl">🙁</span>
                  <div>
                    <div className="text-xs font-bold">Cần Cải Thiện</div>
                    <div className="text-[10px] text-slate-500">Khách phàn nàn/góp ý</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Tag Pills */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Điểm Nổi Bật / Cần Chú Ý:</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        isSelected
                          ? 'bg-slate-800 text-white border-slate-800 font-bold'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail Quote / Comment */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Góp Ý Cụ Thể Của Khách:</Label>
              <Textarea
                rows={3}
                placeholder="Nhập cảm nhận khách chia sẻ (vd: Khách khen lẩu cá tầm ngon, mong muốn lần sau có bàn ngoài trời view đẹp...)"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFeedbackOpen(false)}
                className="h-9 text-xs"
              >
                Đóng
              </Button>
              <Button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={isSubmitting}
                className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu Feedback & Đánh Dấu Đã Về'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
