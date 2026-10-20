'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  CommissionEntry, 
  CMS_STANDARD_PRODUCTS, 
  CMS_WINE_PRODUCTS, 
  AuthUser 
} from '@/lib/data';
import { loginAction } from '@/app/actions';
import { getVietnamTodayString } from '@/lib/bookingUtils';
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  Flame, 
  Search, 
  CheckCircle2, 
  Wine, 
  Fish, 
  Lock, 
  LogIn, 
  AlertCircle, 
  ShieldCheck, 
  TrendingUp, 
  Percent, 
  User, 
  FileText,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NvClientProps {
  initialCommissions: CommissionEntry[];
  initialUser: AuthUser | null;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export default function NvClient({ initialCommissions, initialUser }: NvClientProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(initialUser);
  const [commissions] = useState<CommissionEntry[]>(initialCommissions);
  const [filter, setFilter] = useState<TimeFilter>('month');
  const [searchQuery, setSearchQuery] = useState('');

  // Login Form State
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const todayStr = useMemo(() => getVietnamTodayString(), []);
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);
  const currentMonthPrefix = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Handle staff login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await loginAction(loginId, loginPass);
      if (res?.error) {
        setLoginError(res.error);
      } else if (res?.user) {
        setCurrentUser(res.user);
        window.location.reload();
      }
    } catch (err) {
      setLoginError('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại!');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Filter commissions by time & search
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

  const top1 = staffLeaderboard[0] || null;
  const top2 = staffLeaderboard[1] || null;
  const top3 = staffLeaderboard[2] || null;

  // IF NOT LOGGED IN: Render ONLY the Dedicated Staff Login Card
  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-6 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-amber-200/90 shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="relative w-16 h-16 mx-auto overflow-hidden rounded-2xl border border-amber-200 shadow-md">
              <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                CỔNG NHÂN VIÊN MÂY RESTAURANT
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                Đăng Nhập Tra Cứu CMS
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Vui lòng đăng nhập để xem Bảng vinh danh Upsell và Hoa hồng thưởng bán hàng cá nhân
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="nv-username" className="text-xs font-semibold text-slate-700">Tài khoản (ID)</Label>
              <Input
                id="nv-username"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="nhanvien"
                className="h-11 rounded-xl text-sm"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nv-password" className="text-xs font-semibold text-slate-700">Mật khẩu</Label>
              <Input
                id="nv-password"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="h-11 rounded-xl text-sm"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoggingIn ? 'Đang xác thực...' : 'Đăng Nhập Cổng Nhân Viên'}</span>
            </Button>
          </form>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 text-center">
            🔒 Đường dẫn dành riêng cho nhân viên Mây BMT. Mọi thắc mắc về tài khoản xin vui lòng liên hệ Giám sát ca trực.
          </div>
        </div>
      </div>
    );
  }

  // IF LOGGED IN: Render Full Staff CMS Dashboard
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-800">
                Bảng Vinh Danh Upsell & Hoa Hồng (CMS)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Xin chào <strong>{currentUser.name}</strong>! Chúc bạn ca làm việc vui vẻ và đạt chỉ tiêu thưởng cao nhất! 🔥
              </p>
            </div>
          </div>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 self-start sm:self-center">
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

      {/* Hero Spotlight: Top 1 Upseller + Podium */}
      {top1 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Top 1 Spotlight */}
          <div className="lg:col-span-7 relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 text-white shadow-xl border-2 border-yellow-200/80 flex flex-col justify-between group">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-300/40 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-600/30 rounded-full blur-2xl pointer-events-none" />

            <div>
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

            <div className="mt-6 pt-5 border-t border-white/25 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-yellow-100">
                  Tổng Tiền Thưởng Hoa Hồng Nhận Được
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                  +{top1.totalReward.toLocaleString('vi-VN')} <span className="text-xl sm:text-2xl font-bold">đ</span>
                </div>
              </div>

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

          {/* Top 2 & Top 3 Cards */}
          <div className="lg:col-span-5 flex flex-col gap-4 justify-between">
            {/* Top 2 Silver */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden flex-1 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0 font-bold text-slate-700 shadow-inner">
                  🥈
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Á Quân #2</span>
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

            {/* Top 3 Bronze */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden flex-1 hover:border-amber-200 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-xl shrink-0 font-bold text-amber-800 shadow-inner">
                  🥉
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-amber-600">Hạng Ba #3</span>
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

            {/* Quick Incentive Tip */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Thứ 2 - Thứ 5: <strong>2% Bill</strong> | Thứ 6 - CN: <strong>1% Bill</strong></span>
              </div>
              <span className="font-bold text-amber-700 shrink-0">Cá bơn / Hùm Úc / Alaska: +100k</span>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Chưa có lượt thưởng nào trong khoảng thời gian đã chọn</p>
        </div>
      )}

      {/* Leaderboard Table & Live Updates Feed */}
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
                  <p className="text-[11px] text-slate-400">Tra cứu nhanh vị trí và số tiền hoa hồng đạt được</p>
                </div>
              </div>

              {/* Search input for staff */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên bạn để tra cứu..."
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-2">Hạng</th>
                    <th className="py-2.5 px-2">Nhân Viên</th>
                    <th className="py-2.5 px-2 text-center">Lượt</th>
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
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Nhật Ký Ghi Nhận CMS Thực Tế</h3>
                  <p className="text-[11px] text-slate-400">Hiển thị nguồn Giám sát cập nhật theo thời gian thực</p>
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
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{c.createdByName} + CMS cho {c.staffName}</span>
                    </div>
                  </div>

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
            <span>Dữ liệu được cập nhật trực tiếp bởi Giám sát ca trực</span>
          </div>
        </div>

      </div>

      {/* Policy Reference Cheat Sheet */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Chính Sách & Quy Định Hoa Hồng (CMS) Chuẩn Mây BMT</h3>
              <p className="text-[11px] text-slate-400">Khung mức thưởng áp dụng cho toàn thể nhân viên nhà hàng</p>
            </div>
          </div>
          <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
            Ban Quản Trị
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Box 1 */}
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

          {/* Box 2 */}
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

          {/* Box 3 */}
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
    </div>
  );
}
