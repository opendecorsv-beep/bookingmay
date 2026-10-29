'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock, LogOut, Crown, User, UserCheck, RefreshCw, BellRing } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function NavbarAuth() {
  const { isLoggedIn, user, openLoginModal, logout } = useAuth();
  const [isReloading, setIsReloading] = useState(false);

  const handleForceReloadAll = async () => {
    if (!confirm("Gửi lệnh tải lại (Reload) đến toàn bộ điện thoại & máy tính của nhân viên đang mở webapp trong quán?")) return;
    setIsReloading(true);
    try {
      const channel = supabase.channel('system-control');
      await channel.send({
        type: 'broadcast',
        event: 'force-reload',
        payload: { initiatedBy: user?.name || 'Admin', timestamp: Date.now() }
      });
      supabase.removeChannel(channel);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      alert("Không thể gửi lệnh làm mới: " + (err?.message || err));
      setIsReloading(false);
    }
  };

  if (isLoggedIn && user) {
    const isMaster = user.role === 'admin';
    const isSupervisor = user.role === 'supervisor';
    const isReceptionist = user.role === 'receptionist';

    return (
      <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-slate-200 shrink-0">
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold ${
          isMaster 
            ? 'bg-amber-50 text-amber-900 border-amber-300' 
            : isSupervisor
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : isReceptionist
            ? 'bg-orange-50 text-orange-900 border-orange-300'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {isMaster ? (
            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : isSupervisor ? (
            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          ) : isReceptionist ? (
            <BellRing className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          ) : (
            <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
          <span className="truncate max-w-[120px]">{user.name}</span>
        </div>

        {(isMaster || isSupervisor) && (
          <Button
            variant="outline"
            size="sm"
            disabled={isReloading}
            onClick={handleForceReloadAll}
            className="text-xs text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 hover:text-indigo-900 border-indigo-200 h-8 px-2 flex items-center gap-1 shrink-0"
            title="Gửi lệnh làm mới đến toàn bộ thiết bị đang mở webapp để ngắt tab cũ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">Tải lại toàn máy</span>
          </Button>
        )}

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
