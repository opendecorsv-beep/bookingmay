'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Moon, Zap } from 'lucide-react';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút không tương tác -> Bật chế độ ngủ (Sleep Mode)
const MIN_REFRESH_INTERVAL_MS = 4000; // Throttling: Tối thiểu 4 giây giữa các lần refresh

export default function AutoRefresh({ interval = 120000 }: { interval?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false);
  isIdleRef.current = isIdle;

  const lastRefreshRef = useRef(Date.now());
  const pendingRefreshRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Kích hoạt refresh với throttling & kiểm tra tab hiển thị
  const triggerRefresh = useCallback(() => {
    if (document.hidden || isIdleRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    const now = Date.now();
    if (now - lastRefreshRef.current > MIN_REFRESH_INTERVAL_MS) {
      lastRefreshRef.current = now;
      pendingRefreshRef.current = false;
      router.refresh();
    }
  }, [router]);

  // Đánh thức ứng dụng từ chế độ ngủ
  const wakeUp = useCallback(() => {
    setIsIdle(false);
    isIdleRef.current = false;
    lastRefreshRef.current = Date.now();
    pendingRefreshRef.current = false;
    router.refresh();
    resetIdleTimer();
  }, [router]);

  // Đặt lại đồng hồ đếm ngược khi có tương tác
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isIdleRef.current) {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        isIdleRef.current = true;
      }, IDLE_TIMEOUT_MS);
    }
  }, []);

  useEffect(() => {
    // 1. Lắng nghe các thao tác của người dùng để tính thời gian rảnh (Idle)
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      if (!isIdleRef.current) {
        resetIdleTimer();
      }
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    resetIdleTimer();

    // 2. Xử lý khi người dùng ẩn/hiện tab (Visibility & Focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetIdleTimer();
        if (pendingRefreshRef.current || (Date.now() - lastRefreshRef.current > 30000)) {
          lastRefreshRef.current = Date.now();
          pendingRefreshRef.current = false;
          router.refresh();
        }
      }
    };

    const handleFocus = () => {
      if (!isIdleRef.current && (pendingRefreshRef.current || (Date.now() - lastRefreshRef.current > 30000))) {
        lastRefreshRef.current = Date.now();
        pendingRefreshRef.current = false;
        router.refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. Supabase Realtime WebSocket với bộ lọc thông minh theo từng trang (Smart Scoping)
    const channel = supabase
      .channel('app-global-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          if (isIdleRef.current) return;

          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          const rowId = (newRow?.id || oldRow?.id || '') as string;
          const currentPath = pathnameRef.current || '/';

          // A. Chat messages đã có kênh realtime riêng biệt -> Bỏ qua
          if (rowId === 'CONFIG_CHAT_MESSAGES' || rowId === 'CONFIG_AI') return;

          // B. Nhật ký Lễ tân -> Chỉ tải lại khi đang ở trang Lễ Tân (/) hoặc Sơ đồ bàn (/floor-plan)
          if (rowId === 'CONFIG_RECEPTION') {
            if (currentPath === '/' || currentPath === '/floor-plan') {
              triggerRefresh();
            }
            return;
          }

          // C. Hoa hồng nhân viên (CMS) -> Chỉ tải lại khi đang ở trang CMS hoặc NV
          if (rowId === 'CONFIG_CMS') {
            if (currentPath.startsWith('/cms') || currentPath.startsWith('/nv')) {
              triggerRefresh();
            }
            return;
          }

          // D. Tồn kho Hải sản -> Chỉ tải lại khi đang ở trang Hải sản
          if (rowId === 'CONFIG_SEAFOOD') {
            if (currentPath === '/seafood') {
              triggerRefresh();
            }
            return;
          }

          // E. Menu tiệc -> Chỉ tải lại khi đang ở trang Menu tiệc
          if (rowId === 'CONFIG_PARTY_MENUS') {
            if (currentPath === '/party-menu') {
              triggerRefresh();
            }
            return;
          }

          // F. Bản ghi Đặt bàn thực tế (MAY-...) -> Ảnh hưởng các trang đặt bàn, bếp, sảnh, sơ đồ, lưu trữ
          const isBookingPage = currentPath === '/' || 
                                currentPath === '/bookings' || 
                                currentPath === '/floor' || 
                                currentPath === '/kitchen' || 
                                currentPath === '/floor-plan' || 
                                currentPath === '/archive' || 
                                currentPath === '/dashboard';
          if (isBookingPage) {
            triggerRefresh();
          }
        }
      )
      .subscribe();

    // 4. Kênh Broadcast cứu hộ: Cho phép Admin/Quản lý ra lệnh toàn bộ máy nhân viên tải lại trang ngay lập tức
    const controlChannel = supabase
      .channel('system-control')
      .on('broadcast', { event: 'force-reload' }, () => {
        window.location.reload();
      })
      .subscribe();

    // 5. Polling dự phòng siêu nhẹ (120 giây) - CHỈ CHẠY khi tab đang mở & người dùng không ngủ
    const timer = setInterval(() => {
      if (!document.hidden && !isIdleRef.current && (Date.now() - lastRefreshRef.current > 90000)) {
        triggerRefresh();
      }
    }, interval);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      clearInterval(timer);
      supabase.removeChannel(channel);
      supabase.removeChannel(controlChannel);
    };
  }, [router, interval, resetIdleTimer, triggerRefresh]);

  if (!isIdle) return null;

  return (
    <div
      onClick={wakeUp}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300 select-none cursor-pointer"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          wakeUp();
        }}
        className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <Moon className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Hệ Thống Đang Tạm Nghỉ
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Ứng dụng đã tự động ngắt kết nối ngầm sau 10 phút không có thao tác để tiết kiệm pin thiết bị và bảo vệ đường truyền mạng.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={wakeUp}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Chạm để tiếp tục làm việc</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          (Bấm vào bất kỳ đâu trên màn hình để đánh thức)
        </p>
      </div>
    </div>
  );
}
