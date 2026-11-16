'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NavbarAuth from '@/components/NavbarAuth';
import { Sparkles, BarChart3, MessageSquare, BellRing } from 'lucide-react';

export default function AppNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const allNavLinks = [
    { href: '/', label: 'Lễ Tân', icon: BellRing },
    { href: '/bookings', label: 'Danh sách Đặt bàn' },
    { href: '/floor-plan', label: 'Sơ đồ bàn' },
    { href: '/kitchen', label: 'Bếp' },
    { href: '/floor', label: 'Sảnh' },
    { href: '/party-menu', label: 'Menu Tiệc' },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/cms', label: 'CMS Thưởng', highlight: true, icon: Sparkles },
    { href: '/nv/chat', label: 'Chat VIP', icon: MessageSquare },
    { href: '/archive', label: 'Lưu Trữ' },
  ];

  let navLinks: typeof allNavLinks = [];

  if (user?.role === 'admin') {
    // 1. Admin: Xem full toàn bộ 10 module, full tính năng
    navLinks = allNavLinks;
  } else if (user?.role === 'supervisor') {
    // 2. Giám sát: Không xem được Dashboard báo cáo, Lịch sử lưu trữ tiệc
    navLinks = allNavLinks.filter(
      (link) => link.href !== '/dashboard' && link.href !== '/archive'
    );
  } else if (user?.role === 'receptionist') {
    // 3. Lễ tân: Không xem được Dashboard báo cáo, Lịch sử lưu trữ tiệc, CMS thưởng và đối soát
    navLinks = allNavLinks.filter(
      (link) => link.href !== '/dashboard' && link.href !== '/archive' && link.href !== '/cms'
    );
  } else if (user?.role === 'sale') {
    // 4. Sale Mây: Xem tất cả các module NGOẠI TRỪ Dashboard báo cáo
    navLinks = allNavLinks.filter((link) => link.href !== '/dashboard');
  } else if (user?.role === 'staff') {
    // 5. Nhân viên: Chỉ truy cập duy nhất module Chat VIP
    navLinks = allNavLinks.filter((link) => link.href === '/nv/chat');
  }

  return (
    <nav className="flex gap-1.5 sm:gap-2.5 md:gap-3 text-xs sm:text-sm font-medium text-slate-600 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1 justify-start py-2 items-center">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        if (link.highlight) {
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{link.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-2 py-1 rounded-md transition-colors shrink-0 flex items-center gap-1 ${
              isActive
                ? 'text-orange-600 font-bold bg-orange-50 ring-1 ring-orange-200'
                : 'hover:text-orange-600 hover:bg-slate-50'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
            <span>{link.label}</span>
          </Link>
        );
      })}
      <div className="ml-auto shrink-0 pl-1">
        <NavbarAuth />
      </div>
    </nav>
  );
}
