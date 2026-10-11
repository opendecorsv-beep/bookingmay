'use client';

import { useState, useTransition } from 'react';
import { Booking } from '@/lib/data';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from '@/context/AuthContext';
import { 
  Archive, 
  Search, 
  Calendar, 
  Phone, 
  Users, 
  ClipboardList, 
  RotateCcw, 
  X, 
  Filter, 
  Sparkles, 
  DollarSign,
  Clock,
  MapPin,
  CheckCircle2,
  ClockAlert
} from "lucide-react";
import { restoreBookingAction, deleteBookingAction } from '@/app/actions';

interface ArchiveClientProps {
  initialBookings: Booking[];
}

export default function ArchiveClient({ initialBookings }: ArchiveClientProps) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isPending, startTransition] = useTransition();

  // Filter archived bookings
  const filteredBookings = initialBookings.filter(b => {
    // Search text matches phone, name, room, or formatted date
    const query = searchTerm.toLowerCase().trim();
    const nameMatch = b.customerName.toLowerCase().includes(query);
    const phoneMatch = b.phone.toLowerCase().includes(query);
    const roomMatch = (b.room || '').toLowerCase().includes(query);
    
    let dateStr = '';
    try {
      dateStr = format(new Date(b.dateTime), 'dd/MM/yyyy');
    } catch (e) {
      dateStr = b.dateTime;
    }
    const dateTextMatch = dateStr.includes(query);

    const matchesQuery = query === '' || nameMatch || phoneMatch || roomMatch || dateTextMatch;

    // Filter by specific date if selected
    let matchesDate = true;
    if (selectedDate) {
      try {
        const bIsoDate = b.dateTime.split('T')[0];
        matchesDate = bIsoDate === selectedDate;
      } catch (e) {
        matchesDate = true;
      }
    }

    return matchesQuery && matchesDate;
  });

  // Sort descending by date (newest first)
  const sortedBookings = [...filteredBookings].sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );

  // Group by date (dd/MM/yyyy)
  const groupedBookings = sortedBookings.reduce((acc, b) => {
    let dateStr = '';
    try {
      dateStr = format(new Date(b.dateTime), "dd/MM/yyyy");
    } catch (e) {
      dateStr = b.dateTime;
    }
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(b);
    return acc;
  }, {} as Record<string, typeof sortedBookings>);

  const handleRestore = (id: string, name: string) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    if (confirm(`Bạn có chắc muốn khôi phục tiệc của "${name.replace(/\[S?VIP\] /g, '')}" quay lại Danh Sách Đặt Bàn?`)) {
      startTransition(async () => {
        await restoreBookingAction(id);
      });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-3 rounded-xl text-amber-700">
            <Archive className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Kho Lưu Trữ Tiệc</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Toàn bộ các tiệc đã hoàn tất và dọn xong (Clean) được lưu tại đây để tra cứu và đối soát
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 text-sm px-3 py-1.5 font-medium">
            Tổng cộng: <strong className="text-slate-900 ml-1">{initialBookings.length}</strong> tiệc đã lưu
          </Badge>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="relative md:col-span-7">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Tìm kiếm theo Tên khách, Số điện thoại (vd: 090...), Phòng/Bàn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Filter Input */}
            <div className="relative md:col-span-3">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9 text-sm"
                title="Lọc theo ngày cụ thể"
              />
            </div>

            {/* Clear Button */}
            <div className="md:col-span-2 flex items-center gap-2">
              {(searchTerm || selectedDate) ? (
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="w-full text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Xóa bộ lọc
                </Button>
              ) : (
                <div className="text-xs text-slate-400 text-center w-full">
                  {filteredBookings.length} kết quả
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card className="border-dashed bg-white">
          <CardContent className="p-12 text-center space-y-3">
            <Archive className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy tiệc lưu trữ nào</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              {searchTerm || selectedDate 
                ? "Không có tiệc nào khớp với từ khóa tìm kiếm hoặc ngày bạn chọn. Vui lòng thử lại với từ khóa khác." 
                : "Chưa có tiệc nào được đánh dấu dọn xong (Clean) để đưa vào kho lưu trữ."}
            </p>
            {(searchTerm || selectedDate) && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                Xem tất cả tiệc lưu trữ
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedBookings).map(([dateStr, dayBookings]) => (
            <div key={dateStr} className="space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2 sticky top-0 bg-[#f8efe6]/95 backdrop-blur z-10 pt-2 px-2 rounded-t shadow-xs">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Calendar className="w-5 h-5 text-amber-700" />
                  <span>Ngày {dateStr}</span>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-200 ml-1">
                    {dayBookings.length} tiệc
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {dayBookings.map((b) => {
                  // Format party time
                  let timeFormatted = "";
                  try {
                    timeFormatted = format(new Date(b.dateTime), "HH:mm, EEEE, dd/MM/yyyy", { locale: vi });
                  } catch (e) {
                    timeFormatted = b.dateTime;
                  }

                  // Total calculation
                  let total = 0;
                  b.menu.forEach(item => {
                    const m = item.match(/^(\d+)\s*x\s*(.*)\s*-\s*(.*)$/);
                    if (m) {
                      const qty = parseInt(m[1]);
                      const priceText = m[3];
                      const priceMatch = priceText.match(/[\d\.\,]+/);
                      if (priceMatch) {
                        const price = parseInt(priceMatch[0].replace(/[^\d]/g, ''));
                        if (!isNaN(price) && price > 0) {
                          total += qty * price;
                        }
                      }
                    }
                  });

                  if ((b.decorRequest || "").includes('|PKG:')) {
                    const pkgStr = b.decorRequest.split('|').find(p => p.startsWith('PKG:'));
                    if (pkgStr && pkgStr !== 'PKG:') {
                      const pNum = pkgStr.replace('PKG:', '');
                      if (pNum !== '7' && pNum !== '8') {
                        total += 3700000;
                      }
                    }
                  }

                  const discountMatch = (b.specialRequest || "").match(/\[Giảm giá:\s*([^\]]+)\]/);
                  if (discountMatch) {
                    const num = parseInt(discountMatch[1].replace(/[^\d]/g, ''));
                    if (!isNaN(num) && num > 0) {
                      total -= num;
                    }
                  }

                  const depositMatch = (b.specialRequest || "").match(/\[Cọc:\s*([^\]]+)\]/);
                  const sourceMatch = (b.specialRequest || "").match(/\[Nguồn:\s*([^\]]+)\]/);

                  return (
                    <Card key={b.id} className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col md:flex-row gap-6 justify-between">
                          <div className="space-y-4 flex-1">
                            {/* Header: Name, VIP, Phone, Badges */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                  {b.customerName.replace(/\[S?VIP\] /g, '')}
                                  {b.customerName.includes('[SVIP]') && (
                                    <span className="bg-yellow-500 text-white text-[12px] px-2 py-0.5 rounded font-black tracking-wider shadow-xs">
                                      SVIP
                                    </span>
                                  )}
                                  {b.customerName.includes('[VIP]') && (
                                    <span className="bg-fuchsia-600 text-white text-[12px] px-2 py-0.5 rounded font-bold shadow-xs">
                                      VIP
                                    </span>
                                  )}
                                </h3>

                                <a 
                                  href={`tel:${b.phone}`} 
                                  className="text-sm font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {b.phone}
                                </a>

                                {sourceMatch && (
                                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    Nguồn: {sourceMatch[1]}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {b.receptionStatus === 'clean' ? (
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 text-xs">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Đã dọn xong (Clean)
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 text-xs">
                                    <ClockAlert className="w-3 h-3" />
                                    Tự động lưu trữ (&gt; 8 tiếng)
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Time, Guests, Table */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{timeFormatted}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Khu vực: <strong className="text-slate-800">{b.room || 'Chưa chọn'}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Số khách: <strong className="text-slate-800">{b.guestsCount}</strong></span>
                              </div>
                            </div>

                            {/* Details: Menu & Decor & Financial */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                              {/* Menu */}
                              <div>
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                  <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                                  Menu đã đặt ({b.menu.length} món):
                                </h4>
                                {b.menu.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">Chưa chọn món</p>
                                ) : (
                                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 ml-1">
                                    {b.menu.map((m, idx) => (
                                      <li key={idx} className="leading-snug">{m}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {/* Decor and Financial Notes */}
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                                    Yêu cầu Decor:
                                  </h4>
                                  <p className="text-xs text-slate-700">
                                    {(() => {
                                      const raw = b.decorRequest || "Không có";
                                      if (!raw.includes('|PKG:')) return raw;
                                      const parts = raw.split('|');
                                      const occ = parts[0] || "Không có";
                                      const pkgStr = parts.find(p => p.startsWith('PKG:')) || "";
                                      const noteStr = parts.find(p => p.startsWith('NOTE:')) || "";
                                      
                                      const pkg = pkgStr.replace('PKG:', '');
                                      const note = noteStr.replace('NOTE:', '');
                                      
                                      let res = occ;
                                      if (pkg) {
                                        const pkgNames: Record<string, string> = {
                                          "1": "Bướm Ngũ Sắc", 
                                          "2": "Bướm Trắng", 
                                          "3": "Bướm Đỏ", 
                                          "4": "Nơ Trắng", 
                                          "5": "Background Nâu", 
                                          "6": "Nơ Hồng",
                                          "7": "Free S4 1 (Miễn phí)",
                                          "8": "Free S4 2 (Miễn phí)"
                                        };
                                        res += ` - Gói Mây ${pkg} (${pkgNames[pkg] || ""})`;
                                      }
                                      if (note) res += ` - Ghi chú: ${note}`;
                                      return res;
                                    })()}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                                  <div>
                                    <span className="text-xs text-slate-500 block">Tiền cọc:</span>
                                    <span className="text-xs font-bold text-orange-600">
                                      {depositMatch ? depositMatch[1] : 'Chưa cọc'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-slate-500 block">Giảm giá:</span>
                                    <span className="text-xs font-bold text-green-600">
                                      {discountMatch ? discountMatch[1] : 'Không có'}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-xs text-slate-500 block">Tổng tiền dự tính:</span>
                                  <span className="text-sm font-bold text-red-600">
                                    {total > 0 ? total.toLocaleString('vi-VN') + " đ" : "Chưa tính"}
                                  </span>
                                </div>

                                {b.specialRequest && (
                                  <div>
                                    <span className="text-xs text-slate-500 block">Yêu cầu đặc biệt:</span>
                                    <p className="text-xs text-slate-600 italic">
                                      {b.specialRequest
                                        .replace(/\[Cọc:\s*[^\]]+\]/g, '')
                                        .replace(/\[Nguồn:\s*[^\]]+\]/g, '')
                                        .replace(/\[Giảm giá:\s*[^\]]+\]/g, '')
                                        .trim() || 'Không có'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Side Actions */}
                          <div className="w-full md:w-56 flex flex-col justify-between border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-5 space-y-4">
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                                Trạng thái lưu trữ
                              </span>
                              <div className="space-y-1.5 text-xs text-slate-600">
                                <div className="flex justify-between">
                                  <span>Giám sát:</span>
                                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Dọn xong</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Bếp:</span>
                                  <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                    {b.kitchenStatus === 'done' ? 'Xong' : b.kitchenStatus}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Decor:</span>
                                  <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                    {b.floorStatus === 'done' ? 'Xong' : b.floorStatus}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(b.id, b.customerName)}
                                disabled={isPending}
                                className="w-full text-xs text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800 flex items-center justify-center gap-1.5"
                                title="Đưa tiệc này trở lại Danh Sách Đặt Bàn"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Khôi phục tiệc
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
