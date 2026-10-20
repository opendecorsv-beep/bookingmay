'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppNavbar from '@/components/AppNavbar';
import { Sparkles, LogOut, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MainHeader() {
  const pathname = usePathname();
  const { isLoggedIn, user, logout } = useAuth();

  const isStaffPortal = pathname.startsWith('/nv') || pathname.startsWith('/nhanvien');

  // If on Staff Portal (/nv or /nhanvien), show ONLY the isolated staff header
  if (isStaffPortal) {
    return (
      <header className="bg-white border-b sticky top-0 z-20 shadow-2xs">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 overflow-hidden rounded-md border border-slate-100 shadow-sm">
              <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                <span>Mây Restaurant</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Cổng Nhân Viên
                </span>
              </div>
              <div className="text-[11px] text-slate-400 sm:hidden">Cổng Nhân Viên & CMS</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="max-w-[120px] truncate">{user.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thoát</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Khu vực nhân viên</span>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Standard Restaurant Management Header
  return (
    <header className="bg-white border-b sticky top-0 z-10 shadow-2xs">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 text-xl font-bold text-slate-800 shrink-0">
          <div className="relative w-10 h-10 overflow-hidden rounded-md border border-slate-100 shadow-sm">
            <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" />
          </div>
          <span className="tracking-tight hidden md:block">Mây Restaurant</span>
        </Link>
        <AppNavbar />
      </div>
    </header>
  );
}
