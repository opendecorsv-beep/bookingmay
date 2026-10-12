'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Fish, 
  Droplets, 
  Shell, 
  Anchor, 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Clock,
  Flame,
  Zap,
  Filter,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { SeafoodCategory, SeafoodItem } from "@/lib/data";
import { updateSeafoodInventoryAction, toggleSeafoodUrgentAction } from "@/app/actions";
import { useAuth } from "@/context/AuthContext";

interface SeafoodClientProps {
  initialData: {
    updatedAt: string;
    categories: SeafoodCategory[];
  };
}

export default function SeafoodClient({ initialData }: SeafoodClientProps) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [data, setData] = useState(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [editCategories, setEditCategories] = useState<SeafoodCategory[]>(initialData.categories);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Đã lưu thành công!");
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemSize, setNewItemSize] = useState('');
  const [newItemIsUrgent, setNewItemIsUrgent] = useState(false);
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'tom':
        return <Anchor className="w-6 h-6 text-orange-500" />;
      case 'cua':
        return <Anchor className="w-6 h-6 text-red-500" />;
      case 'ca':
        return <Fish className="w-6 h-6 text-blue-500" />;
      case 'oc':
        return <Shell className="w-6 h-6 text-purple-500" />;
      default:
        return <Fish className="w-6 h-6 text-sky-500" />;
    }
  };

  const currentCategories = isEditing ? editCategories : data.categories;

  // Tính toán tất cả các mặt hàng đang trong tình trạng đẩy hàng
  const allUrgentItems = currentCategories.flatMap(cat =>
    cat.items.filter(item => item.isUrgent).map(item => ({
      ...item,
      catId: cat.id,
      catTitle: cat.title
    }))
  );

  const handleStartEdit = () => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    setEditCategories(JSON.parse(JSON.stringify(data.categories)));
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleCancelEdit = () => {
    setEditCategories(data.categories);
    setIsEditing(false);
    setAddingToCategory(null);
  };

  // Toggle nhanh tình trạng đẩy hàng ở View mode (chỉ tài khoản quản lý mới có quyền)
  const handleToggleUrgent = async (catId: string, itemId: string, nextUrgent: boolean, itemName: string) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }

    const previousData = data;
    const updatedCategories = data.categories.map(cat => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        items: cat.items.map(item =>
          item.id === itemId ? { ...item, isUrgent: nextUrgent } : item
        )
      };
    });

    const updatedPayload = {
      updatedAt: new Date().toISOString(),
      categories: updatedCategories
    };

    // Cập nhật UI lạc quan ngay tức thì
    setData(updatedPayload);
    setEditCategories(updatedCategories);

    try {
      const res = await toggleSeafoodUrgentAction(catId, itemId, nextUrgent);
      if (res && res.updatedPayload) {
        setData(res.updatedPayload);
        setEditCategories(res.updatedPayload.categories);
      }
      setSuccessMessage(nextUrgent ? `Đã bật đẩy hàng cho: ${itemName}` : `Đã tắt đẩy hàng cho: ${itemName}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setData(previousData);
      setEditCategories(previousData.categories);
      alert("Lỗi khi cập nhật trạng thái đẩy hàng! Vui lòng thử lại.");
    }
  };

  // Toggle tình trạng đẩy hàng trong Edit mode
  const handleToggleUrgentInEdit = (catId: string, itemId: string) => {
    setEditCategories(prev =>
      prev.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map(item =>
            item.id === itemId ? { ...item, isUrgent: !item.isUrgent } : item
          )
        };
      })
    );
  };

  const handleQtyChange = (catId: string, itemId: string, newQty: string) => {
    setEditCategories(prev =>
      prev.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map(item =>
            item.id === itemId ? { ...item, qty: newQty } : item
          )
        };
      })
    );
  };

  const handleSizeChange = (catId: string, itemId: string, newSize: string) => {
    setEditCategories(prev =>
      prev.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map(item =>
            item.id === itemId ? { ...item, size: newSize } : item
          )
        };
      })
    );
  };

  const handleAdjustStep = (catId: string, itemId: string, delta: number) => {
    setEditCategories(prev =>
      prev.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map(item => {
            if (item.id !== itemId) return item;
            const match = item.qty.match(/(\d+)/);
            if (match) {
              const currentNum = parseInt(match[1]);
              const nextNum = Math.max(0, currentNum + delta);
              const suffix = item.qty.replace(/\d+/, '').trim() || 'con';
              return { ...item, qty: nextNum === 0 ? 'Hết' : `${nextNum} ${suffix}` };
            } else {
              if (delta > 0) return { ...item, qty: '1 con' };
              return { ...item, qty: 'Hết' };
            }
          })
        };
      })
    );
  };

  const handleDeleteItem = (catId: string, itemId: string) => {
    setEditCategories(prev =>
      prev.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.filter(item => item.id !== itemId)
        };
      })
    );
  };

  const handleAddItem = (catId: string) => {
    if (!newItemName.trim()) return;
    const newItem: SeafoodItem = {
      id: `${catId}_${Date.now()}`,
      name: newItemName.trim(),
      qty: newItemQty.trim() || '0 con',
      size: newItemSize.trim(),
      isUrgent: newItemIsUrgent
    };

    setEditCategories(prev =>
      prev.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: [...cat.items, newItem]
        };
      })
    );

    setNewItemName('');
    setNewItemQty('');
    setNewItemSize('');
    setNewItemIsUrgent(false);
    setAddingToCategory(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updatedPayload = {
      updatedAt: new Date().toISOString(),
      categories: editCategories
    };

    try {
      await updateSeafoodInventoryAction(updatedPayload);
      setData(updatedPayload);
      setIsEditing(false);
      setSuccessMessage("Đã lưu thay đổi kho thành công!");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert("Lỗi khi lưu dữ liệu kho hải sản!");
    } finally {
      setIsSaving(false);
    }
  };

  let formattedDate = "";
  try {
    formattedDate = format(new Date(data.updatedAt), "HH:mm - dd/MM/yyyy", { locale: vi });
  } catch (e) {
    formattedDate = format(new Date(), "HH:mm - dd/MM/yyyy", { locale: vi });
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-100 p-3 rounded-xl text-sky-600">
            <Droplets className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Kho Hải Sản Theo Ngày</h1>
              {allUrgentItems.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs animate-pulse">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  {allUrgentItems.length} ngợp cần đẩy
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Cập nhật lần cuối: <strong className="text-slate-700">{formattedDate}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          {!isEditing ? (
            <Button 
              onClick={handleStartEdit} 
              className="bg-sky-600 hover:bg-sky-700 text-white font-medium flex items-center gap-2 shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              Cập nhật số lượng
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleCancelEdit} 
                disabled={isSaving}
                className="flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Hủy
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* CẢNH BÁO MẶT HÀNG NGỢP CẦN ĐẨY GẤP (DÀNH CHO NHÂN VIÊN) */}
      {allUrgentItems.length > 0 ? (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-amber-400">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-xs shrink-0 mt-0.5">
                <Flame className="w-6 h-6 text-yellow-200 fill-yellow-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-white">
                    Hải Sản Ngợp Cần Đẩy Gấp Hôm Nay
                  </h2>
                  <span className="bg-white text-rose-600 text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    {allUrgentItems.length} mặt hàng
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-100 mt-1">
                  ⚡ <strong>Nhân viên lưu ý:</strong> Ưu tiên tư vấn cho khách và xuất kho các món này trước để đảm bảo tươi ngon và tránh hao hụt!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                type="button"
                onClick={() => setFilterUrgentOnly(prev => !prev)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  filterUrgentOnly
                    ? 'bg-white text-rose-700 ring-2 ring-white/80'
                    : 'bg-black/20 hover:bg-black/30 text-white border border-white/20'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {filterUrgentOnly ? 'Xem tất cả kho' : 'Chỉ lọc món cần đẩy'}
              </button>
            </div>
          </div>

          {/* Danh sách nhanh các món đang cần đẩy */}
          <div className="mt-3.5 pt-3 border-t border-white/20 flex flex-wrap gap-2">
            {allUrgentItems.map(item => (
              <div 
                key={item.id}
                className="bg-white/95 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs border border-orange-200"
              >
                <span className="text-slate-400 text-[11px] font-normal">[{item.catTitle}]</span>
                <span className="font-bold text-amber-950">{item.name}</span>
                {item.size ? <span className="text-slate-500 text-[11px]">({item.size})</span> : null}
                <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                  {item.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs sm:text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Toàn bộ hải sản trong kho đang ở trạng thái tươi sống ổn định. Không có mặt hàng ngợp cần đẩy gấp.</span>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>💡 <strong>Chế độ chỉnh sửa:</strong> Bạn có thể dùng nút <strong>[-] / [+]</strong> để điều chỉnh số lượng, bấm nút <strong>[⚡ Đẩy hàng]</strong> để đánh dấu hàng ngợp cần đẩy sớm, hoặc nhập trực tiếp văn bản vào ô. Nhấn <strong>Lưu thay đổi</strong> sau khi xong.</span>
        </div>
      )}

      {/* Grid Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentCategories.map(cat => {
          const urgentInCat = cat.items.filter(i => i.isUrgent).length;
          const itemsToDisplay = filterUrgentOnly ? cat.items.filter(i => i.isUrgent) : cat.items;

          if (filterUrgentOnly && itemsToDisplay.length === 0) {
            return null;
          }

          return (
            <Card key={cat.id} className={`${cat.color} shadow-sm overflow-hidden flex flex-col justify-between`}>
              <div>
                <CardHeader className={`${cat.bgHeader} border-b ${cat.color} p-4 flex flex-row items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    {getCategoryIcon(cat.id)}
                    <CardTitle className="text-lg font-bold text-slate-800 m-0 p-0 leading-none">{cat.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="bg-white/80 text-xs text-slate-600 font-semibold">
                      {cat.items.length} loại
                    </Badge>
                    {urgentInCat > 0 && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                        <Flame className="w-3 h-3 fill-current" />
                        {urgentInCat} đẩy gấp
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-2 space-y-1.5">
                  {itemsToDisplay.map(item => {
                    const isUrgent = !!item.isUrgent;

                    return (
                      <div 
                        key={item.id} 
                        className={`transition-all ${
                          isUrgent
                            ? 'p-3 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/80 border-2 border-amber-400 rounded-xl shadow-xs ring-2 ring-amber-300/30'
                            : 'p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100'
                        }`}
                      >
                        {!isEditing ? (
                          // VIEW MODE
                          <div className="flex flex-col gap-1.5">
                            {/* Nổi bật: Badge Cần đẩy gấp */}
                            {isUrgent && (
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wide animate-pulse">
                                  <Flame className="w-3 h-3 fill-white" />
                                  CẦN ĐẨY GẤP (NGỢP)
                                </span>
                                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                                  Ưu tiên bán
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0 pr-1">
                                <div className={`font-semibold text-sm ${isUrgent ? 'text-amber-950 font-bold text-[15px]' : 'text-slate-800'}`}>
                                  {item.name}
                                </div>
                                {item.size ? (
                                  <div className={`text-xs mt-0.5 ${isUrgent ? 'text-amber-800 font-medium' : 'text-slate-500'}`}>
                                    {item.size}
                                  </div>
                                ) : null}
                              </div>

                              <div className="shrink-0 flex flex-col items-end gap-1.5">
                                {/* Badge Số Lượng */}
                                <span 
                                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md shadow-2xs whitespace-nowrap ${
                                    isUrgent
                                      ? 'bg-rose-600 text-white font-black border border-rose-700 shadow-xs'
                                      : item.qty === 'Hết' || item.qty === '0 con' || item.qty === '0'
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                      : item.qty === 'Liên hệ'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                                  }`}
                                >
                                  {item.qty}
                                </span>

                                {/* Nút tình trạng đẩy hàng (View mode) */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleUrgent(cat.id, item.id, !isUrgent, item.name)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                    isUrgent
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs border border-amber-600'
                                      : 'bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-400'
                                  }`}
                                  title={isUrgent ? "Bấm để tắt tình trạng đẩy hàng" : "Bấm để đánh dấu hàng ngợp cần đẩy sớm"}
                                >
                                  <Flame className={`w-3 h-3 ${isUrgent ? 'fill-current text-white animate-pulse' : 'text-amber-500'}`} />
                                  <span>{isUrgent ? 'Đang đẩy' : 'Đẩy hàng'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // EDIT MODE
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-semibold text-sm truncate ${isUrgent ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {/* Toggle Đẩy hàng trong Edit Mode */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleUrgentInEdit(cat.id, item.id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                                    isUrgent
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                  title="Bật/tắt tình trạng đẩy hàng (ngợp)"
                                >
                                  <Flame className={`w-3 h-3 ${isUrgent ? 'fill-current text-white' : 'text-slate-400'}`} />
                                  <span>{isUrgent ? 'Đang đẩy' : 'Đẩy hàng'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(cat.id, item.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                  title="Xóa món này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Size input */}
                            <div className="text-xs text-slate-500">
                              <input 
                                type="text" 
                                value={item.size} 
                                placeholder="Kích cỡ/size (vd: 2-3kg)..."
                                onChange={(e) => handleSizeChange(cat.id, item.id, e.target.value)}
                                className="w-full text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 focus:bg-white focus:outline-sky-500"
                              />
                            </div>

                            {/* Stepper + Input */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <Button 
                                type="button"
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 shrink-0 text-slate-600 hover:bg-slate-200"
                                onClick={() => handleAdjustStep(cat.id, item.id, -1)}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </Button>
                              <Input 
                                type="text" 
                                value={item.qty}
                                onChange={(e) => handleQtyChange(cat.id, item.id, e.target.value)}
                                className="h-8 text-center text-xs font-bold text-slate-800 px-1"
                                placeholder="Số lượng..."
                              />
                              <Button 
                                type="button"
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 shrink-0 text-slate-600 hover:bg-slate-200"
                                onClick={() => handleAdjustStep(cat.id, item.id, 1)}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </div>

              {/* Bottom Add item in edit mode */}
              {isEditing && (
                <div className="p-3 bg-slate-50 border-t border-slate-200">
                  {addingToCategory === cat.id ? (
                    <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-300 shadow-xs">
                      <div className="text-xs font-bold text-slate-700">Thêm hải sản vào nhóm {cat.title}:</div>
                      <Input 
                        placeholder="Tên hải sản (vd: Tôm càng xanh)..." 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          placeholder="Số lượng (vd: 15 con)..." 
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input 
                          placeholder="Size (vd: 0,5-1kg)..." 
                          value={newItemSize}
                          onChange={(e) => setNewItemSize(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Checkbox đẩy hàng khi tạo mới */}
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={newItemIsUrgent}
                          onChange={(e) => setNewItemIsUrgent(e.target.checked)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                        />
                        <span className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          Đánh dấu cần đẩy hàng ngay (hàng ngợp)
                        </span>
                      </label>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setAddingToCategory(null);
                            setNewItemIsUrgent(false);
                          }}
                          className="h-7 text-xs"
                        >
                          Hủy
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddItem(cat.id)}
                          className="h-7 text-xs bg-sky-600 hover:bg-sky-700 text-white"
                        >
                          Thêm
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setAddingToCategory(cat.id);
                        setNewItemName('');
                        setNewItemQty('');
                        setNewItemSize('');
                        setNewItemIsUrgent(false);
                      }}
                      className="w-full text-xs text-slate-600 border-dashed hover:border-slate-400 hover:bg-white flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm loại mới
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
