'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Utensils, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  Settings, 
  Sparkles, 
  ChefHat, 
  FileText, 
  ArrowRight,
  DollarSign,
  Users,
  Copy,
  BookOpen
} from 'lucide-react';
import { PartyMenuSet, PartyMenuItem, defaultPartyMenuSets } from '@/lib/data';
import { fetchPartyMenuSetsAction, savePartyMenuSetAction, deletePartyMenuSetAction } from '@/app/actions';
import { parsePriceToNumber } from '@/lib/bookingUtils';
import { useAuth } from '@/context/AuthContext';

interface PartyMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSet?: (set: PartyMenuSet, asItems: boolean) => void;
}

export default function PartyMenuModal({ isOpen, onClose, onSelectSet }: PartyMenuModalProps) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [sets, setSets] = useState<PartyMenuSet[]>(defaultPartyMenuSets);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSetId, setActiveSetId] = useState<string>(defaultPartyMenuSets[0]?.id || 'SET-01');

  // Form edit / add state
  const [isEditing, setIsEditing] = useState(false);
  const [editingSet, setEditingSet] = useState<PartyMenuSet | null>(null);

  // Load sets from server on mount or open
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchPartyMenuSetsAction()
        .then((data) => {
          if (data && data.length > 0) {
            setSets(data);
            if (!data.some(s => s.id === activeSetId)) {
              setActiveSetId(data[0].id);
            }
          }
        })
        .catch((err) => console.error("Error loading party menus:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const activeSet = sets.find(s => s.id === activeSetId) || sets[0];

  const handleStartCreate = () => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    const nextNum = sets.length + 1;
    const newSet: PartyMenuSet = {
      id: `SET-${Date.now().toString().slice(-4)}`,
      title: `Thực Đơn ${nextNum}`,
      paxRange: '8 - 10 Người/ Mâm',
      price: 5000000,
      priceText: '5.000.000 đ',
      description: 'Thực đơn tiệc tiêu chuẩn cho 8 - 10 người/ mâm',
      items: [
        { name: '', unit: 'Đĩa', quantity: 1, note: '' }
      ]
    };
    setEditingSet(newSet);
    setIsEditing(true);
  };

  const handleStartEdit = (set: PartyMenuSet) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    setEditingSet(JSON.parse(JSON.stringify(set)));
    setIsEditing(true);
  };

  const handleDeleteSet = async (id: string, title: string) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    if (confirm(`Bạn có chắc muốn xóa "${title}" khỏi danh sách Menu Tiệc?`)) {
      try {
        await deletePartyMenuSetAction(id);
        const remaining = sets.filter(s => s.id !== id);
        setSets(remaining);
        if (remaining.length > 0) {
          setActiveSetId(remaining[0].id);
        }
      } catch (err) {
        console.error(err);
        alert("Có lỗi khi xóa thực đơn!");
      }
    }
  };

  const handleSaveEditing = async () => {
    if (!editingSet) return;
    if (!editingSet.title.trim()) {
      alert("Vui lòng nhập tên thực đơn!");
      return;
    }
    if (!editingSet.price || editingSet.price <= 0) {
      alert("Vui lòng nhập đơn giá thực đơn hợp lệ!");
      return;
    }
    // Filter empty items
    const cleanItems = editingSet.items.filter(i => i.name.trim() !== '');
    if (cleanItems.length === 0) {
      alert("Vui lòng thêm ít nhất 1 món ăn cho thực đơn!");
      return;
    }

    const setPayload: PartyMenuSet = {
      ...editingSet,
      items: cleanItems,
      priceText: `${editingSet.price.toLocaleString('vi-VN')} đ`
    };

    try {
      await savePartyMenuSetAction(setPayload);
      setSets(prev => {
        const idx = prev.findIndex(s => s.id === setPayload.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = setPayload;
          return updated;
        }
        return [...prev, setPayload];
      });
      setActiveSetId(setPayload.id);
      setIsEditing(false);
      setEditingSet(null);
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi lưu thực đơn!");
    }
  };

  // Helper inside editing form: add dish
  const handleAddDish = () => {
    if (!editingSet) return;
    setEditingSet({
      ...editingSet,
      items: [...editingSet.items, { name: '', unit: 'Đĩa', quantity: 1, note: '' }]
    });
  };

  const handleUpdateDish = (index: number, field: keyof PartyMenuItem, value: any) => {
    if (!editingSet) return;
    const updated = [...editingSet.items];
    updated[index] = { ...updated[index], [field]: value };
    setEditingSet({ ...editingSet, items: updated });
  };

  const handleRemoveDish = (index: number) => {
    if (!editingSet) return;
    const updated = editingSet.items.filter((_, idx) => idx !== index);
    setEditingSet({ ...editingSet, items: updated });
  };

  // Helper for quick paste text list of dishes
  const handleQuickPasteDishes = (text: string) => {
    if (!editingSet || !text.trim()) return;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: PartyMenuItem[] = lines.map(line => {
      // Remove leading numbering like "1.", "1/", "1 -", etc.
      const cleanLine = line.replace(/^\d+[\.\/\-\)]\s*/, '').trim();
      return {
        name: cleanLine,
        unit: 'Đĩa',
        quantity: 1,
        note: ''
      };
    });
    setEditingSet({
      ...editingSet,
      items: [...editingSet.items.filter(i => i.name.trim() !== ''), ...parsed]
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  Thực Đơn Tiệc (Set 10 Người)
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                    {sets.length} Set
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Quản lý thực đơn mâm tiệc 8 - 10 người &amp; linh động cập nhật món, giá tiền
                </DialogDescription>
              </div>
            </div>

            {!isEditing && (
              <Button
                size="sm"
                onClick={handleStartCreate}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                Thêm Menu Mới
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* MODE 1: FORM THÊM / SỬA THỰC ĐƠN */}
        {isEditing && editingSet ? (
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200 flex items-center justify-between">
              <span className="text-sm font-bold text-orange-950 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-orange-600" />
                {editingSet.id.startsWith('SET-') && sets.some(s => s.id === editingSet.id)
                  ? `Chỉnh sửa: ${editingSet.title}`
                  : 'Tạo Menu Tiệc Mới'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setIsEditing(false); setEditingSet(null); }}
                className="text-xs text-slate-500 hover:text-slate-800 h-8"
              >
                Hủy bỏ
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Tên Thực Đơn *</Label>
                <Input
                  value={editingSet.title}
                  onChange={(e) => setEditingSet({ ...editingSet, title: e.target.value })}
                  placeholder="Ví dụ: Thực Đơn 1, Thực Đơn 2..."
                  className="h-9 text-xs mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Giá Trọn Gói (VNĐ/Mâm) *</Label>
                <Input
                  type="text"
                  value={editingSet.price ? editingSet.price.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const num = parsePriceToNumber(e.target.value);
                    setEditingSet({ ...editingSet, price: num });
                  }}
                  placeholder="Ví dụ: 5.000.000 hoặc 5tr..."
                  className="h-9 text-xs mt-1 font-bold text-red-600"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Tiêu Chuẩn Khách</Label>
                <Input
                  value={editingSet.paxRange}
                  onChange={(e) => setEditingSet({ ...editingSet, paxRange: e.target.value })}
                  placeholder="Ví dụ: 8 - 10 Người/ Mâm"
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Mô Tả / Ghi Chú Ngắn</Label>
              <Input
                value={editingSet.description || ''}
                onChange={(e) => setEditingSet({ ...editingSet, description: e.target.value })}
                placeholder="Ghi chú thêm về thực đơn (nếu có)..."
                className="h-9 text-xs mt-1"
              />
            </div>

            {/* List of Dishes */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-orange-600" />
                  Danh Sách Món Ăn Trong Thực Đơn ({editingSet.items.length} món)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDish}
                  className="h-7 text-xs text-orange-700 border-orange-300 hover:bg-orange-50 font-bold"
                >
                  <Plus className="w-3 h-3 mr-1" /> Thêm món
                </Button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {editingSet.items.map((dish, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </span>
                    <Input
                      value={dish.name}
                      onChange={(e) => handleUpdateDish(idx, 'name', e.target.value)}
                      placeholder="Tên món ăn (vd: Gà Ta Hấp Nấm Lá Thơm)..."
                      className="h-8 text-xs font-medium flex-1 bg-white"
                    />
                    <Input
                      value={dish.unit || 'Đĩa'}
                      onChange={(e) => handleUpdateDish(idx, 'unit', e.target.value)}
                      placeholder="ĐVT (Đĩa, KG...)"
                      className="h-8 text-xs w-20 bg-white text-center"
                    />
                    <Input
                      value={dish.quantity !== undefined ? dish.quantity : 1}
                      onChange={(e) => handleUpdateDish(idx, 'quantity', e.target.value)}
                      placeholder="SL"
                      className="h-8 text-xs w-16 bg-white text-center font-semibold"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDish(idx)}
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Xóa món"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setIsEditing(false); setEditingSet(null); }}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditing}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
              >
                Lưu Thay Đổi Thực Đơn
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* MODE 2: XEM DANH SÁCH & CHỌN THỰC ĐƠN */
          <div className="space-y-4 py-2">
            {/* Tabs chọn Set Thực Đơn */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {sets.map((s) => {
                const isActive = s.id === activeSet?.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSetId(s.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{s.title}</span>
                    <span className={`text-[11px] font-black px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-orange-600 text-white' : 'bg-slate-100 text-orange-700'
                    }`}>
                      {s.price ? `${(s.price / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr` : s.priceText}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Chi tiết Set đang chọn */}
            {activeSet ? (
              <Card className="border-2 border-orange-200 shadow-sm bg-white overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 p-4 border-b border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">
                        {activeSet.title}
                      </h3>
                      <Badge className="bg-orange-600 text-white text-xs font-bold">
                        {activeSet.paxRange}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {activeSet.description || 'Thực đơn chuyên dùng cho mâm tiệc 8 - 10 người'}
                    </p>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <span className="text-xs text-slate-500 font-medium">Đơn giá trọn gói:</span>
                    <span className="text-xl sm:text-2xl font-black text-red-600">
                      {activeSet.price.toLocaleString('vi-VN')} đ
                      <span className="text-xs text-slate-500 font-normal ml-1">/ mâm</span>
                    </span>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-orange-600" />
                      Danh Sách Món Ăn ({activeSet.items.length} món):
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(activeSet)}
                        className="h-7 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1 font-semibold"
                      >
                        <Edit className="w-3 h-3 text-slate-500" />
                        Sửa Set &amp; Giá
                      </Button>
                      {sets.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSet(activeSet.id, activeSet.title)}
                          className="h-7 px-2 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Xóa thực đơn này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bảng món ăn theo phong cách trang trọng */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-xs">
                      <thead className="bg-amber-100/70 text-slate-800 font-bold border-b border-amber-200">
                        <tr>
                          <th className="py-2 px-3 text-center w-12">STT</th>
                          <th className="py-2 px-3 text-left">Tên Món Ăn</th>
                          <th className="py-2 px-3 text-center w-16">ĐVT</th>
                          <th className="py-2 px-3 text-center w-14">SL</th>
                          <th className="py-2 px-3 text-left w-24">Ghi Chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {activeSet.items.map((m, idx) => (
                          <tr key={idx} className="hover:bg-orange-50/40 transition-colors">
                            <td className="py-2 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{m.name}</td>
                            <td className="py-2 px-3 text-center text-slate-600">{m.unit || 'Đĩa'}</td>
                            <td className="py-2 px-3 text-center font-bold text-slate-900">{m.quantity !== undefined ? m.quantity : 1}</td>
                            <td className="py-2 px-3 text-slate-400 italic text-[11px]">{m.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions khi dùng bên trong MenuSelector */}
                  {onSelectSet && (
                    <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          onSelectSet(activeSet, true);
                          onClose();
                        }}
                        className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5 h-9"
                        title="Chèn toàn bộ 9 món riêng lẻ vào danh sách món của tiệc"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        Chèn Riêng Lẻ {activeSet.items.length} Món
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          onSelectSet(activeSet, false);
                          onClose();
                        }}
                        className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-1.5 h-9 shadow-2xs"
                        title="Áp dụng trọn gói thực đơn này vào tiệc với tổng tiền 5.000.000 đ"
                      >
                        <Check className="w-4 h-4" />
                        Áp Dụng Trọn Gói {activeSet.title} ({activeSet.price.toLocaleString('vi-VN')} đ)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">Chưa có thực đơn nào</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
