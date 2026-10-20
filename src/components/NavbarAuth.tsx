'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock, LogOut, ShieldCheck, Crown, User, UserCheck } from 'lucide-react';

export default function NavbarAuth() {
  const { isLoggedIn, user, openLoginModal, logout } = useAuth();

  if (isLoggedIn && user) {
    const isMaster = user.role === 'admin';
    const isSupervisor = user.role === 'supervisor';

    return (
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${
          isMaster 
            ? 'bg-amber-50 text-amber-900 border-amber-300' 
            : isSupervisor
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {isMaster ? (
            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : isSupervisor ? (
            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          ) : (
            <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
          <span className="truncate max-w-[120px]">{user.name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2 flex items-center gap-1 shrink-0"
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Thoát</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center pl-2 border-l border-slate-200 shrink-0">
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

