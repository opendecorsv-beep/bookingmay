'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AutoRefresh({ interval = 90000 }: { interval?: number }) {
  const router = useRouter();
  const lastRefreshRef = useRef(Date.now());

  useEffect(() => {
    // 1. Chỉ refresh khi tab ĐANG MỞ & ĐANG XEM (tránh tốn Disk IO & Băng thông ngầm khi ẩn tab/tắt máy)
    const handleVisibilityChange = () => {
      if (!document.hidden && Date.now() - lastRefreshRef.current > 20000) {
        lastRefreshRef.current = Date.now();
        router.refresh();
      }
    };

    // 2. Tự động đồng bộ ngay khi người dùng bấm quay lại tab (Focus)
    const handleFocus = () => {
      if (Date.now() - lastRefreshRef.current > 20000) {
        lastRefreshRef.current = Date.now();
        router.refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. Supabase Realtime WebSocket: Chỉ gọi router.refresh() KHI CÓ DỮ LIỆU ĐỔI TRÊN SUPABASE
    // Không dùng polling mù, tiết kiệm 100% Disk IOPS và Băng thông Fast Origin Transfer của Vercel
    const channel = supabase
      .channel('app-global-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          // Bỏ qua thay đổi tin nhắn chat vì Chat đã có cơ chế realtime riêng
          if ((payload.new as any)?.id === 'CONFIG_CHAT_MESSAGES') return;

          const now = Date.now();
          // Throttling: Giới hạn tối thiểu 3 giây giữa các lần refresh
          if (now - lastRefreshRef.current > 3000) {
            lastRefreshRef.current = now;
            router.refresh();
          }
        }
      )
      .subscribe();

    // 4. Polling dự phòng siêu nhẹ (90 giây) và CHỈ CHẠY khi màn hình đang được mở xem
    const timer = setInterval(() => {
      if (!document.hidden && Date.now() - lastRefreshRef.current > 60000) {
        lastRefreshRef.current = Date.now();
        router.refresh();
      }
    }, interval);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [router, interval]);

  return null;
}

