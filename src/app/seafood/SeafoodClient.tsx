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
  Clock 
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { SeafoodCategory, SeafoodItem } from "@/lib/data";
import { updateSeafoodInventoryAction } from "@/app/actions";
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
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemSize, setNewItemSize] = useState('');

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
      size: newItemSize.trim()
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

  const currentCategories = isEditing ? editCategories : data.categories;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-100 p-3 rounded-xl text-sky-600">
            <Droplets className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Kho Hải Sản Theo Ngày</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Cập nhật lần cuối: <strong className="text-slate-700">{formattedDate}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Đã lưu thành công!
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

      {isEditing && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>💡 <strong>Chế độ chỉnh sửa:</strong> Bạn có thể dùng nút <strong>[-] / [+]</strong> để tăng giảm nhanh số lượng con, hoặc nhập trực tiếp văn bản vào ô. Nhấn <strong>Lưu thay đổi</strong> sau khi xong.</span>
        </div>
      )}

      {/* Grid Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentCategories.map(cat => (
          <Card key={cat.id} className={`${cat.color} shadow-sm overflow-hidden flex flex-col justify-between`}>
            <div>
              <CardHeader className={`${cat.bgHeader} border-b ${cat.color} p-4 flex flex-row items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  {getCategoryIcon(cat.id)}
                  <CardTitle className="text-lg font-bold text-slate-800 m-0 p-0 leading-none">{cat.title}</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-white/80 text-xs text-slate-600 font-semibold">
                  {cat.items.length} loại
                </Badge>
              </CardHeader>

              <CardContent className="p-0 divide-y divide-slate-100">
                {cat.items.map(item => (
                  <div key={item.id} className="p-3.5 hover:bg-slate-50 transition-colors">
                    {!isEditing ? (
                      // VIEW MODE
                      <div className="flex justify-between items-center gap-2">
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-800 text-sm">{item.name}</div>
                          {item.size ? (
                            <div className="text-xs text-slate-500 mt-0.5">{item.size}</div>
                          ) : null}
                        </div>
                        <div className="shrink-0">
                          <span 
                            className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md shadow-2xs whitespace-nowrap ${
                              item.qty === 'Hết' || item.qty === '0 con' || item.qty === '0'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : item.qty === 'Liên hệ'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {item.qty}
                          </span>
                        </div>
                      </div>
                    ) : (
                      // EDIT MODE
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 text-sm truncate">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(cat.id, item.id)}
                            className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                            title="Xóa món này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Size subtext or input */}
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
                ))}
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
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setAddingToCategory(null)}
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
        ))}
      </div>
    </div>
  );
}
