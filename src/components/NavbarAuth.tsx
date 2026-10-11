'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock, LogOut, ShieldCheck } from 'lucide-react';

export default function NavbarAuth() {
  const { isLoggedIn, openLoginModal, logout } = useAuth();

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>maybmt</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2 flex items-center gap-1"
          title="Đăng xuất khỏi tài khoản quản lý"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Thoát</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center pl-2 border-l border-slate-200">
      <Button
        variant="outline"
        size="sm"
        onClick={openLoginModal}
        className="text-xs font-semibold text-orange-700 bg-orange-50/80 hover:bg-orange-100 border-orange-200 h-8 px-2.5 flex items-center gap-1.5 shadow-2xs"
      >
        <Lock className="w-3.5 h-3.5" />
        <span>Đăng nhập</span>
      </Button>
    </div>
  );
}
