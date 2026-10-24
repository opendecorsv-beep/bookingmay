'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ReceiptScanResult, 
  ReceiptItem 
} from '@/lib/data';
import { 
  classifyReceiptItem, 
  compressReceiptImage, 
  parseReceiptText, 
  DEMO_RECEIPT_RESULT 
} from '@/lib/receiptParser';
import { parseReceiptWithGeminiAction, getSystemGeminiApiKeyAction, saveSystemGeminiApiKeyAction } from '@/app/actions';
import { 
  Camera, 
  Upload, 
  FileText, 
  Sparkles, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  Key, 
  Eye, 
  HelpCircle, 
  Utensils, 
  Wine, 
  Percent, 
  ChevronDown, 
  ChevronUp, 
  Info,
  DollarSign
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPercent?: number;
  onApplyResult: (data: {
    billFoodAmount: number;
    billAmount: number;
    billPercent: number;
    billExcludedAmount: number;
    billItemsSummary: string;
    billImageUrl?: string;
    tableName?: string;
  }) => void;
}

export default function ReceiptScannerModal({
  isOpen,
  onClose,
  defaultPercent = 2,
  onApplyResult
}: ReceiptScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [selectedPercent, setSelectedPercent] = useState<number>(defaultPercent);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Gemini API Key config
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [systemKeySynced, setSystemKeySynced] = useState(false);

  // Text Paste State
  const [pastedText, setPastedText] = useState('');

  // Items State for manual adjustment
  const [currentItems, setCurrentItems] = useState<ReceiptItem[]>([]);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function initKey() {
      if (typeof window !== 'undefined') {
        const savedKey = localStorage.getItem('may_gemini_api_key') || '';
        if (savedKey) setGeminiApiKey(savedKey);
      }
      try {
        const sysKey = await getSystemGeminiApiKeyAction();
        if (sysKey) {
          setGeminiApiKey(sysKey);
          if (typeof window !== 'undefined') {
            localStorage.setItem('may_gemini_api_key', sysKey);
          }
          setSystemKeySynced(true);
        }
      } catch (err) {
        console.error('Failed to load system key:', err);
      }
    }
    if (isOpen) {
      initKey();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedPercent(defaultPercent);
  }, [defaultPercent]);

  useEffect(() => {
    if (scanResult) {
      setCurrentItems(scanResult.items);
      if (scanResult.imageUrl) {
        setPreviewImage(scanResult.imageUrl);
      }
    }
  }, [scanResult]);

  // Recalculate totals based on current items
  const { totalFood, totalExcluded, totalReceipt, foodItems, excludedItems } = React.useMemo(() => {
    let food = 0;
    let excluded = 0;
    const foodList: ReceiptItem[] = [];
    const excludedList: ReceiptItem[] = [];

    currentItems.forEach(item => {
      if (item.isFood) {
        food += item.totalPrice;
        foodList.push(item);
      } else {
        excluded += item.totalPrice;
        excludedList.push(item);
      }
    });

    return {
      totalFood: food,
      totalExcluded: excluded,
      totalReceipt: food + excluded,
      foodItems: foodList,
      excludedItems: excludedList
    };
  }, [currentItems]);

  const commissionReward = Math.round((totalFood * selectedPercent) / 100);

  // Toggle item food status
  const handleToggleItem = (id: string) => {
    setCurrentItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextIsFood = !item.isFood;
        return {
          ...item,
          isFood: nextIsFood,
          reason: nextIsFood ? 'Chuyển sang Món ăn tính hoa hồng (Người dùng chọn)' : 'Chuyển sang Loại trừ (Người dùng chọn)'
        };
      }
      return item;
    }));
  };

  // Save API key to both LocalStorage and Supabase central DB
  const handleSaveApiKey = async () => {
    const keyToSave = geminiApiKey.trim();
    if (!keyToSave) {
      setScanError('Vui lòng nhập API Key hợp lệ!');
      return;
    }
    setIsSavingKey(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('may_gemini_api_key', keyToSave);
      }
      const res = await saveSystemGeminiApiKeyAction(keyToSave);
      if (res.success) {
        setSavedKeySuccess(true);
        setSystemKeySynced(true);
        setScanError('');
        setTimeout(() => {
          setSavedKeySuccess(false);
          setShowKeyConfig(false);
        }, 1500);
      } else {
        setScanError(res.error || 'Lỗi khi lưu key lên hệ thống đám mây!');
      }
    } catch (err: any) {
      setScanError(err.message || 'Lỗi lưu key');
    } finally {
      setIsSavingKey(false);
    }
  };

  // Process File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError('');

    try {
      // 1. Nén ảnh cực nhanh tại máy client (< 800KB)
      const compressedBase64 = await compressReceiptImage(file);
      setPreviewImage(compressedBase64);

      // 2. Gửi ảnh lên server action parseReceiptWithGeminiAction
      // Server action sẽ ưu tiên userApiKey, nếu rỗng sẽ tự động lấy từ Supabase CONFIG_AI hoặc process.env
      const effectiveKey = geminiApiKey.trim();
      const res = await parseReceiptWithGeminiAction({
        base64Image: compressedBase64,
        userApiKey: effectiveKey || undefined
      });

      if (res.success && res.result) {
        setScanResult(res.result);
        setIsScanning(false);
        return;
      } else {
        setScanError(res.error || 'Không thể đọc được hóa đơn qua AI. Vui lòng kiểm tra lại ảnh hoặc API Key.');
        if (res.error?.includes('Chưa có Google Gemini API Key')) {
          setShowKeyConfig(true);
        }
      }
    } catch (err: any) {
      setScanError(err.message || 'Lỗi khi xử lý ảnh hóa đơn.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Use Demo Bill
  const handleUseDemo = () => {
    setScanError('');
    setScanResult(DEMO_RECEIPT_RESULT);
    setPreviewImage(null);
  };

  // Parse Text
  const handleParseText = () => {
    if (!pastedText.trim()) {
      setScanError('Vui lòng dán nội dung hóa đơn!');
      return;
    }
    const result = parseReceiptText(pastedText);
    if (result.items.length === 0) {
      setScanError('Không tìm thấy dòng món ăn nào có đơn giá trong đoạn văn bản!');
      return;
    }
    setScanError('');
    setScanResult(result);
  };

  // Reset
  const handleReset = () => {
    setScanResult(null);
    setPreviewImage(null);
    setScanError('');
    setPastedText('');
    setCurrentItems([]);
  };

  // Apply to form
  const handleConfirmApply = () => {
    if (totalFood <= 0) {
      alert('Không có món ăn nào được chọn để tính hoa hồng!');
      return;
    }

    const summaryText = foodItems.map(f => `${f.name} (${f.totalPrice.toLocaleString('vi-VN')} đ)`).join(', ');

    onApplyResult({
      billFoodAmount: totalFood,
      billAmount: totalReceipt,
      billPercent: selectedPercent,
      billExcludedAmount: totalExcluded,
      billItemsSummary: summaryText,
      billImageUrl: previewImage || undefined,
      tableName: scanResult?.tableName || undefined
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-50">
        <DialogHeader className="pb-3 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-800">
                  Quét Hóa Đơn Tự Động (AI Vision)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Tự động tách <strong>Đồ ăn tính hoa hồng</strong> và loại trừ <strong>Bia, Rượu, Decor, Nước ngọt, VAT</strong>
                </DialogDescription>
              </div>
            </div>

            {/* Gear / API Key button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className={`text-xs h-8 px-2.5 flex items-center gap-1.5 border transition-all ${
                geminiApiKey || systemKeySynced
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50'
                  : 'border-amber-300 text-amber-700 bg-amber-50/50 hover:bg-amber-100/50 animate-pulse'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khóa AI</span>
              {geminiApiKey ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              )}
            </Button>
          </div>

          {/* API Key Drawer */}
          {showKeyConfig && (
            <div className="mt-3 p-3.5 bg-gradient-to-br from-amber-50/90 to-orange-50/70 rounded-xl border border-amber-200 shadow-2xs space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-600" />
                  Cấu hình Google Gemini AI Key (Đồng bộ Cloud)
                </span>
                {geminiApiKey ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã kết nối Supabase Cloud
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    Chưa cài đặt Key
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Key này được <strong>lưu trực tiếp lên đám mây Supabase</strong>. Chỉ cần Quản Lý/Giám Sát nhập 1 lần duy nhất, toàn bộ điện thoại và máy tính của nhân viên đều tự động kích hoạt tính năng chụp bill mà không cần nhập lại.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Dán mã khóa AIzaSy... vào đây"
                  className="text-xs h-9 bg-white border-amber-200 focus-visible:ring-amber-500"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isSavingKey}
                  onClick={handleSaveApiKey}
                  className="h-9 px-3.5 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0 font-medium shadow-2xs"
                >
                  {isSavingKey ? 'Đang lưu...' : savedKeySuccess ? 'Đã đồng bộ ✓' : 'Lưu vào Cloud'}
                </Button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-amber-100/80">
                <span>Khóa hoàn toàn miễn phí từ Google</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-semibold hover:text-blue-800"
                >
                  Lấy API Key tại Google AI Studio ↗
                </a>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Scan Body */}
        {!scanResult ? (
          <div className="space-y-4 py-2">
            {/* Mode Tabs */}
            <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'upload'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Chụp / Tải Ảnh Hóa Đơn</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'text'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Dán Text Bill (POS/Zalo)</span>
              </button>
            </div>

            {/* Error Message */}
            {scanError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">{scanError}</p>
                  <p className="text-[11px] text-rose-600">
                    💡 Mẹo: Bạn có thể bấm ngay nút <strong>"Thử nghiệm với Bill Mẫu Nhà Hàng Mây"</strong> bên dưới để kiểm tra quy trình bóc tách đồ ăn & tính hoa hồng 1%/2%!
                  </p>
                </div>
              </div>
            )}

            {/* Tab 1: Upload / Camera */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/80 rounded-2xl cursor-pointer transition-all text-center space-y-2 group"
                >
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 group-hover:scale-105 transition-transform flex items-center justify-center text-amber-700 shadow-2xs">
                    {isScanning ? (
                      <Sparkles className="w-7 h-7 animate-spin text-amber-600" />
                    ) : (
                      <Camera className="w-7 h-7 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {isScanning ? 'Đang nén ảnh & AI phân tích bóc tách...' : 'Bấm để Chụp ảnh hoặc Tải ảnh hóa đơn'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Hỗ trợ ảnh chụp camera điện thoại, hóa đơn in nhiệt PosApp, CukCuk, KiotViet
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-medium text-slate-600 shadow-2xs">
                    <Upload className="w-3 h-3 text-amber-600" />
                    <span>Tải ảnh từ thư viện máy</span>
                  </div>
                </div>

                {/* Quick Demo Button */}
                <div className="pt-1 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseDemo}
                    className="text-xs bg-white border-amber-200 text-amber-900 hover:bg-amber-100/70 font-semibold h-9 px-4 rounded-xl shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 mr-1.5" />
                    <span>⚡ Thử nghiệm ngay với Bill Mẫu Nhà Hàng Mây (7.3 triệu)</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Tab 2: Paste Text */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Dán nội dung hóa đơn:</Label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={8}
                    placeholder={`Ví dụ copy từ POS:\nMú đỏ hấp: 1.850.000\nBò Wagyu: 1.450.000\n1 Thùng Tiger: 520.000\nDecor Sinh Nhật Mẫu 2: 1.500.000\nThuế VAT 8%: 520.000`}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white font-mono leading-relaxed focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseDemo}
                    className="text-xs text-amber-800 border-amber-200"
                  >
                    Dùng mẫu thử nghiệm
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleParseText}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4"
                  >
                    Phân tích bóc tách ngay
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Results Review Screen */
          <div className="space-y-4 py-2">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tổng Bill Gốc</span>
                <div className="text-sm sm:text-base font-bold text-slate-800 mt-0.5">
                  {totalReceipt.toLocaleString('vi-VN')} đ
                </div>
                <span className="text-[10px] text-slate-400">Toàn bộ hóa đơn</span>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-600">Đã Loại Trừ</span>
                <div className="text-sm sm:text-base font-bold text-rose-700 mt-0.5">
                  -{totalExcluded.toLocaleString('vi-VN')} đ
                </div>
                <span className="text-[10px] text-rose-600">Bia, Vang, Decor, VAT</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 ring-1 ring-emerald-400/30">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Đồ Ăn Tính CMS</span>
                <div className="text-base sm:text-lg font-black text-emerald-800 mt-0.5">
                  {totalFood.toLocaleString('vi-VN')} đ
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Bếp & Hải sản hợp lệ</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300">
                <span className="text-[10px] uppercase font-bold text-amber-700">Hoa Hồng Nhận</span>
                <div className="text-base sm:text-lg font-black text-amber-800 mt-0.5">
                  +{commissionReward.toLocaleString('vi-VN')} đ
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedPercent(2)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedPercent === 2 ? 'bg-amber-600 text-white' : 'bg-white border text-slate-600'
                    }`}
                  >
                    2% (T2-T5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPercent(1)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedPercent === 1 ? 'bg-amber-600 text-white' : 'bg-white border text-slate-600'
                    }`}
                  >
                    1% (T6-CN)
                  </button>
                </div>
              </div>
            </div>

            {/* Room / Date Tag */}
            {(scanResult.tableName || scanResult.restaurantName) && (
              <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">{scanResult.restaurantName || 'Hóa đơn Mây'}</span>
                  {scanResult.tableName && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                      {scanResult.tableName}
                    </span>
                  )}
                </div>
                {previewImage && (
                  <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Đã lưu ảnh đối soát
                  </span>
                )}
              </div>
            )}

            {/* Food Items List (Green) */}
            <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs">
              <div className="p-2.5 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-900">
                    MÓN ĂN ĐƯỢC TÍNH HOA HỒNG ({foodItems.length} món)
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-800">
                  {totalFood.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto text-xs">
                {foodItems.length > 0 ? (
                  foodItems.map(item => (
                    <div key={item.id} className="p-2 flex items-center justify-between hover:bg-emerald-50/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.isFood}
                          onChange={() => handleToggleItem(item.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                          <span className="text-[10px] text-emerald-700">{item.reason}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-800">
                          {item.totalPrice.toLocaleString('vi-VN')} đ
                        </span>
                        {item.quantity > 1 && (
                          <div className="text-[10px] text-slate-400">
                            {item.quantity} x {item.unitPrice.toLocaleString('vi-VN')} đ
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Không có món ăn nào trong nhóm này
                  </div>
                )}
              </div>
            </div>

            {/* Excluded Items List (Gray / Strikethrough) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-slate-700">
                    CÁC MỤC LOẠI TRỪ ({excludedItems.length} mục: Bia, Rượu, Decor, Nước, VAT...)
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {totalExcluded.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto text-xs">
                {excludedItems.length > 0 ? (
                  excludedItems.map(item => (
                    <div key={item.id} className="p-2 flex items-center justify-between hover:bg-slate-50 transition-colors opacity-75">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.isFood}
                          onChange={() => handleToggleItem(item.id)}
                          className="w-4 h-4 rounded text-slate-400 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-600 line-through truncate">{item.name}</p>
                          <span className="text-[10px] text-rose-600 font-semibold">{item.reason}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-medium text-slate-500 line-through">
                          {item.totalPrice.toLocaleString('vi-VN')} đ
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item.id)}
                          className="block text-[10px] text-blue-600 hover:underline"
                        >
                          Chuyển tính đồ ăn
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Không có mục nào bị loại trừ
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Quét lại bill khác</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Đóng
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmApply}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 h-9 shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Áp Dụng Vào CMS ({totalFood.toLocaleString('vi-VN')} đ)</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
