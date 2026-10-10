'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import menuData from '@/lib/menuData.json';

type MenuItem = {
  name: string;
  price: string | number;
};

export type SelectedItem = {
  id: string;
  name: string;
  price: number;
  priceText: string;
  qty: number;
  isCustomPrice?: boolean;
  customPriceRaw?: string;
};

export default function MenuSelector({ 
  initialItems = [], 
  decorPackage = "",
}: { 
  initialItems?: string[], 
  decorPackage?: string,
}) {
  const parsedInitial = initialItems.map((item, idx) => {
    let qty = 1;
    let name = item;
    let price = 0;
    let priceText = "Liên hệ";
    
    let isCustomPrice = false;
    let customPriceRaw = "";
    
    const match = item.match(/^(\d+)\s*x\s*(.*)\s*-\s*(.*)$/);
    if (match) {
      qty = parseInt(match[1]);
      name = match[2].trim();
      priceText = match[3].trim();
      const priceMatch = priceText.match(/[\d\.\,]+/);
      if (priceMatch) {
        const p = parseInt(priceMatch[0].replace(/[^\d]/g, ''));
        if (!isNaN(p)) price = p;
      } else {
        isCustomPrice = true;
      }
    } else {
      name = item;
      isCustomPrice = true;
    }
    return { id: idx.toString(), name, price, priceText, qty, isCustomPrice, customPriceRaw };
  });

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(parsedInitial);
  const [searchTerm, setSearchTerm] = useState("");

  const allItems = useMemo(() => {
    return menuData.flatMap(cat => cat.items.map(item => ({...item, category: cat.name})));
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return allItems.filter(item => 
      item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [searchTerm, allItems]);

  const addItem = (item: MenuItem) => {
    let p = 0;
    let isCustom = false;
    if (typeof item.price === 'number') {
      p = item.price;
    } else {
      const match = String(item.price).match(/[\d\.\,]+/);
      if (match) {
        const parsed = parseInt(match[0].replace(/[^\d]/g, ''));
        if (!isNaN(parsed)) p = parsed;
      } else {
        isCustom = true;
      }
    }
    
    setSelectedItems(prev => [...prev, {
      id: Math.random().toString(),
      name: item.name,
      price: p,
      priceText: typeof item.price === 'number' ? `${item.price.toLocaleString('vi-VN')} đ` : String(item.price),
      qty: 1,
      isCustomPrice: isCustom,
      customPriceRaw: ''
    }]);
    setSearchTerm("");
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const updatePrice = (id: string, rawPrice: string) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const num = parseInt(rawPrice.replace(/[^\d]/g, ''));
      const price = isNaN(num) ? 0 : num;
      const priceText = price > 0 ? `${price.toLocaleString('vi-VN')} đ` : rawPrice;
      return { ...i, price, priceText, customPriceRaw: rawPrice };
    }));
  };

  const foodTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const decorTotal = decorPackage ? 3700000 : 0;
  const grandTotal = foodTotal + decorTotal;

  return (
    <div className="space-y-4 border rounded-md p-4 bg-slate-50/50">
      <div>
        <Label>Tìm & Thêm món ăn</Label>
        <div className="relative mt-1">
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Gõ tên món (vd: Gà, Lẩu, Bò...)"
          />
          {searchTerm.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className="px-3 py-2 hover:bg-slate-100 cursor-pointer flex justify-between items-center border-b last:border-0"
                  onClick={() => addItem(item)}
                >
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.category}</div>
                  </div>
                  <div className="text-sm font-semibold text-orange-600">
                    {typeof item.price === 'number' ? item.price.toLocaleString('vi-VN') + ' đ' : item.price}
                  </div>
                </div>
              ))}
              <div 
                className="px-3 py-2 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-t text-orange-700 bg-orange-50 sticky bottom-0"
                onClick={() => addItem({ name: searchTerm.trim(), price: "Theo Thời Giá", category: "Món ngoài menu" } as any)}
              >
                <div className="font-medium text-sm flex items-center gap-2">
                  <span className="text-lg leading-none">+</span> Thêm món ngoài menu: &quot;{searchTerm}&quot;
                </div>
                <div className="text-xs font-semibold bg-orange-200 px-2 py-1 rounded">Tự nhập giá</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {selectedItems.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 bg-white p-2 border rounded-md shadow-sm">
            <Input 
              type="number" 
              value={item.qty} 
              onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
              className="w-16 h-8 text-center"
              min={1}
            />
            <span className="text-sm text-slate-500">x</span>
            <div className="flex-1 text-sm font-medium leading-tight">
              {item.name}
              <input type="hidden" name="menuItem" value={`${item.qty} x ${item.name} - ${item.priceText}`} />
            </div>
            <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
              {item.isCustomPrice ? (
                <div className="flex items-center gap-1">
                  <Input 
                    type="text"
                    value={item.customPriceRaw !== undefined ? item.customPriceRaw : (item.price > 0 ? item.price.toString() : '')}
                    onChange={(e) => updatePrice(item.id, e.target.value)}
                    placeholder="Nhập giá"
                    className="w-24 h-8 text-right px-2"
                  />
                </div>
              ) : (
                item.price > 0 ? (item.price * item.qty).toLocaleString('vi-VN') + ' đ' : item.priceText
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeItem(item.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {selectedItems.length === 0 && (
          <div className="text-sm text-slate-400 italic text-center py-2">Chưa chọn món nào</div>
        )}
      </div>

      <div className="pt-4 border-t space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Tổng tiền món ăn:</span>
          <span className="font-semibold">{foodTotal.toLocaleString('vi-VN')} đ</span>
        </div>
        {decorPackage && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">
              Giá Gói Decor Mây {decorPackage} 
              ({{"1": "Bướm Ngũ Sắc", "2": "Bướm Trắng", "3": "Bướm Đỏ", "4": "Nơ Trắng", "5": "Background Nâu", "6": "Nơ Hồng"}[decorPackage] || ""}):
            </span>
            <span className="font-semibold text-purple-600">3.700.000 đ</span>
          </div>
        )}
        <div className="flex justify-between text-base pt-2 border-t font-bold">
          <span className="text-slate-800">TỔNG CỘNG:</span>
          <span className="text-orange-600">{grandTotal.toLocaleString('vi-VN')} đ</span>
        </div>
      </div>
    </div>
  );
}
