'use client';

import React, { useState, useMemo } from 'react';
import { 
  CommissionEntry, 
  CMS_STANDARD_PRODUCTS, 
  CMS_WINE_PRODUCTS, 
  AuthUser,
  RESTAURANT_STAFF_LIST,
  RestaurantStaff
} from '@/lib/data';
import { 
  addStaffCommissionAction, 
  deleteStaffCommissionAction,
  clearAllStaffCommissionsAction 
} from '@/app/actions';
import { getVietnamTodayString } from '@/lib/bookingUtils';
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  Flame, 
  Plus, 
  Calendar, 
  Clock, 
  Search, 
  Trash2, 
  UserCheck, 
  CheckCircle2, 
  Wine, 
  Fish, 
  DollarSign, 
  Info, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  Percent,
  X,
  Users,
  Phone,
  RotateCcw,
  Camera,
  Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReceiptScannerModal from '@/components/ReceiptScannerModal';

interface CmsClientProps {
  initialCommissions: CommissionEntry[];
  initialUser: AuthUser | null;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export default function CmsClient({ initialCommissions, initialUser }: CmsClientProps) {
  const [commissions, setCommissions] = useState<CommissionEntry[]>(initialCommissions);
  const [filter, setFilter] = useState<TimeFilter>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<string | null>(null);

  // View Tab State
  const [activeTab, setActiveTab] = useState<'bxh' | 'staff'>('bxh');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Grouped Staff by Role for Select / Quick Access
  const groupedStaffRoles = useMemo(() => {
    const roleOrder = [
      "Phục vụ",
      "Captain",
      "Thu ngân",
      "Lễ tân",
      "CSKH",
      "Nhân viên bếp",
      "Giám sát",
      "Nhân viên"
    ];
    return roleOrder.map(role => ({
      role,
      staff: RESTAURANT_STAFF_LIST.filter(s => s.role === role)
    })).filter(g => g.staff.length > 0);
  }, []);

  // Staff Directory Filter & Stats
  const filteredStaffList = useMemo(() => {
    let list = [...RESTAURANT_STAFF_LIST];
    if (selectedRoleFilter) {
      list = list.filter(s => s.role.includes(selectedRoleFilter));
    }
    if (staffSearchQuery.trim()) {
      const q = staffSearchQuery.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.role.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedRoleFilter, staffSearchQuery]);

  const staffStatsMap = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    commissions.forEach(c => {
      const name = c.staffName.trim();
      if (!name) return;
      if (!map[name]) map[name] = { count: 0, total: 0 };
      map[name].count += 1;
      map[name].total += c.totalReward;
    });
    return map;
  }, [commissions]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form Fields
  const todayStr = useMemo(() => getVietnamTodayString(), []);
  const [formDate, setFormDate] = useState(todayStr);
  const [formTime, setFormTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formStaffName, setFormStaffName] = useState('');
  const [formCategory, setFormCategory] = useState<CommissionEntry['category']>('product');
  const [formProductId, setFormProductId] = useState(CMS_STANDARD_PRODUCTS[0].id);
  const [formWineId, setFormWineId] = useState(CMS_WINE_PRODUCTS[0].id);
  const [formQuantity, setFormQuantity] = useState(1);
  const [formBillAmount, setFormBillAmount] = useState<number | ''>(5000000);
  const [formBillPercent, setFormBillPercent] = useState<number>(2);
  const [formCustomName, setFormCustomName] = useState('');
  const [formCustomReward, setFormCustomReward] = useState<number | ''>(100000);
  const [formTableOrRoom, setFormTableOrRoom] = useState('Mây 104');
  const [formNote, setFormNote] = useState('');

  // Receipt Scanner Modal States
  const [isReceiptScanOpen, setIsReceiptScanOpen] = useState(false);
  const [formBillFoodAmount, setFormBillFoodAmount] = useState<number | undefined>(undefined);
  const [formBillExcludedAmount, setFormBillExcludedAmount] = useState<number | undefined>(undefined);
  const [formBillItemsSummary, setFormBillItemsSummary] = useState<string>('');
  const [formBillImageUrl, setFormBillImageUrl] = useState<string | undefined>(undefined);

  // Viewing Audit Receipt Modal
  const [viewingReceiptEntry, setViewingReceiptEntry] = useState<CommissionEntry | null>(null);

  // Check role permissions
  const canEdit = initialUser?.role === 'admin' || initialUser?.role === 'supervisor';

  // 7 days ago
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);
  const currentMonthPrefix = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Auto set % bill based on date day-of-week
  const updateDayOfWeekPercent = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDay(); // 0 is Sun, 1 is Mon, 2 is Tue, ... 4 is Thu, 5 is Fri, 6 is Sat
      if (day >= 1 && day <= 4) {
        setFormBillPercent(2); // Thứ 2 -> Thứ 5: 2%
      } else {
        setFormBillPercent(1); // Thứ 6, 7, CN: 1%
      }
    } catch (e) {
      setFormBillPercent(2);
    }
  };

  // Filter commissions by time
  const filteredCommissions = useMemo(() => {
    let list = [...commissions];
    if (filter === 'today') {
      list = list.filter(c => c.date === todayStr);
    } else if (filter === 'week') {
      list = list.filter(c => c.date >= sevenDaysAgoStr);
    } else if (filter === 'month') {
      list = list.filter(c => c.date.startsWith(currentMonthPrefix));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.staffName.toLowerCase().includes(q) ||
        (c.productName && c.productName.toLowerCase().includes(q)) ||
        (c.tableOrRoom && c.tableOrRoom.toLowerCase().includes(q))
      );
    }

    return list;
  }, [commissions, filter, todayStr, sevenDaysAgoStr, currentMonthPrefix, searchQuery]);

  // Aggregate by staff
  const staffLeaderboard = useMemo(() => {
    const map: Record<string, {
      staffName: string;
      totalReward: number;
      productReward: number;
      wineReward: number;
      billReward: number;
      customReward: number;
      upsellCount: number;
      recentDate: string;
      items: CommissionEntry[];
    }> = {};

    filteredCommissions.forEach(c => {
      const name = c.staffName.trim();
      if (!name) return;

      if (!map[name]) {
        map[name] = {
          staffName: name,
          totalReward: 0,
          productReward: 0,
          wineReward: 0,
          billReward: 0,
          customReward: 0,
          upsellCount: 0,
          recentDate: c.date,
          items: []
        };
      }

      map[name].totalReward += c.totalReward;
      map[name].upsellCount += 1;
      map[name].items.push(c);
      if (c.date > map[name].recentDate) {
        map[name].recentDate = c.date;
      }

      if (c.category === 'product') map[name].productReward += c.totalReward;
      else if (c.category === 'wine') map[name].wineReward += c.totalReward;
      else if (c.category === 'booking_bill') map[name].billReward += c.totalReward;
      else map[name].customReward += c.totalReward;
    });

    return Object.values(map).sort((a, b) => b.totalReward - a.totalReward);
  }, [filteredCommissions]);

  // Top 1, Top 2, Top 3
  const top1 = staffLeaderboard[0] || null;
  const top2 = staffLeaderboard[1] || null;
  const top3 = staffLeaderboard[2] || null;

  // Handle Create Commission
  const handleOpenModal = () => {
    setModalError('');
    const now = new Date();
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setFormDate(todayStr);
    setFormTime(curTime);
    updateDayOfWeekPercent(todayStr);
    setFormBillFoodAmount(undefined);
    setFormBillExcludedAmount(undefined);
    setFormBillItemsSummary('');
    setFormBillImageUrl(undefined);
    setIsModalOpen(true);
  };

  const handleApplyReceiptResult = (data: {
    billFoodAmount: number;
    billAmount: number;
    billPercent: number;
    billExcludedAmount: number;
    billItemsSummary: string;
    billImageUrl?: string;
    tableName?: string;
  }) => {
    setFormCategory('booking_bill');
    setFormBillAmount(data.billFoodAmount);
    setFormBillPercent(data.billPercent);
    setFormBillFoodAmount(data.billFoodAmount);
    setFormBillExcludedAmount(data.billExcludedAmount);
    setFormBillItemsSummary(data.billItemsSummary);
    if (data.billImageUrl) setFormBillImageUrl(data.billImageUrl);
    if (data.tableName) setFormTableOrRoom(data.tableName);
    if (data.billItemsSummary) {
      setFormNote(`[Bill ${data.billAmount.toLocaleString('vi-VN')} đ | Đồ ăn: ${data.billFoodAmount.toLocaleString('vi-VN')} đ | Trừ: ${data.billExcludedAmount.toLocaleString('vi-VN')} đ]`);
    }
  };

  const calculateModalReward = () => {
    if (formCategory === 'product') {
      const p = CMS_STANDARD_PRODUCTS.find(x => x.id === formProductId);
      return (p ? p.reward : 100000) * formQuantity;
    }
    if (formCategory === 'wine') {
      const w = CMS_WINE_PRODUCTS.find(x => x.id === formWineId);
      return (w ? w.reward : 150000) * formQuantity;
    }
    if (formCategory === 'booking_bill') {
      const bill = typeof formBillAmount === 'number' ? formBillAmount : 0;
      return Math.round((bill * formBillPercent) / 100);
    }
    if (formCategory === 'custom') {
      return typeof formCustomReward === 'number' ? formCustomReward : 0;
    }
    return 0;
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStaffName.trim()) {
      setModalError('Vui lòng nhập hoặc chọn tên nhân viên!');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      let prodName = '';
      let unitReward = 0;
      const totalReward = calculateModalReward();

      if (formCategory === 'product') {
        const p = CMS_STANDARD_PRODUCTS.find(x => x.id === formProductId);
        prodName = p ? p.name : 'Sản phẩm';
        unitReward = p ? p.reward : 100000;
      } else if (formCategory === 'wine') {
        const w = CMS_WINE_PRODUCTS.find(x => x.id === formWineId);
        prodName = w ? w.name : 'Rượu vang';
        unitReward = w ? w.reward : 150000;
      } else if (formCategory === 'booking_bill') {
        prodName = `Thưởng Bill Booking (${formBillPercent}%)`;
        unitReward = totalReward;
      } else {
        prodName = formCustomName.trim() || 'Thưởng nóng / Khác';
        unitReward = totalReward;
      }

      const res = await addStaffCommissionAction({
        date: formDate,
        time: formTime,
        staffName: formStaffName.trim(),
        category: formCategory,
        productName: prodName,
        unitPriceOrReward: unitReward,
        quantity: formQuantity,
        billAmount: formCategory === 'booking_bill' ? (typeof formBillAmount === 'number' ? formBillAmount : undefined) : undefined,
        billPercent: formCategory === 'booking_bill' ? formBillPercent : undefined,
        billFoodAmount: formCategory === 'booking_bill' ? formBillFoodAmount : undefined,
        billExcludedAmount: formCategory === 'booking_bill' ? formBillExcludedAmount : undefined,
        billItemsSummary: formCategory === 'booking_bill' ? formBillItemsSummary : undefined,
        billImageUrl: formCategory === 'booking_bill' ? formBillImageUrl : undefined,
        totalReward,
        tableOrRoom: formTableOrRoom.trim() || undefined,
        note: formNote.trim() || undefined,
      });

      if (res?.error) {
        setModalError(res.error);
      } else if (res?.entry) {
        setCommissions(prev => [res.entry!, ...prev]);
        setIsModalOpen(false);
      }
    } catch (err) {
      setModalError('Lỗi khi lưu CMS thưởng. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, staffName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa lượt thưởng này của nhân viên "${staffName}" không?`)) {
      return;
    }

    const res = await deleteStaffCommissionAction(id);
    if (res?.success) {
      setCommissions(prev => prev.filter(c => c.id !== id));
    } else {
      alert(res?.error || 'Không thể xóa lượt thưởng');
    }
  };

  const handleOpenModalForStaff = (staffName: string) => {
    setFormStaffName(staffName);
    handleOpenModal();
  };

  const handleClearAll = async () => {
    if (!confirm("Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu CMS đang có để làm mới hoàn toàn không?")) {
      return;
    }
    const res = await clearAllStaffCommissionsAction();
    if (res?.success) {
      setCommissions([]);
      alert("Đã xóa toàn bộ dữ liệu CMS thành công. Bây giờ bạn có thể bắt đầu ghi nhận các dữ liệu hoa hồng thực tế!");
    } else {
      alert(res?.error || "Lỗi khi xóa dữ liệu CMS");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              CMS Thưởng Bán Hàng & Upsell Nhân Viên
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Bảng vinh danh, tính thưởng sản phẩm cao cấp (Hải sản, Thịt bò, Vang) và hoa hồng % Bill cho nhân viên
          </p>
        </div>

        {/* Action Button & Time Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {canEdit && (
            <Button
              onClick={handleOpenModal}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi Nhận CMS Mới</span>
            </Button>
          )}

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'today' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setFilter('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'week' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setFilter('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'month' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs between Leaderboard & Staff Directory */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('bxh')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'bxh'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-200" />
            <span>Bảng Vinh Danh &amp; Nhật Ký CMS</span>
            {commissions.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'bxh' ? 'bg-amber-800 text-amber-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {commissions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'staff'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 text-amber-200" />
            <span>Đội Ngũ Nhân Sự Nhà Hàng ({RESTAURANT_STAFF_LIST.length})</span>
          </button>
        </div>

        {/* Clear All / Reset Button for Supervisor / Admin */}
        {canEdit && commissions.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5 h-8 shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Toàn Bộ CMS</span>
          </Button>
        )}
      </div>

      {activeTab === 'staff' ? (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                Danh Sách Nhân Sự Nhà Hàng ({filteredStaffList.length} / {RESTAURANT_STAFF_LIST.length} người)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhấn nút &quot;+ Thưởng CMS&quot; ở từng nhân sự để ghi nhận hoa hồng hoặc lọc theo từng bộ phận
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Tìm tên, SĐT, chức vụ..."
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Department Role Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1">Bộ phận:</span>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter(null)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                !selectedRoleFilter ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({RESTAURANT_STAFF_LIST.length})
            </button>
            {groupedStaffRoles.map(({ role, staff }) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRoleFilter(role === selectedRoleFilter ? null : role)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedRoleFilter === role ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role} ({staff.length})
              </button>
            ))}
          </div>

          {/* Personnel Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-3">Họ Và Tên</th>
                  <th className="py-3 px-3">Chức Vụ</th>
                  <th className="py-3 px-3">Số Điện Thoại</th>
                  <th className="py-3 px-3 text-center">Lượt CMS</th>
                  <th className="py-3 px-3 text-right">Tổng Thưởng CMS</th>
                  {canEdit && <th className="py-3 px-3 text-center w-32">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaffList.map((s) => {
                  const stat = staffStatsMap[s.name] || { count: 0, total: 0 };
                  const roleBadgeClass = 
                    s.role === 'Giám sát' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    s.role === 'Captain' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                    s.role === 'Thu ngân' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    s.role === 'Lễ tân' ? 'bg-pink-100 text-pink-800 border-pink-200' :
                    s.role === 'CSKH' ? 'bg-cyan-100 text-cyan-800 border-cyan-200' :
                    s.role === 'Nhân viên bếp' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    'bg-amber-100 text-amber-800 border-amber-200';

                  return (
                    <tr key={s.stt} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-bold">
                        {s.stt}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm">
                          {s.name}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${roleBadgeClass}`}>
                          {s.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {s.phone ? (
                          <a href={`tel:${s.phone}`} className="hover:underline flex items-center gap-1 font-medium text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {s.phone}
                          </a>
                        ) : (
                          <span className="text-slate-300 italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {stat.count > 0 ? (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[11px]">
                            {stat.count} lượt
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {stat.total > 0 ? (
                          <span className="font-black text-amber-700 text-xs sm:text-sm">
                            +{stat.total.toLocaleString('vi-VN')} đ
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-3 px-3 text-center">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenModalForStaff(s.name)}
                            className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs px-2.5 rounded-lg flex items-center gap-1 mx-auto"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thưởng CMS</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredStaffList.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="text-center py-8 text-slate-400 italic">
                      Không tìm thấy nhân viên nào phù hợp với bộ lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Spotlight: Top 1 Upseller + Top 2 & 3 Podium */}
      {top1 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Top 1 Spotlight - Prominently Displayed with Glowing Effects */}
          <div className="lg:col-span-7 relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 text-white shadow-xl border-2 border-yellow-200/80 flex flex-col justify-between group">
            {/* Ambient Animated Glow & Shine */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-300/40 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-600/30 rounded-full blur-2xl pointer-events-none" />

            <div>
              {/* Badge & Crown Header */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/30 text-xs font-bold uppercase tracking-wider text-yellow-100 shadow-inner">
                  <Crown className="w-4 h-4 text-yellow-300 animate-bounce" />
                  <span>Quán Quân Upsell {filter === 'today' ? 'Hôm Nay' : filter === 'week' ? 'Tuần Này' : filter === 'month' ? 'Tháng Này' : 'Toàn Bộ'}</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md">
                  <Flame className="w-3.5 h-3.5 text-yellow-200" />
                  <span>Top #1 Bảng Vàng</span>
                </div>
              </div>

              {/* Staff Main Info */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/60 flex items-center justify-center text-3xl sm:text-4xl shadow-lg ring-4 ring-yellow-300/40">
                    👑
                  </div>
                  <span className="absolute -bottom-2 -right-1 bg-yellow-300 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                    #1
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                    {top1.staffName}
                  </h2>
                  <p className="text-xs sm:text-sm text-yellow-100/90 font-medium mt-0.5">
                    Đã thực hiện <strong>{top1.upsellCount} lượt upsell</strong> thành công
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] bg-black/20 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      Phục vụ: Mây Restaurant
                    </span>
                    <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      Gần nhất: {top1.recentDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Reward Highlight */}
            <div className="mt-6 pt-5 border-t border-white/25 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-yellow-100">
                  Tổng Tiền Thưởng Hoa Hồng Nhận Được
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                  +{top1.totalReward.toLocaleString('vi-VN')} <span className="text-xl sm:text-2xl font-bold">đ</span>
                </div>
              </div>

              {/* Breakdown Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                {top1.productReward > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-xs border border-white/20">
                    Hải sản/Bò: +{top1.productReward.toLocaleString('vi-VN')} đ
                  </span>
                )}
                {top1.wineReward > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-xs border border-white/20">
                    Vang: +{top1.wineReward.toLocaleString('vi-VN')} đ
                  </span>
                )}
                {top1.billReward > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-xs border border-white/20">
                    % Bill: +{top1.billReward.toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top 2 & Top 3 Cards (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 justify-between">
            {/* Top 2 Silver Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden flex-1 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0 font-bold text-slate-700 shadow-inner">
                  🥈
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Á Quân #2</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base truncate">
                    {top2 ? top2.staffName : 'Chưa có dữ liệu'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {top2 ? `${top2.upsellCount} lượt upsell` : 'Đang chờ cập nhật'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base sm:text-lg font-black text-slate-800">
                  {top2 ? `+${top2.totalReward.toLocaleString('vi-VN')} đ` : '0 đ'}
                </div>
                {top2 && (
                  <span className="text-[10px] text-slate-400">
                    {Math.round((top2.totalReward / (top1.totalReward || 1)) * 100)}% so với Top 1
                  </span>
                )}
              </div>
            </div>

            {/* Top 3 Bronze Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden flex-1 hover:border-amber-200 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-xl shrink-0 font-bold text-amber-800 shadow-inner">
                  🥉
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-amber-600">Hạng Ba #3</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base truncate">
                    {top3 ? top3.staffName : 'Chưa có dữ liệu'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {top3 ? `${top3.upsellCount} lượt upsell` : 'Đang chờ cập nhật'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base sm:text-lg font-black text-amber-800">
                  {top3 ? `+${top3.totalReward.toLocaleString('vi-VN')} đ` : '0 đ'}
                </div>
                {top3 && (
                  <span className="text-[10px] text-amber-600">
                    {Math.round((top3.totalReward / (top1.totalReward || 1)) * 100)}% so với Top 1
                  </span>
                )}
              </div>
            </div>

            {/* Quick Policy Banner */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Thứ 2 - Thứ 5: <strong>2% Bill</strong> | Thứ 6 - CN: <strong>1% Bill</strong></span>
              </div>
              <span className="font-bold text-amber-700 shrink-0">Cá bơn / Hùm Úc / Alaska: 100k</span>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Chưa có dữ liệu hoa hồng trong khoảng thời gian đã chọn</p>
          <p className="text-xs text-slate-400">Giám sát có thể bấm nút "Ghi Nhận CMS Mới" để bắt đầu ghi nhận thưởng cho nhân viên</p>
        </div>
      )}

      {/* Grid: Full Leaderboard Table (7 cols) + Live Commission Log Feed (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Full Leaderboard Table */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-yellow-50 text-yellow-700 rounded-lg">
                  <Trophy className="w-4 h-4 text-amber-600" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Bảng Xếp Hạng Toàn Đội Ngũ</h3>
                  <p className="text-[11px] text-slate-400">Danh sách nhân viên đạt hoa hồng và lượt bán</p>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên nhân viên..."
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-2">Hạng</th>
                    <th className="py-2.5 px-2">Nhân Viên</th>
                    <th className="py-2.5 px-2 text-center">Số Lượt</th>
                    <th className="py-2.5 px-2 text-right">Hải Sản/Bò</th>
                    <th className="py-2.5 px-2 text-right">Vang / % Bill</th>
                    <th className="py-2.5 px-2 text-right">Tổng Thưởng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffLeaderboard.map((item, idx) => (
                    <tr 
                      key={item.staffName} 
                      className={`hover:bg-amber-50/40 transition-colors ${
                        idx === 0 ? 'bg-amber-50/20 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-amber-400 text-white shadow-xs' :
                          idx === 1 ? 'bg-slate-300 text-slate-800' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{item.staffName}</span>
                          {idx === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-400">Gần nhất: {item.recentDate}</div>
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-slate-700">
                        {item.upsellCount}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 font-medium">
                        {item.productReward > 0 ? `+${item.productReward.toLocaleString('vi-VN')} đ` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 font-medium">
                        {(item.wineReward + item.billReward) > 0 ? `+${(item.wineReward + item.billReward).toLocaleString('vi-VN')} đ` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-black text-amber-700 text-sm">
                        +{item.totalReward.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                  {staffLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                        Không tìm thấy nhân viên nào phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tổng nhân sự nhận thưởng: <strong>{staffLeaderboard.length} bạn</strong></span>
            <span>Tổng chi thưởng kỳ này: <strong className="text-amber-700">
              +{staffLeaderboard.reduce((sum, s) => sum + s.totalReward, 0).toLocaleString('vi-VN')} đ
            </strong></span>
          </div>
        </div>

        {/* Live Feed: Source Attribution Log */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <UserCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Nhật Ký Cập Nhật CMS</h3>
                  <p className="text-[11px] text-slate-400">Hiển thị chính xác Giám sát ghi nhận theo thời gian thực</p>
                </div>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-semibold">
                {filteredCommissions.length} mục
              </span>
            </div>

            <div className="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {filteredCommissions.slice(0, 15).map(c => (
                <div 
                  key={c.id} 
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs hover:border-amber-300 transition-all space-y-1.5"
                >
                  {/* Supervisor Attribution Line */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{c.createdByName} + CMS cho {c.staffName}</span>
                    </div>
                    {canEdit && (
                      <button 
                        onClick={() => handleDelete(c.id, c.staffName)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                        title="Xóa lượt thưởng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Reward Detail */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{c.productName}</span>
                      {c.quantity > 1 && (
                        <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">
                          x{c.quantity}
                        </span>
                      )}
                      {c.tableOrRoom && (
                        <span className="text-slate-400 text-[11px]">({c.tableOrRoom})</span>
                      )}
                    </div>
                    <span className="font-extrabold text-amber-700 text-sm">
                      +{c.totalReward.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {/* Scanned Bill Breakdown Button if available */}
                  {c.billFoodAmount && (
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setViewingReceiptEntry(c)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>Xem bill bóc tách: {c.billFoodAmount.toLocaleString('vi-VN')} đ đồ ăn</span>
                      </button>
                    </div>
                  )}

                  {/* Note & Timestamp */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-200/50">
                    <span className="truncate max-w-[210px] italic">{c.note || 'Không có ghi chú'}</span>
                    <span>vào {c.time} ngày {c.date}</span>
                  </div>
                </div>
              ))}

              {filteredCommissions.length === 0 && (
                <div className="text-center py-10 text-slate-400 italic">
                  Chưa có lượt ghi nhận CMS nào trong kỳ này
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Giám sát chịu trách nhiệm tính chính xác của dữ liệu ghi nhận</span>
          </div>
        </div>

      </div>
        </>
      )}

      {/* Commission Policy / Cheat Sheet Card (Full Width) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Chính Sách & Quy Định Hoa Hồng (CMS) Chuẩn Mây BMT</h3>
              <p className="text-[11px] text-slate-400">Khung thưởng áp dụng theo quy định của nhà hàng</p>
            </div>
          </div>
          <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
            Ban Quản Trị
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Box 1: Hải Sản & Thịt Bò */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm text-blue-700">
              <Fish className="w-4 h-4" />
              <span>Hải Sản & Thịt Bò Cao Cấp</span>
            </div>
            <div className="space-y-1 text-slate-600">
              <div className="flex justify-between"><span>• Cá bơn / Mú đỏ:</span><strong className="text-amber-700">100.000 đ/con</strong></div>
              <div className="flex justify-between"><span>• Mú ni:</span><strong className="text-amber-700">30.000 đ/con</strong></div>
              <div className="flex justify-between"><span>• Hùm Úc / Alaska / Cua hoàng đế:</span><strong className="text-amber-700">100.000 đ/con</strong></div>
              <div className="flex justify-between"><span>• Hùm bông:</span><strong className="text-amber-700">50.000 đ/con</strong></div>
              <div className="flex justify-between"><span>• Tomahawk / Wagyu:</span><strong className="text-amber-700">50.000 đ/phần</strong></div>
              <div className="flex justify-between"><span>• Ốc nữ hoàng / Vòi voi:</span><strong className="text-amber-700">50.000 đ/con</strong></div>
            </div>
          </div>

          {/* Box 2: Rượu Vang */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm text-purple-700">
              <Wine className="w-4 h-4" />
              <span>Rượu Vang Thượng Hạng</span>
            </div>
            <div className="space-y-2 text-slate-600">
              <div className="p-2 bg-white rounded-lg border border-purple-100 flex justify-between items-center">
                <span>Vang &gt; 3.000.000 đ/chai</span>
                <strong className="text-purple-700 font-bold">+150.000 đ/chai</strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-purple-100 flex justify-between items-center">
                <span>Vang ≤ 3.000.000 đ/chai</span>
                <strong className="text-purple-700 font-bold">+100.000 đ/chai</strong>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Áp dụng cho tất cả các dòng rượu vang nhập khẩu tại nhà hàng khi nhân viên tư vấn thành công.
              </p>
            </div>
          </div>

          {/* Box 3: Thưởng % Bill Tiệc */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm text-emerald-700">
              <Percent className="w-4 h-4" />
              <span>Thưởng Bàn Booking Theo % Bill</span>
            </div>
            <div className="space-y-2 text-slate-600">
              <div className="p-2 bg-white rounded-lg border border-emerald-100 flex justify-between items-center">
                <span>Thứ 2, Thứ 3, Thứ 4, Thứ 5:</span>
                <strong className="text-emerald-700 font-bold">2% Tổng Bill</strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100 flex justify-between items-center">
                <span>Thứ 6, Thứ 7, Chủ Nhật:</span>
                <strong className="text-emerald-700 font-bold">1% Tổng Bill</strong>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Tỉ lệ % bill được quy đổi thẳng thành tiền mặt tương ứng để cộng vào thu nhập của nhân viên phục vụ tiệc.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Ghi Nhận CMS Mới (Dành cho Giám Sát & Quản Lý) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold">Ghi Nhận CMS / Thưởng Bán Hàng</DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 text-xs pt-1">
              Người ghi nhận hiện tại: <strong>{initialUser?.name || 'Giám Sát'} ({initialUser?.id})</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCommission} className="space-y-4 pt-2">
            {modalError && (
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 text-xs font-semibold">
                {modalError}
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cms-date" className="text-xs">Ngày ghi nhận</Label>
                <Input
                  id="cms-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => {
                    setFormDate(e.target.value);
                    updateDayOfWeekPercent(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cms-time" className="text-xs">Giờ ghi nhận</Label>
                <Input
                  id="cms-time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Staff Selection from 31 Restaurant Personnel */}
            <div className="space-y-2 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
              <div className="flex items-center justify-between">
                <Label htmlFor="cms-staff-select" className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Nhân viên nhận thưởng ({RESTAURANT_STAFF_LIST.length} nhân sự nhà hàng)
                </Label>
                {formStaffName && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                    ✓ {formStaffName}
                  </span>
                )}
              </div>

              {/* Grouped Select Dropdown */}
              <select
                id="cms-staff-select"
                value={formStaffName}
                onChange={(e) => setFormStaffName(e.target.value)}
                className="w-full text-xs sm:text-sm font-semibold rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Bấm để chọn nhân viên từ danh sách nhà hàng --</option>
                {groupedStaffRoles.map(({ role, staff }) => (
                  <optgroup key={role} label={`Nhóm ${role} (${staff.length} người)`}>
                    {staff.map(s => (
                      <option key={s.stt} value={s.name}>
                        {s.name} ({s.role}{s.phone ? ` - ${s.phone}` : ''})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Quick Search / Type Input */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5">
                  <Input
                    id="cms-staff"
                    type="text"
                    value={formStaffName}
                    onChange={(e) => setFormStaffName(e.target.value)}
                    placeholder="Hoặc gõ tìm/nhập tên nhân viên..."
                    className="h-9 text-xs sm:text-sm bg-white border-amber-200 focus-visible:ring-amber-400"
                    required
                  />
                  {formStaffName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormStaffName('')}
                      className="h-9 px-2 text-xs text-slate-400 hover:text-slate-600 shrink-0"
                    >
                      Xóa
                    </Button>
                  )}
                </div>

                {/* Role Filter Chips */}
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-500 font-medium">Chọn nhanh theo bộ phận:</span>
                  {["Phục vụ", "Thu ngân", "Lễ tân", "Captain", "CSKH", "Nhân viên bếp", "Giám sát"].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRoleFilter(role === selectedRoleFilter ? null : role)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                        selectedRoleFilter === role 
                          ? 'bg-amber-600 text-white shadow-2xs' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                {/* Filtered Staff Quick-Pick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto p-1.5 bg-white/90 rounded-lg border border-slate-200">
                  {(selectedRoleFilter 
                    ? RESTAURANT_STAFF_LIST.filter(s => s.role.includes(selectedRoleFilter))
                    : RESTAURANT_STAFF_LIST.slice(0, 10)
                  ).map(s => (
                    <button
                      key={s.stt}
                      type="button"
                      onClick={() => setFormStaffName(s.name)}
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-all flex items-center gap-1 ${
                        formStaffName === s.name
                          ? 'bg-amber-600 text-white font-bold shadow-2xs'
                          : 'bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700'
                      }`}
                    >
                      <span>{s.name}</span>
                      <span className="text-[9px] opacity-70">({s.role})</span>
                    </button>
                  ))}
                  {!selectedRoleFilter && (
                    <span className="text-[10px] text-slate-400 italic">
                      (Bấm lọc bộ phận bên trên để xem đầy đủ các bạn)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="space-y-1.5">
              <Label className="text-xs">Hình thức thưởng</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormCategory('product')}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                    formCategory === 'product'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Hải Sản / Bò
                </button>
                <button
                  type="button"
                  onClick={() => setFormCategory('wine')}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                    formCategory === 'wine'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Rượu Vang
                </button>
                <button
                  type="button"
                  onClick={() => setFormCategory('booking_bill')}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                    formCategory === 'booking_bill'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  % Bill Booking
                </button>
                <button
                  type="button"
                  onClick={() => setFormCategory('custom')}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                    formCategory === 'custom'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Thưởng Nóng
                </button>
              </div>
            </div>

            {/* Category-Specific Inputs */}
            {formCategory === 'product' && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Sản phẩm bán được</Label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {CMS_STANDARD_PRODUCTS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (+{p.reward.toLocaleString('vi-VN')} đ/{p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Số lượng</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                  />
                </div>
              </div>
            )}

            {formCategory === 'wine' && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Dòng rượu vang</Label>
                  <select
                    value={formWineId}
                    onChange={(e) => setFormWineId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {CMS_WINE_PRODUCTS.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} (+{w.reward.toLocaleString('vi-VN')} đ/{w.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Số chai</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                  />
                </div>
              </div>
            )}

            {formCategory === 'booking_bill' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                {/* AI Receipt Scanner Trigger Button */}
                <Button
                  type="button"
                  onClick={() => setIsReceiptScanOpen(true)}
                  className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 border border-amber-400/40"
                >
                  <Camera className="w-4 h-4 text-amber-100" />
                  <span>Quét Ảnh Hóa Đơn AI (Chỉ tính đồ ăn)</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Tự động</span>
                </Button>

                {/* Scanned Food Summary Pill if available */}
                {formBillFoodAmount !== undefined && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-800 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Đã bóc tách đồ ăn thành công
                      </span>
                      <span>+{formBillFoodAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                    {formBillExcludedAmount !== undefined && (
                      <p className="text-[11px] text-slate-500">
                        Đã loại trừ: <strong>{formBillExcludedAmount.toLocaleString('vi-VN')} đ</strong> (Bia, Rượu, Decor, Nước, VAT)
                      </p>
                    )}
                    {formBillItemsSummary && (
                      <p className="text-[10px] text-slate-400 italic truncate">
                        Món: {formBillItemsSummary}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {formBillFoodAmount !== undefined ? 'Tiền đồ ăn tính CMS (VNĐ)' : 'Tổng tiền bill thanh toán (VNĐ)'}
                    </Label>
                    <Input
                      type="number"
                      step="50000"
                      value={formBillAmount}
                      onChange={(e) => {
                        setFormBillAmount(e.target.value === '' ? '' : parseInt(e.target.value) || 0);
                        setFormBillFoodAmount(undefined);
                      }}
                      placeholder="VD: 8000000"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tỉ lệ % tính thưởng</Label>
                    <select
                      value={formBillPercent}
                      onChange={(e) => setFormBillPercent(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={2}>Thứ 2 - Thứ 5: 2% Đồ ăn</option>
                      <option value={1}>Thứ 6, 7, CN: 1% Đồ ăn</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {formCategory === 'custom' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-xs">Lý do / Nội dung thưởng</Label>
                  <Input
                    type="text"
                    value={formCustomName}
                    onChange={(e) => setFormCustomName(e.target.value)}
                    placeholder="VD: Thưởng nóng khách khen ngợi"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Số tiền thưởng (VNĐ)</Label>
                  <Input
                    type="number"
                    step="10000"
                    value={formCustomReward}
                    onChange={(e) => setFormCustomReward(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Table / Room & Note */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cms-room" className="text-xs">Phòng / Bàn phục vụ</Label>
                <Input
                  id="cms-room"
                  type="text"
                  value={formTableOrRoom}
                  onChange={(e) => setFormTableOrRoom(e.target.value)}
                  placeholder="VD: Mây 104, Bàn 12..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cms-note" className="text-xs">Ghi chú thêm</Label>
                <Input
                  id="cms-note"
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="VD: Khách gọi thêm 1 con hấp Hồng Kông..."
                />
              </div>
            </div>

            {/* Total Reward Live Preview */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-900 font-medium">Tiền thưởng nhân viên nhận:</span>
                <div className="text-xs text-amber-700">
                  Nguồn: <strong>{initialUser?.name || 'Giám Sát'}</strong> vào {formTime} ngày {formDate}
                </div>
              </div>
              <div className="text-xl font-black text-amber-800">
                +{calculateModalReward().toLocaleString('vi-VN')} đ
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Xác Nhận & Ghi Nhận'}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScanOpen}
        onClose={() => setIsReceiptScanOpen(false)}
        defaultPercent={formBillPercent}
        onApplyResult={handleApplyReceiptResult}
      />

      {/* Audit Receipt Dialog */}
      <Dialog open={!!viewingReceiptEntry} onOpenChange={() => setViewingReceiptEntry(null)}>
        <DialogContent className="max-w-md p-5 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Chi Tiết Bóc Tách Hóa Đơn AI
            </DialogTitle>
          </DialogHeader>

          {viewingReceiptEntry && (
            <div className="space-y-3 text-xs pt-2">
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Nhân viên: {viewingReceiptEntry.staffName}</span>
                  <span className="text-amber-800">+{viewingReceiptEntry.totalReward.toLocaleString('vi-VN')} đ ({viewingReceiptEntry.billPercent}%)</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Phòng/Bàn: {viewingReceiptEntry.tableOrRoom || 'Chung'} | Ghi nhận: {viewingReceiptEntry.createdByName} lúc {viewingReceiptEntry.time} ngày {viewingReceiptEntry.date}
                </div>
              </div>

              {viewingReceiptEntry.billFoodAmount && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Đồ ăn tính CMS</span>
                    <div className="text-sm font-bold text-emerald-800 mt-0.5">
                      {viewingReceiptEntry.billFoodAmount.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-600">Đã loại trừ</span>
                    <div className="text-sm font-bold text-rose-700 mt-0.5">
                      {viewingReceiptEntry.billExcludedAmount ? `${viewingReceiptEntry.billExcludedAmount.toLocaleString('vi-VN')} đ` : 'Bia, rượu, decor, vat'}
                    </div>
                  </div>
                </div>
              )}

              {viewingReceiptEntry.billItemsSummary && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-700">Danh sách món ăn hợp lệ:</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                    {viewingReceiptEntry.billItemsSummary}
                  </p>
                </div>
              )}

              {viewingReceiptEntry.billImageUrl && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700">Ảnh chụp hóa đơn đối soát:</span>
                  <div className="relative max-h-60 overflow-hidden rounded-xl border border-slate-200">
                    <img 
                      src={viewingReceiptEntry.billImageUrl} 
                      alt="Ảnh hóa đơn đối soát" 
                      className="w-full h-auto object-contain max-h-60" 
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 text-right">
                <Button size="sm" onClick={() => setViewingReceiptEntry(null)} className="text-xs">
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
