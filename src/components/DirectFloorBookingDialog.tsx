'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Sparkles, User, Phone, Users, Home, AlertCircle } from "lucide-react";
import { createNewBooking } from "@/app/actions";
import { Booking } from "@/lib/data";
import MenuSelector from "./MenuSelector";
import { useAuth } from "@/context/AuthContext";

const FLOORS = [
  { name: "Tầng 1", rooms: ["Mây 101", "Mây 102", "Mây 103", "Mây 104", "Mây 105", "Mây 106"] },
  { name: "Tầng 2", rooms: ["Mây 201", "Mây 202", "Mây 203", "Mây 204"] },
  { name: "Tầng 3", rooms: ["Mây 301", "Mây 302", "Mây 303", "Mây 304"] },
  { name: "Tầng 4 (Sân thượng)", rooms: Array.from({ length: 25 }, (_, i) => `Bàn ${i + 1}`) },
];

interface DirectFloorBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRoom?: string;
  defaultDate?: string; // yyyy-MM-dd
  defaultSession?: 'lunch' | 'dinner';
  onBookingCreated?: (booking: Booking) => void;
}

export default function DirectFloorBookingDialog({
  open,
  onOpenChange,
  defaultRoom = "Mây 101",
  defaultDate = "",
  defaultSession = "lunch",
  onBookingCreated,
}: DirectFloorBookingDialogProps) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [decorPkg, setDecorPkg] = useState("");
  const [customDecorPrice, setCustomDecorPrice] = useState("");
  const [sourceOption, setSourceOption] = useState("Khách quen");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form controlled state for quick ca toggling
  const [room, setRoom] = useState(defaultRoom);
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(defaultSession === 'dinner' ? "18:30" : "11:30");
  const [activeSession, setActiveSession] = useState<'lunch' | 'dinner'>(defaultSession);
  const [priority, setPriority] = useState<string>("Bình thường");

  useEffect(() => {
    if (defaultRoom) setRoom(defaultRoom);
  }, [defaultRoom]);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  useEffect(() => {
    if (defaultSession) {
      setActiveSession(defaultSession);
      setTime(defaultSession === 'dinner' ? "18:30" : "11:30");
    }
  }, [defaultSession]);

  const handleSelectSession = (sess: 'lunch' | 'dinner') => {
    setActiveSession(sess);
    setTime(sess === 'dinner' ? "18:30" : "11:30");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isLoggedIn) {
      openLoginModal();
      return;
    }
    onOpenChange(newOpen);
  };

  async function onSubmit(formData: FormData) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const menuArray = formData.getAll("menuItem") as string[];

      let custName = (formData.get("customerName") as string || "").trim();
      if (!custName) {
        alert("Vui lòng nhập tên khách hàng!");
        return;
      }

      if (priority === "VIP" || priority === "SVIP") {
        custName = `[${priority}] ${custName}`;
      }

      let specReq = (formData.get("specialRequest") as string || "").trim();
      const deposit = formData.get("deposit") as string;
      if (deposit && deposit.trim() !== "") {
        specReq += `\n[Cọc: ${deposit.trim()}]`;
      }
      const discount = formData.get("discount") as string;
      if (discount && discount.trim() !== "") {
        specReq += `\n[Giảm giá: ${discount.trim()}]`;
      }
      const source = formData.get("source") as string;
      const customSource = formData.get("customSource") as string;
      const finalSource = source === "Khác" ? customSource : source;
      if (finalSource && finalSource.trim() !== "") {
        specReq += `\n[Nguồn: ${finalSource.trim()}]`;
      }

      let finalDecor = formData.get("decorRequest") as string || "Không có";
      const decorPkgVal = formData.get("decorPackage") as string;
      const customDecorPriceVal = formData.get("customDecorPrice") as string;
      const decorNoteVal = formData.get("decorNote") as string;

      if (decorPkgVal) finalDecor += `|PKG:${decorPkgVal}`;
      if (customDecorPriceVal && customDecorPriceVal.trim() !== "") {
        finalDecor += `|PRICE:${customDecorPriceVal.trim()}`;
      }
      if (decorNoteVal) finalDecor += `|NOTE:${decorNoteVal}`;

      const selectedDate = formData.get("date") as string || date;
      const selectedTime = formData.get("time") as string || time;
      const fullDateTime = `${selectedDate}T${selectedTime}:00+07:00`;
      const guestsCount = parseInt(formData.get("guestsCount") as string) || 6;
      const selectedRoom = (formData.get("room") as string) || room || "Mây 101";

      const res = await createNewBooking({
        customerName: custName,
        phone: (formData.get("phone") as string || "").trim(),
        dateTime: fullDateTime,
        guestsCount,
        room: selectedRoom,
        menu: menuArray,
        specialRequest: specReq.trim(),
        decorRequest: finalDecor,
        status: "confirmed",
        receptionStatus: "pending",
        kitchenStatus: "pending",
        floorStatus: "pending",
      });

      if (res?.error) {
        alert(res.error);
        return;
      }

      if (res?.booking && onBookingCreated) {
        onBookingCreated(res.booking);
      }

      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi thêm tiệc: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-800">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span>Đặt Tiệc Nhanh Tại Bàn</span>
            <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md text-sm border border-orange-200">
              {room || defaultRoom}
            </span>
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Nhập tiệc trực tiếp vào sơ đồ bàn. Dữ liệu sẽ đồng bộ sang Bếp, Sảnh và Lễ Tân.
          </p>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4 py-2">
          {/* Quick Meal Session Selection (Trưa / Tối) */}
          <div className="bg-slate-100 p-2 rounded-xl space-y-2 border border-slate-200">
            <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Lựa chọn Ca Phục Vụ:</span>
              <span className="text-[11px] text-slate-500">Bấm để tự động điền khung giờ</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectSession('lunch')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSession === 'lunch'
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                    : 'bg-white text-slate-700 hover:bg-amber-50'
                }`}
              >
                <span>☀️ Ca Trưa (11:30)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSession('dinner')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSession === 'dinner'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                    : 'bg-white text-slate-700 hover:bg-indigo-50'
                }`}
              >
                <span>🌙 Ca Tối (18:30)</span>
              </button>
            </div>
          </div>

          {/* Date, Time & Room Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs font-bold text-slate-700">Ngày tiệc</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="text-xs font-semibold h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time" className="text-xs font-bold text-slate-700">Giờ đón khách</Label>
              <Input
                id="time"
                name="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="text-xs font-bold text-orange-600 h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room" className="text-xs font-bold text-slate-700">Phòng / Bàn</Label>
              <select
                id="room"
                name="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-bold text-slate-800 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {FLOORS.map((floor) => (
                  <optgroup key={floor.name} label={floor.name}>
                    {floor.rooms.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Name, Priority, Phone & Guests */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="customerName" className="text-xs font-bold text-slate-700">Tên khách hàng *</Label>
              <Input
                id="customerName"
                name="customerName"
                placeholder="VD: Chị Lan, Anh Nam..."
                required
                className="text-xs h-9 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Mức độ ưu tiên</Label>
              <div className="grid grid-cols-3 gap-1 h-9">
                <button
                  type="button"
                  onClick={() => setPriority("Bình thường")}
                  className={`text-[11px] font-bold rounded border transition-all cursor-pointer ${
                    priority === "Bình thường"
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Thường
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("VIP")}
                  className={`text-[11px] font-bold rounded border transition-all cursor-pointer ${
                    priority === "VIP"
                      ? "bg-fuchsia-600 text-white border-fuchsia-600 shadow-xs"
                      : "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-100"
                  }`}
                >
                  ⭐ VIP
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("SVIP")}
                  className={`text-[11px] font-bold rounded border transition-all cursor-pointer ${
                    priority === "SVIP"
                      ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                      : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  👑 SVIP
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-bold text-slate-700">Số điện thoại *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="0905..."
                required
                className="text-xs h-9 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guestsCount" className="text-xs font-bold text-slate-700">Số lượng khách *</Label>
              <Input
                id="guestsCount"
                name="guestsCount"
                type="number"
                min="1"
                defaultValue="6"
                required
                className="text-xs h-9 font-bold"
              />
            </div>
          </div>

          {/* Decor request & packages */}
          <div className="space-y-2 bg-purple-50/60 p-3 rounded-xl border border-purple-200/80">
            <Label htmlFor="decorRequest" className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Dịp tiệc &amp; Gói Decor</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                id="decorRequest"
                name="decorRequest"
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                <option value="Không có">Không có decor</option>
                <option value="Sinh nhật">Sinh nhật</option>
                <option value="Kỷ niệm">Kỷ niệm</option>
                <option value="Thôi nôi">Thôi nôi / Đầy tháng</option>
                <option value="Tiệc Công ty">Tiệc Công ty / Họp mặt</option>
                <option value="Gia đình">Gặp gỡ gia đình</option>
                <option value="Khác">Khác</option>
              </select>

              <select
                id="decorPackage"
                name="decorPackage"
                value={decorPkg}
                onChange={(e) => setDecorPkg(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                <option value="">-- Chọn Gói Decor Mây --</option>
                <option value="1">1 - Bướm Ngũ Sắc</option>
                <option value="2">2 - Bướm Trắng</option>
                <option value="3">3 - Bướm Đỏ</option>
                <option value="4">4 - Nơ Trắng</option>
                <option value="5">5 - Background Nâu</option>
                <option value="6">6 - Nơ Hồng</option>
                <option value="7">7 - Free S4 Mẫu 1 (Tối đa 5 bàn)</option>
                <option value="8">8 - Free S4 Mẫu 2 (Tối đa 5 bàn)</option>
                <option value="9">9 - Hoa Tươi</option>
                <option value="custom">Decor Yêu Cầu Riêng</option>
              </select>
            </div>

            {decorPkg && (
              <div className="pt-1 space-y-1">
                <Label htmlFor="customDecorPrice" className="text-[11px] font-semibold text-purple-800">
                  Giá gói decor (VNĐ tính vào bill)
                </Label>
                <Input
                  id="customDecorPrice"
                  name="customDecorPrice"
                  value={customDecorPrice}
                  onChange={(e) => setCustomDecorPrice(e.target.value)}
                  placeholder="Vd: 500k, 1.500.000..."
                  className="h-8 border-purple-300 bg-white text-xs font-bold text-purple-900"
                />
              </div>
            )}

            <div className="pt-1">
              <Input
                id="decorNote"
                name="decorNote"
                placeholder="Ghi chú decor (vd: Tone hồng pastel, để sẵn nến...)"
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          {/* Special Requests & Deposit */}
          <div className="space-y-1.5">
            <Label htmlFor="specialRequest" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Ghi chú dặn dò (Bếp &amp; Phục vụ lưu ý)</span>
            </Label>
            <Textarea
              id="specialRequest"
              name="specialRequest"
              placeholder="VD: Khách không ăn ớt cay, ra món nhanh, dặn phục vụ VIP, chuẩn bị bánh kem..."
              rows={2}
              className="text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deposit" className="text-xs font-bold text-slate-700">Tiền cọc (nếu có)</Label>
              <Input
                id="deposit"
                name="deposit"
                placeholder="VD: 500k, 1.000.000..."
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source" className="text-xs font-bold text-slate-700">Nguồn khách</Label>
              <select
                id="source"
                name="source"
                value={sourceOption}
                onChange={(e) => setSourceOption(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                <option value="Khách quen">Khách quen</option>
                <option value="Hotline">Gọi Hotline</option>
                <option value="Facebook">Facebook Fanpage</option>
                <option value="Zalo">Zalo OA</option>
                <option value="Tiktok">Tiktok</option>
                <option value="Vãng lai">Khách vãng lai</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          {/* Menu Selection (Collapsible / Accordion) */}
          <div className="pt-2">
            <MenuSelector decorPackage={decorPkg} customDecorPrice={customDecorPrice} />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs font-semibold text-slate-600"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs h-9 px-4 shadow-md cursor-pointer"
            >
              {isSubmitting ? "Đang xử lý..." : "✓ Xác Nhận Đặt Bàn"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
