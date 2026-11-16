'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { loginAction } from '@/app/actions';
import { 
  ShieldAlert, 
  ArrowRight, 
  BellRing, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  Lock, 
  LogIn, 
  AlertCircle, 
  Crown, 
  UserCheck, 
  Sparkles,
  BarChart3,
  Archive,
  Briefcase,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StaffAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();

  // Login form state when user is not authenticated
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --------------------------------------------------------------------------
  // 1. CHƯA ĐĂNG NHẬP: BẮT BUỘC ĐĂNG NHẬP TRƯỚC KHI XEM BẤT KỲ GIAO DIỆN NÀO
  // --------------------------------------------------------------------------
  if (!isLoggedIn || !user) {
    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMessage('');

      try {
        const res = await loginAction(username, password);
        if (res?.error) {
          setErrorMessage(res.error);
        } else if (res?.user) {
          // Điều hướng đúng theo phân quyền tài khoản:
          if (res.user.role === 'staff') {
            window.location.href = '/nv/chat';
          } else if (res.user.role === 'receptionist') {
            if (
              pathname.startsWith('/dashboard') ||
              pathname.startsWith('/archive') ||
              pathname.startsWith('/cms') ||
              pathname === '/nv' ||
              pathname === '/nhanvien'
            ) {
              window.location.href = '/';
            } else {
              window.location.reload();
            }
          } else if (res.user.role === 'supervisor') {
            if (pathname.startsWith('/dashboard') || pathname.startsWith('/archive')) {
              window.location.href = '/';
            } else {
              window.location.reload();
            }
          } else {
            window.location.reload();
          }
        } else {
          window.location.reload();
        }
      } catch (err: any) {
        setErrorMessage('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại!');
      } finally {
        setIsLoading(false);
      }
    };

    const handleSelectSampleAccount = (accUser: string, accPass: string) => {
      setUsername(accUser);
      setPassword(accPass);
      setErrorMessage('');
    };

    return (
      <div className="min-h-[75vh] flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 text-white text-center relative">
            <div className="w-16 h-16 mx-auto relative rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-lg mb-3">
              <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" priority />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-amber-300">MÂY RESTAURANT BMT</h1>
            <p className="text-xs text-slate-300 font-medium mt-1">Hệ Thống Quản Lý Tiệc & Vận Hành Nhà Hàng</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-semibold mt-3">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Yêu Cầu Đăng Nhập Hệ Thống</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-5">
            {errorMessage && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="guard-username" className="text-xs font-bold text-slate-700">
                  Tên đăng nhập (Username)
                </Label>
                <Input
                  id="guard-username"
                  type="text"
                  placeholder="maybmt / gshuy / salemay / nhiletan / nhanvien..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 text-sm focus:border-amber-500 focus:ring-amber-500"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guard-password" className="text-xs font-bold text-slate-700">
                  Mật khẩu (Password)
                </Label>
                <div className="relative">
                  <Input
                    id="guard-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 text-sm pr-10 focus:border-amber-500 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Đăng Nhập Vào Hệ Thống</span>
                  </>
                )}
              </Button>
            </form>

            {/* Quick role selection guide */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Danh sách tài khoản trực ca
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectSampleAccount('maybmt', '1122334455')}
                  className="p-2 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-left transition-all"
                >
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>Quản Lý Mây</span>
                  </div>
                  <div className="text-[10px] text-amber-700 font-mono mt-0.5">maybmt (Full quyền)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSampleAccount('gshuy', 'huy135')}
                  className="p-2 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-left transition-all"
                >
                  <div className="font-bold text-blue-900 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Giám Sát Ca</span>
                  </div>
                  <div className="text-[10px] text-blue-700 font-mono mt-0.5">gshuy / gsmai / gstien</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSampleAccount('salemay', 'salebooking2026')}
                  className="p-2 rounded-lg border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-left transition-all"
                >
                  <div className="font-bold text-teal-900 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                    <span>Sale Mây</span>
                  </div>
                  <div className="text-[10px] text-teal-700 font-mono mt-0.5">salemay (Thêm/Sửa tiệc)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSampleAccount('nhiletan', 'maybmt2026')}
                  className="p-2 rounded-lg border border-orange-200 bg-orange-50/60 hover:bg-orange-100 text-left transition-all"
                >
                  <div className="font-bold text-orange-900 flex items-center gap-1">
                    <BellRing className="w-3.5 h-3.5 text-orange-600" />
                    <span>Lễ Tân Đón Bàn</span>
                  </div>
                  <div className="text-[10px] text-orange-700 font-mono mt-0.5">nhiletan / nhuletan</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSampleAccount('nhanvien', 'may2026')}
                  className="p-2 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-left transition-all col-span-2 sm:col-span-1"
                >
                  <div className="font-bold text-indigo-900 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Nhân Viên (Phục Vụ)</span>
                  </div>
                  <div className="text-[10px] text-indigo-700 font-mono mt-0.5">nhanvien (Chat VIP)</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. NHÂN VIÊN (staff): CHỈ TRUY CẬP DUY NHẤT MODULE CHAT VIP (/nv/chat)
  // --------------------------------------------------------------------------
  if (user.role === 'staff' && pathname !== '/nv/chat') {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-indigo-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Tài khoản <strong>{user.name}</strong> (Nhân Viên) chỉ có quyền truy cập duy nhất vào module <strong>Chat VIP Trực Ca</strong> để phối hợp gọi món và hỗ trợ cùng Bếp & Thu Ngân.
        </p>
        <div className="pt-2">
          <Button 
            onClick={() => router.push('/nv/chat')} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Vào Chat VIP Trực Ca</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 3. LỄ TÂN (receptionist): KHÔNG XEM ĐƯỢC DASHBOARD, LƯU TRỮ, CMS THƯỞNG
  // --------------------------------------------------------------------------
  if (
    user.role === 'receptionist' &&
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/archive') ||
      pathname.startsWith('/cms') ||
      pathname === '/nv' ||
      pathname === '/nhanvien')
  ) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-rose-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-rose-100 text-rose-700 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Tài khoản <strong>{user.name}</strong> (Lễ Tân) không có quyền xem <strong>Dashboard báo cáo</strong>, <strong>Lịch sử lưu trữ tiệc</strong>, hoặc <strong>CMS thưởng & đối soát</strong>.
        </p>
        <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button 
            onClick={() => router.push('/')} 
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-md"
          >
            <BellRing className="w-4 h-4" />
            <span>Về Module Lễ Tân</span>
          </Button>
          <Button 
            onClick={() => router.push('/floor-plan')} 
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl"
          >
            <MapPin className="w-4 h-4 text-orange-600" />
            <span>Về Sơ Đồ Bàn</span>
          </Button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 4. GIÁM SÁT (supervisor): KHÔNG XEM ĐƯỢC DASHBOARD VÀ LỊCH SỬ LƯU TRỮ TIỆC
  // --------------------------------------------------------------------------
  if (
    user.role === 'supervisor' &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/archive'))
  ) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-blue-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Tài khoản <strong>{user.name}</strong> (Giám Sát) không có quyền truy cập <strong>Dashboard báo cáo</strong> và <strong>Lịch sử lưu trữ tiệc</strong>. Phân hệ này dành riêng cho Quản Lý (Admin).
        </p>
        <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button 
            onClick={() => router.push('/')} 
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-md"
          >
            <BellRing className="w-4 h-4" />
            <span>Về Module Lễ Tân</span>
          </Button>
          <Button 
            onClick={() => router.push('/bookings')} 
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Về Danh Sách Đặt Bàn</span>
          </Button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 5. SALE MÂY (sale): CHỈ BỊ CHẶN XEM DASHBOARD BÁO CÁO
  // --------------------------------------------------------------------------
  if (user.role === 'sale' && pathname.startsWith('/dashboard')) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-teal-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-teal-100 text-teal-700 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Tài khoản <strong>{user.name}</strong> (Sale Mây) không có quyền xem <strong>Dashboard báo cáo</strong>. Bạn có toàn quyền thêm tiệc, điều chỉnh tiệc và sử dụng các phân hệ vận hành khác.
        </p>
        <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button 
            onClick={() => router.push('/bookings')} 
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-md"
          >
            <Calendar className="w-4 h-4" />
            <span>Về Danh Sách Đặt Bàn</span>
          </Button>
          <Button 
            onClick={() => router.push('/')} 
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl"
          >
            <BellRing className="w-4 h-4 text-teal-600" />
            <span>Về Module Lễ Tân</span>
          </Button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 6. QUẢN LÝ (admin) & CÁC TRANG HỢP LỆ: CHO PHÉP HIỂN THỊ
  // --------------------------------------------------------------------------
  return <>{children}</>;
}
