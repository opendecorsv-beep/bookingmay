'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChefHat, 
  Utensils, 
  Plus, 
  Edit, 
  Trash2, 
  Printer, 
  CalendarPlus, 
  Users, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Share2
} from "lucide-react";
import { PartyMenuSet } from "@/lib/data";
import PartyMenuModal from "@/components/PartyMenuModal";
import { useAuth } from "@/context/AuthContext";
import { deletePartyMenuSetAction } from "@/app/actions";

interface PartyMenuClientProps {
  initialSets: PartyMenuSet[];
}

export default function PartyMenuClient({ initialSets }: PartyMenuClientProps) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [sets, setSets] = useState<PartyMenuSet[]>(initialSets);
  const [activeSetId, setActiveSetId] = useState<string>(initialSets[0]?.id || 'SET-01');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeSet = sets.find(s => s.id === activeSetId) || sets[0];

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    if (confirm(`Bạn có chắc muốn xóa "${title}" khỏi hệ thống?`)) {
      try {
        await deletePartyMenuSetAction(id);
        const nextSets = sets.filter(s => s.id !== id);
        setSets(nextSets);
        if (nextSets.length > 0) {
          setActiveSetId(nextSets[0].id);
        }
      } catch (err) {
        console.error(err);
        alert("Có lỗi khi xóa thực đơn!");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="bg-orange-100 p-3.5 rounded-2xl text-orange-700 shadow-2xs">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800">
                Menu Tiệc (Set 10 Người)
              </h1>
              <Badge className="bg-orange-600 text-white font-bold text-xs">
                Mây Restaurant
              </Badge>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Thực đơn trọn gói chuyên dùng cho mâm tiệc 8 - 10 khách. Linh động tự cập nhật món và giá tiền.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 h-9"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            In Thực Đơn
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 h-9 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            Thêm / Sửa Menu Tiệc
          </Button>

          <Link href="/bookings">
            <Button
              variant="outline"
              className="text-xs text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 flex items-center gap-1.5 h-9 font-bold"
            >
              <CalendarPlus className="w-4 h-4 text-purple-600" />
              Đặt Tiệc Ngay
            </Button>
          </Link>
        </div>
      </div>

      {/* Set Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide print:hidden">
        {sets.map((s) => {
          const isActive = s.id === activeSet?.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSetId(s.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border whitespace-nowrap transition-all flex items-center gap-2.5 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-orange-500/50'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <span>{s.title}</span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                isActive ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                {s.price ? `${s.price.toLocaleString('vi-VN')} đ` : s.priceText}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Set Presentation Card (Matching Excel Format) */}
      {activeSet ? (
        <Card className="border-2 border-amber-300 shadow-md bg-white overflow-hidden max-w-4xl mx-auto print:border-none print:shadow-none">
          {/* Header styled like authentic party menu sheet */}
          <div className="bg-gradient-to-r from-[#d9ead3] via-[#b6d7a8] to-[#d9ead3] text-center p-5 border-b border-emerald-300">
            <h2 className="text-xl sm:text-2xl font-black text-emerald-950 uppercase tracking-wide">
              {activeSet.paxRange || 'Thực Đơn Cho 8 - 10 Người/ Mâm'}
            </h2>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-base sm:text-xl font-extrabold text-emerald-900">
                {activeSet.title}:
              </span>
              <span className="text-lg sm:text-2xl font-black text-red-600 bg-white/80 px-3 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                {activeSet.price.toLocaleString('vi-VN')} VND/ Mâm
              </span>
            </div>
            {activeSet.description && (
              <p className="text-xs text-emerald-800 mt-1 italic">
                {activeSet.description}
              </p>
            )}
          </div>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Table layout matching Excel spreadsheet */}
            <div className="rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-[#fff2cc] text-slate-900 font-extrabold border-b-2 border-amber-300">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-14 border-r border-amber-200">STT</th>
                    <th className="py-2.5 px-4 text-left border-r border-amber-200">Tên Món Ăn</th>
                    <th className="py-2.5 px-3 text-center w-20 border-r border-amber-200">ĐVT</th>
                    <th className="py-2.5 px-3 text-center w-16 border-r border-amber-200">SL</th>
                    <th className="py-2.5 px-4 text-left w-36">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {activeSet.items.map((m, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/50 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-200">
                        {m.name}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 font-medium border-r border-slate-200">
                        {m.unit || 'Đĩa'}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-200">
                        {m.quantity !== undefined ? m.quantity : 1}
                      </td>
                      <td className="py-3 px-4 text-slate-500 italic text-xs">
                        {m.note || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom info & actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t print:hidden">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Tiêu chuẩn: <strong className="text-slate-800">{activeSet.paxRange}</strong></span>
                <span>•</span>
                <span>Tổng cộng: <strong className="text-slate-800">{activeSet.items.length} món</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 h-8 font-semibold"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                  Sửa Thực Đơn &amp; Giá
                </Button>

                {sets.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(activeSet.id, activeSet.title)}
                    className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                    title="Xóa thực đơn này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}

                <Link href="/bookings">
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 h-8 shadow-2xs"
                  >
                    Áp Dụng Vào Đặt Tiệc
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed bg-white">
          <CardContent className="p-12 text-center space-y-3">
            <ChefHat className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-700">Chưa có thực đơn tiệc nào</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Bạn có thể bấm &quot;Thêm / Sửa Menu Tiệc&quot; để tạo thực đơn tiệc mới với các món ăn và giá linh động.
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs">
              <Plus className="w-4 h-4 mr-1.5" /> Tạo Thực Đơn Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal Management for Party Menus */}
      <PartyMenuModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
