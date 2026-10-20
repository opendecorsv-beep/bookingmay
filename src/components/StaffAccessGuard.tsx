'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StaffAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isStaffOnly, user } = useAuth();

  // If user is logged in as staff (nhanvien) and tries to view any route other than /nv or /nhanvien
  if (isStaffOnly && pathname !== '/nv' && pathname !== '/nhanvien') {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-amber-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-700 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Tài khoản <strong>{user?.name || 'Nhân viên'}</strong> chỉ có quyền theo dõi bảng xếp hạng và hoa hồng tại <strong>Cổng Nhân Viên</strong>. Các phân hệ vận hành nhà hàng chỉ dành cho Quản Lý & Giám Sát.
        </p>
        <div className="pt-2">
          <Button 
            onClick={() => router.push('/nv')} 
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl shadow-md"
          >
            <span>Vào Cổng Nhân Viên & CMS</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }


  return <>{children}</>;
}
