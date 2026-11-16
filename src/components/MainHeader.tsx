'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppNavbar from '@/components/AppNavbar';
import { Sparkles, LogOut, User, Lock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MainHeader() {
  const pathname = usePathname();
  const { isLoggedIn, user, logout } = useAuth();

  // 1. If not logged in: show minimal header with logo and lock indicator
  if (!isLoggedIn || !user) {
    return (
      <header className="bg-white border-b sticky top-0 z-20 shadow-2xs">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xl font-bold text-slate-800">
            <div className="relative w-10 h-10 overflow-hidden rounded-md border border-slate-100 shadow-sm shrink-0">
              <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" priority />
            </div>
            <span className="tracking-tight text-base sm:text-lg">Mây Restaurant</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Khu Vực Nội Bộ - Yêu Cầu Đăng Nhập</span>
          </div>
        </div>
      </header>
    );
  }

  // 2. If staff role: ONLY Chat VIP is allowed
  if (user.role === 'staff') {
    return (
      <header className="bg-white border-b sticky top-0 z-20 shadow-2xs">
        <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 overflow-hidden rounded-md border border-slate-100 shadow-sm shrink-0">
              <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" priority />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm sm:text-base">Mây Restaurant</div>
              <div className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Cổng Nhân Viên - Chat VIP
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{user.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2.5 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // 3. For Admin, Supervisor, Receptionist: standard header with filtered AppNavbar
  return (
    <header className="bg-white border-b sticky top-0 z-10 shadow-2xs">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 text-xl font-bold text-slate-800 shrink-0">
          <div className="relative w-10 h-10 overflow-hidden rounded-md border border-slate-100 shadow-sm">
            <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" priority />
          </div>
          <span className="tracking-tight hidden md:block">Mây Restaurant</span>
        </Link>
        <AppNavbar />
      </div>
    </header>
  );
}
