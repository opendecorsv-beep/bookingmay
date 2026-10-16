'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, ChefHat, Settings, Plus } from 'lucide-react';
import menuData from '@/lib/menuData.json';
import { parsePriceToNumber } from '@/lib/bookingUtils';
import { PartyMenuSet, defaultPartyMenuSets } from '@/lib/data';
import { fetchPartyMenuSetsAction } from '@/app/actions';
import PartyMenuModal from './PartyMenuModal';

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
  customDecorPrice = "",
}: { 
  initialItems?: string[], 
  decorPackage?: string,
  customDecorPrice?: string,
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
  const [partySets, setPartySets] = useState<PartyMenuSet[]>(defaultPartyMenuSets);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchPartyMenuSetsAction().then(res => {
      if (mounted && res && res.length > 0) {
        setPartySets(res);
      }
    }).catch(err => console.error("Error loading party sets:", err));
    return () => { mounted = false; };
  }, []);

  const allItems = useMemo(() => {
    return menuData.flatMap(cat => cat.items.map(item => ({...item, category: cat.name})));
  }, []);

  function removeVietnameseTones(str: string) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    const termNoTone = removeVietnameseTones(term);
    const tokens = term.split(/\s+/).filter(Boolean);
    const rawTokens = tokens.map(t => removeVietnameseTones(t));

    return allItems.filter(item => {
      const itemText = (item.name + ' ' + item.category).toLowerCase();
      const itemTextNoTone = removeVietnameseTones(itemText);

      if (itemText.includes(term) || itemTextNoTone.includes(termNoTone)) {
        return true;
      }

      return tokens.every((token, idx) => 
        itemText.includes(token) || itemTextNoTone.includes(rawTokens[idx])
      );
    }).slice(0, 20);
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

  const updateItemName = (id: string, name: string) => {
    setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, name } : i));
  };

  const handleSelectPartySet = (set: PartyMenuSet, asItems: boolean) => {
    if (asItems && set.items && set.items.length > 0) {
      const newItems: SelectedItem[] = [
        {
          id: 'party-set-' + Date.now(),
          name: `[SET] ${set.title} (${set.paxRange || '8 - 10 Người/ Mâm'})`,
          price: set.price,
          priceText: `${set.price.toLocaleString('vi-VN')} đ`,
          qty: 1,
          isCustomPrice: false
        },
        ...set.items.map((it, idx) => ({
          id: `party-dish-${Date.now()}-${idx}`,
          name: `↳ ${it.name} (${it.unit} x ${it.quantity})`,
          price: 0,
          priceText: "Theo Set",
          qty: 1,
          isCustomPrice: false
        }))
      ];
      setSelectedItems(prev => [...prev, ...newItems]);
    } else {
      setSelectedItems(prev => [...prev, {
        id: 'party-set-' + Date.now(),
        name: `[SET] ${set.title} (${set.paxRange || '8 - 10 Người/ Mâm'})`,
        price: set.price,
        priceText: `${set.price.toLocaleString('vi-VN')} đ`,
        qty: 1,
        isCustomPrice: false
      }]);
    }
  };

  const handleAddCustomItem = () => {
    setSelectedItems(prev => [...prev, {
      id: 'custom-' + Date.now(),
      name: '',
      price: 0,
      priceText: 'Tự nhập',
      qty: 1,
      isCustomPrice: true,
      customPriceRaw: ''
    }]);
  };

  const foodTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let decorTotal = 0;
  if (decorPackage) {
    if (decorPackage === '7' || decorPackage === '8') {
      decorTotal = 0;
    } else if (decorPackage === '9') {
      decorTotal = 2500000;
    } else if (decorPackage === 'custom') {
      decorTotal = parsePriceToNumber(customDecorPrice);
    } else {
      decorTotal = 3700000;
    }
  }
  const grandTotal = foodTotal + decorTotal;

  return (
    <div className="space-y-4 border rounded-md p-4 bg-slate-50/50">
      {/* Quick Party Menu Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-500 text-white shadow-xs">
              <ChefHat className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                Menu Tiệc / Set 10 Người
                <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-semibold">Hot</span>
              </div>
              <div className="text-[11px] text-amber-700">Chọn set chuẩn hoặc bấm Quản lý để tự thêm/sửa menu & giá</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPartyModalOpen(true)}
              className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 flex items-center gap-1 font-medium bg-white shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-amber-600" />
              Quản lý Menu Tiệc
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {partySets.map(set => (
            <div key={set.id} className="flex items-center gap-1 bg-white border border-amber-200 hover:border-amber-400 rounded-md p-1 pl-2 shadow-2xs text-xs">
              <span className="font-semibold text-slate-800">{set.title}:</span>
              <span className="font-bold text-orange-600">{(set.price / 1000000).toLocaleString('vi-VN')}tr</span>
              <div className="flex items-center ml-1 pl-1 border-l border-slate-200 gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectPartySet(set, false)}
                  className="h-6 px-1.5 text-[11px] text-slate-600 hover:text-orange-700 hover:bg-orange-50 font-medium"
                  title="Thêm trọn gói 1 set"
                >
                  + Set
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectPartySet(set, true)}
                  className="h-6 px-1.5 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-medium"
                  title="Thêm set + bung danh sách 9 món chi tiết"
                >
                  + Chi tiết
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomItem}
            className="h-7 text-xs border-dashed border-orange-300 text-orange-700 hover:bg-orange-100/70 bg-white/80 flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            + Tự nhập Món / Giá
          </Button>
        </div>
      </div>

      <div>
        <Label>Tìm & Thêm món lẻ</Label>
        <div className="relative mt-1">
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Gõ tên món (vd: Gà, Lẩu, Bò, Càng Cua...)"
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
              {item.isCustomPrice && (!item.name || item.name.startsWith('Tự nhập') || item.id.startsWith('custom-')) ? (
                <Input 
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItemName(item.id, e.target.value)}
                  placeholder="Nhập tên món / Set tiệc..."
                  className="h-8 text-sm px-2 w-full"
                />
              ) : (
                <div className={item.name.startsWith('↳') ? 'text-slate-600 pl-2 text-xs italic' : item.name.startsWith('[SET]') ? 'font-bold text-amber-900' : ''}>
                  {item.name}
                </div>
              )}
              <input type="hidden" name="menuItem" value={`${item.qty} x ${item.name || 'Món tự nhập'} - ${item.priceText}`} />
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
              {decorPackage === 'custom' ? (
                'Decor Yêu Cầu (Tự nhập giá):'
              ) : (
                `Gói Decor Mây ${decorPackage} (${{
                  "1": "Bướm Ngũ Sắc", 
                  "2": "Bướm Trắng", 
                  "3": "Bướm Đỏ", 
                  "4": "Nơ Trắng", 
                  "5": "Background Nâu", 
                  "6": "Nơ Hồng", 
                  "7": "Free S4 1", 
                  "8": "Free S4 2",
                  "9": "Hoa Tươi"
                }[decorPackage] || ""}):`
              )}
            </span>
            <span className="font-semibold text-purple-600">
              {decorPackage === 'custom'
                ? (decorTotal > 0 ? `${decorTotal.toLocaleString('vi-VN')} đ` : (customDecorPrice ? customDecorPrice : '0 đ'))
                : ((decorPackage === '7' || decorPackage === '8') 
                    ? 'Miễn phí' 
                    : (decorPackage === '9' ? '2.500.000 đ' : '3.700.000 đ'))}
            </span>
          </div>
        )}
        <div className="flex justify-between text-base pt-2 border-t font-bold">
          <span className="text-slate-800">TỔNG CỘNG:</span>
          <span className="text-orange-600">{grandTotal.toLocaleString('vi-VN')} đ</span>
        </div>
      </div>

      <PartyMenuModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        onSelectSet={handleSelectPartySet}
      />
    </div>
  );
}
