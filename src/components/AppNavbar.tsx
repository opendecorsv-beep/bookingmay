'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NavbarAuth from '@/components/NavbarAuth';
import { Sparkles, BarChart3, MessageSquare } from 'lucide-react';

export default function AppNavbar() {
  const pathname = usePathname();
  const { isStaffOnly } = useAuth();

  const navLinks = [
    { href: '/', label: 'Lễ Tân' },
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

  if (isStaffOnly) {
    return (
      <nav className="flex gap-2 text-sm font-medium text-slate-600 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1 justify-start md:justify-end py-2 items-center">
        <Link 
          href="/nv" 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold shadow-sm hover:bg-amber-600 transition-all shrink-0 text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          <span>CMS Thưởng</span>
        </Link>
        <Link 
          href="/nv/chat" 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 transition-all shrink-0 text-xs"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-200" />
          <span>Chat VIP</span>
        </Link>
        <NavbarAuth />
      </nav>
    );
  }


  return (
    <nav className="flex gap-2 sm:gap-4 md:gap-5 text-sm font-medium text-slate-600 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1 justify-start md:justify-end py-2 items-center">
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
                ? 'text-orange-600 font-bold bg-orange-50'
                : 'hover:text-orange-600 hover:bg-slate-50'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{link.label}</span>
          </Link>
        );
      })}
      <NavbarAuth />
    </nav>
  );
}
