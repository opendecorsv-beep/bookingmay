'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Sparkles, User, Phone, Users, Home, AlertCircle, Crown, Star, PenLine, Trash2 } from "lucide-react";
import { updateExistingBooking, deleteBookingAction } from "@/app/actions";
import { Booking } from "@/lib/data";
import MenuSelector from "./MenuSelector";
import { useAuth } from "@/context/AuthContext";

const FLOORS = [
  { 
    name: "Tầng 1 (VIP)", 
    rooms: [
      { id: "Mây 101", label: "Mây 101" },
      { id: "Mây 102", label: "Mây 102" },
      { id: "Mây 103", label: "Mây 103" },
      { id: "Mây 104", label: "Mây 104" },
      { id: "Mây 105", label: "Mây 105" },
      { id: "Mây 106", label: "Mây 106" }
    ] 
  },
  { 
    name: "Tầng 2 (VIP & Đại sảnh 201)", 
    rooms: [
      { id: "Mây 201 (Nguyên phòng)", label: "👑 Mây 201 (Nguyên phòng lớn)" },
      { id: "Mây 201", label: "Mây 201 (Đại sảnh chung)" },
      { id: "Mây 201.1", label: "↳ Mây 201.1" },
      { id: "Mây 201.2", label: "↳ Mây 201.2" },
      { id: "Mây 201.3", label: "↳ Mây 201.3" },
      { id: "Mây 201.4", label: "↳ Mây 201.4" },
      { id: "Mây 201.5", label: "↳ Mây 201.5" },
      { id: "Mây 201.6", label: "↳ Mây 201.6" },
      { id: "Mây 202", label: "Mây 202" },
      { id: "Mây 203", label: "Mây 203" },
      { id: "Mây 204", label: "Mây 204" }
    ] 
  },
  { 
    name: "Tầng 3 (VIP & Đại sảnh 301)", 
    rooms: [
      { id: "Mây 301 (Nguyên phòng)", label: "👑 Mây 301 (Nguyên phòng lớn)" },
      { id: "Mây 301", label: "Mây 301 (Đại sảnh chung)" },
      { id: "Mây 301.1", label: "↳ Mây 301.1" },
      { id: "Mây 301.2", label: "↳ Mây 301.2" },
      { id: "Mây 301.3", label: "↳ Mây 301.3" },
      { id: "Mây 301.4", label: "↳ Mây 301.4" },
      { id: "Mây 301.5", label: "↳ Mây 301.5" },
      { id: "Mây 301.6", label: "↳ Mây 301.6" },
      { id: "Mây 302", label: "Mây 302" },
      { id: "Mây 303", label: "Mây 303" },
      { id: "Mây 304", label: "Mây 304" }
    ] 
  },
  { 
    name: "Tầng 4 (Sân thượng)", 
    rooms: Array.from({ length: 25 }, (_, i) => ({ id: `Bàn ${i + 1}`, label: `Bàn ${i + 1}` })) 
  },
];

const QUICK_TIMES = ["11:00", "11:30", "12:00", "12:30", "13:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];

function parseDateTime(isoString: string) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) throw new Error();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  } catch {
    return {
      date: new Date().toISOString().split("T")[0],
      time: "18:00",
    };
  }
}

function parseSpecialRequestFields(raw: string = "") {
  let notes = raw || "";
  let deposit = "";
  let discount = "";
  let source = "Khách quen";
  let customSource = "";

  const depMatch = notes.match(/\[Cọc:\s*([^\]]+)\]/);
  if (depMatch) {
    deposit = depMatch[1];
    notes = notes.replace(/\[Cọc:\s*[^\]]+\]/, "");
  }

  const disMatch = notes.match(/\[Giảm giá:\s*([^\]]+)\]/);
  if (disMatch) {
    discount = disMatch[1];
    notes = notes.replace(/\[Giảm giá:\s*[^\]]+\]/, "");
  }

  const srcMatch = notes.match(/\[Nguồn:\s*([^\]]+)\]/);
  if (srcMatch) {
    const s = srcMatch[1];
    if (["Khách quen", "Hotline", "Facebook", "IG", "Threads", "Zalo", "Tiktok", "Vãng lai"].includes(s)) {
      source = s;
    } else {
      source = "Khác";
      customSource = s;
    }
    notes = notes.replace(/\[Nguồn:\s*[^\]]+\]/, "");
  }

  return {
    notes: notes.trim(),
    deposit,
    discount,
    source,
    customSource,
  };
}

function parseDecorFields(decorStr: string = "") {
  let occasion = "Không có";
  let pkg = "";
  let price = "";
  let note = "";

  if (decorStr) {
    const parts = decorStr.split('|');
    occasion = parts[0] || "Không có";
    parts.forEach((p) => {
      if (p.startsWith('PKG:')) pkg = p.replace('PKG:', '');
      if (p.startsWith('PRICE:')) price = p.replace('PRICE:', '');
      if (p.startsWith('NOTE:')) note = p.replace('NOTE:', '');
    });
  }

  return { occasion, pkg, price, note };
}

function parsePriorityAndName(fullName: string = "") {
  let priority: "Bình thường" | "VIP" | "SVIP" = "Bình thường";
  let cleanName = fullName || "";

  if (cleanName.includes("[SVIP]")) {
    priority = "SVIP";
    cleanName = cleanName.replace(/\[SVIP\]/g, "").trim();
  } else if (cleanName.includes("[VIP]")) {
    priority = "VIP";
    cleanName = cleanName.replace(/\[VIP\]/g, "").trim();
  }

  return { priority, cleanName };
}

interface EditBookingDialogProps {
  booking: Booking | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onBookingUpdated?: (booking: Booking) => void;
  onBookingDeleted?: (bookingId: string) => void;
}

export default function EditBookingDialog({
  booking,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onBookingUpdated,
  onBookingDeleted,
}: EditBookingDialogProps) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !isLoggedIn) {
      openLoginModal();
      return;
    }
    if (isControlled) {
      controlledOnOpenChange?.(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
  };

  const handleClose = () => handleOpenChange(false);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-orange-600">
            <PenLine className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="w-[95vw] sm:max-w-[560px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        {booking && (
          <EditBookingInnerForm
            key={booking.id}
            booking={booking}
            onClose={handleClose}
            onBookingUpdated={onBookingUpdated}
            onBookingDeleted={onBookingDeleted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditBookingInnerForm({
  booking,
  onClose,
  onBookingUpdated,
  onBookingDeleted,
}: {
  booking: Booking;
  onClose: () => void;
  onBookingUpdated?: (booking: Booking) => void;
  onBookingDeleted?: (bookingId: string) => void;
}) {
  const { priority: initPriority, cleanName: initCleanName } = parsePriorityAndName(booking.customerName);
  const { date: initDate, time: initTime } = parseDateTime(booking.dateTime);
  const { notes: initNotes, deposit: initDeposit, discount: initDiscount, source: initSource, customSource: initCustomSource } = parseSpecialRequestFields(booking.specialRequest);
  const { occasion: initOccasion, pkg: initPkg, price: initPrice, note: initDecorNote } = parseDecorFields(booking.decorRequest);

  const [priority, setPriority] = useState<"Bình thường" | "VIP" | "SVIP">(initPriority);
  const [room, setRoom] = useState(booking.room || "Mây 101");
  const [date, setDate] = useState(initDate);
  const [time, setTime] = useState(initTime);
  const [decorPkg, setDecorPkg] = useState(initPkg);
  const [customDecorPrice, setCustomDecorPrice] = useState(initPrice);
  const [sourceOption, setSourceOption] = useState(initSource);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function onSubmit(formData: FormData) {
    if (isSubmitting || isDeleting) return;
    setIsSubmitting(true);
    try {
      const menuArray = formData.getAll("menuItem") as string[];

      let custName = (formData.get("customerName") as string || "").trim();
      if (!custName) {
        alert("Vui lòng nhập tên khách hàng!");
        setIsSubmitting(false);
        return;
      }

      if (priority === "VIP" || priority === "SVIP") {
        custName = `[${priority}] ${custName}`;
      }

      const bookingDate = (formData.get("date") as string) || date;
      const bookingTime = (formData.get("time") as string) || time;
      const fullDateTime = `${bookingDate}T${bookingTime}:00`;

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
      const selectedPkg = formData.get("decorPackage") as string;
      const selectedDecorPrice = formData.get("customDecorPrice") as string;
      const decorNote = formData.get("decorNote") as string;
      if (selectedPkg) finalDecor += `|PKG:${selectedPkg}`;
      if (selectedDecorPrice && selectedDecorPrice.trim() !== "") {
        finalDecor += `|PRICE:${selectedDecorPrice.trim()}`;
      }
      if (decorNote && decorNote.trim() !== "") {
        finalDecor += `|NOTE:${decorNote.trim()}`;
      }

      const selectedRoom = (formData.get("room") as string) || room;
      const guestsCount = parseInt(formData.get("guestsCount") as string) || 1;

      const res = await updateExistingBooking(booking.id, {
        customerName: custName,
        phone: (formData.get("phone") as string) || "",
        dateTime: fullDateTime,
        guestsCount,
        room: selectedRoom,
        menu: menuArray,
        specialRequest: specReq.trim(),
        decorRequest: finalDecor,
      });

      if (res?.error) {
        alert(res.error);
        setIsSubmitting(false);
        return;
      }

      const updatedObj: Booking = res?.booking || {
        ...booking,
        customerName: custName,
        phone: (formData.get("phone") as string) || "",
        dateTime: fullDateTime,
        guestsCount,
        room: selectedRoom,
        menu: menuArray,
        specialRequest: specReq.trim(),
        decorRequest: finalDecor,
      };

      onBookingUpdated?.(updatedObj);
      onClose();
    } catch (err: any) {
      console.error("Lỗi cập nhật tiệc:", err);
      alert("Lỗi khi lưu: " + (err?.message || "Không thể cập nhật"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    if (isSubmitting || isDeleting) return;
    const confirmText = `Bạn có chắc chắn muốn HỦY / XÓA tiệc này của khách "${initCleanName}" (${booking.room}) không?\n\nThao tác này sẽ xóa tiệc khỏi Sơ đồ bàn, Bếp và Lễ tân.`;
    if (!window.confirm(confirmText)) return;

    setIsDeleting(true);
    try {
      await deleteBookingAction(booking.id);
      onBookingDeleted?.(booking.id);
      onClose();
    } catch (err: any) {
      console.error("Lỗi xóa tiệc:", err);
      alert("Không thể xóa tiệc: " + (err?.message || "Lỗi hệ thống"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DialogHeader className="pb-3 border-b border-slate-100">
        <DialogTitle className="flex items-center justify-between text-base sm:text-lg font-bold text-slate-900 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-orange-600">
              <PenLine className="w-5 h-5" />
              Sửa Đặt Tiệc
            </span>
            <span className="text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-orange-200">
              {room}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-normal">
            Mã: {booking.id}
          </span>
        </DialogTitle>
        <p className="text-xs text-slate-500">
          Chỉnh sửa thông tin tiệc, thay đổi món ăn, đổi bàn hoặc cập nhật yêu cầu decor &amp; dặn dò.
        </p>
      </DialogHeader>

      <form action={onSubmit} className="space-y-4 py-2">
        {/* 1. MỨC ĐỘ ƯU TIÊN (NORMAL - VIP - SVIP) */}
        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Mức độ ưu tiên khách hàng:</span>
            <span className="text-[11px] font-semibold text-slate-500">
              {priority === "SVIP" ? "👑 Khách Siêu VIP (Đặc biệt)" : priority === "VIP" ? "⭐ Khách VIP" : "Khách thường"}
            </span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPriority("Bình thường")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                priority === "Bình thường"
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm ring-2 ring-slate-400"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Bình thường</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority("VIP")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                priority === "VIP"
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border-fuchsia-500 shadow-md ring-2 ring-fuchsia-300"
                  : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-white text-white" />
              <span>⭐ VIP</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority("SVIP")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                priority === "SVIP"
                  ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white border-amber-400 shadow-md ring-2 ring-yellow-300"
                  : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
              }`}
            >
              <Crown className="w-3.5 h-3.5 fill-white text-white" />
              <span>👑 SVIP</span>
            </button>
          </div>
        </div>

        {/* 2. CHỌN BÀN / PHÒNG (ĐỔI BÀN) & NGÀY GIỜ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Ngày tiệc *</span>
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="text-base sm:text-xs font-semibold h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="time" className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>Giờ đón *</span>
              </span>
              <span className="text-[10px] text-slate-400">Tự gõ giờ</span>
            </Label>
            <Input
              id="time"
              name="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="text-base sm:text-xs font-bold text-orange-600 h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="room" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-blue-600" />
              <span>Đổi bàn / Phòng *</span>
            </Label>
            <select
              id="room"
              name="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-base sm:text-xs font-bold text-slate-800 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {FLOORS.map((floor) => (
                <optgroup key={floor.name} label={floor.name}>
                  {floor.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} {r.id === booking.room ? "(Hiện tại)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Gợi ý giờ bấm nhanh */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[11px] font-semibold text-slate-500">Giờ gợi ý:</span>
          {QUICK_TIMES.map((qt) => (
            <button
              key={qt}
              type="button"
              onClick={() => setTime(qt)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                time === qt
                  ? "bg-orange-600 text-white border-orange-600 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {qt}
            </button>
          ))}
        </div>

        {/* 3. TÊN KHÁCH, SĐT & SỐ LƯỢNG KHÁCH */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="customerName" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Tên khách hàng *</span>
            </Label>
            <Input
              id="customerName"
              name="customerName"
              defaultValue={initCleanName}
              placeholder="VD: Chị Lan, Anh Nam..."
              required
              className="text-base sm:text-xs h-9 font-semibold"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="phone" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Số điện thoại *</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={booking.phone}
              placeholder="0905..."
              required
              className="text-base sm:text-xs h-9 font-semibold"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="guestsCount" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Số lượng khách *</span>
            </Label>
            <Input
              id="guestsCount"
              name="guestsCount"
              type="number"
              min="1"
              defaultValue={booking.guestsCount}
              required
              className="text-base sm:text-xs h-9 font-bold"
            />
          </div>
        </div>

        {/* 4. YÊU CẦU DECOR */}
        <div className="space-y-2 bg-purple-50/60 p-3 rounded-xl border border-purple-200/80">
          <Label htmlFor="decorRequest" className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Dịp tiệc &amp; Gói Decor</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              id="decorRequest"
              name="decorRequest"
              defaultValue={initOccasion}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-base sm:text-xs font-medium text-slate-700"
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
              className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-base sm:text-xs font-medium text-slate-700"
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
                className="h-8 border-purple-300 bg-white text-base sm:text-xs font-bold text-purple-900"
              />
            </div>
          )}

          <div className="pt-1">
            <Input
              id="decorNote"
              name="decorNote"
              defaultValue={initDecorNote}
              placeholder="Ghi chú decor (vd: Tone hồng pastel, để sẵn nến...)"
              className="h-8 text-base sm:text-xs bg-white"
            />
          </div>
        </div>

        {/* 5. GHI CHÚ DẶN DÒ BẾP & PHỤC VỤ */}
        <div className="space-y-1.5">
          <Label htmlFor="specialRequest" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Ghi chú dặn dò (Bếp &amp; Phục vụ lưu ý)</span>
          </Label>
          <Textarea
            id="specialRequest"
            name="specialRequest"
            defaultValue={initNotes}
            placeholder="VD: Khách không ăn ớt cay, ra món nhanh, dặn phục vụ VIP, chuẩn bị bánh kem..."
            rows={2}
            className="text-base sm:text-xs leading-relaxed"
          />
        </div>

        {/* 6. TIỀN CỌC, GIẢM GIÁ & NGUỒN KHÁCH */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="deposit" className="text-xs font-bold text-slate-700">Tiền cọc (nếu có)</Label>
            <Input
              id="deposit"
              name="deposit"
              defaultValue={initDeposit}
              placeholder="VD: 500k, 1.000.000..."
              className="text-base sm:text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discount" className="text-xs font-bold text-slate-700">Giảm giá (nếu có)</Label>
            <Input
              id="discount"
              name="discount"
              defaultValue={initDiscount}
              placeholder="VD: 10%, 200k..."
              className="text-base sm:text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source" className="text-xs font-bold text-slate-700">Nguồn khách</Label>
            <div className="flex gap-1.5">
              <select
                id="source"
                name="source"
                value={sourceOption}
                onChange={(e) => setSourceOption(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-base sm:text-xs font-semibold text-slate-700"
              >
                <option value="Khách quen">Khách quen</option>
                <option value="Hotline">Gọi Hotline</option>
                <option value="Facebook">Facebook Fanpage</option>
                <option value="IG">Instagram</option>
                <option value="Threads">Threads</option>
                <option value="Zalo">Zalo OA</option>
                <option value="Tiktok">Tiktok</option>
                <option value="Vãng lai">Khách vãng lai</option>
                <option value="Khác">Khác</option>
              </select>
              {sourceOption === "Khác" && (
                <Input
                  id="customSource"
                  name="customSource"
                  defaultValue={initCustomSource}
                  placeholder="Nguồn..."
                  className="w-24 h-9 text-base sm:text-xs"
                />
              )}
            </div>
          </div>
        </div>

        {/* 7. CHỌN MÓN / THAY ĐỔI MÓN ĂN */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Thực đơn &amp; Món ăn đã đặt</span>
              <span className="text-[11px] text-orange-600 font-semibold">(Có thể thêm / bớt món)</span>
            </Label>
          </div>
          <MenuSelector
            initialItems={booking.menu || []}
            decorPackage={decorPkg}
            customDecorPrice={customDecorPrice}
          />
        </div>

        {/* 8. FOOTER ACTIONS: HỦY TIỆC, ĐÓNG, LƯU THAY ĐỔI */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || isDeleting}
            onClick={handleDelete}
            className="text-xs text-rose-600 hover:text-white hover:bg-rose-600 border-rose-200 flex items-center justify-center gap-1.5 h-9"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Đang hủy tiệc..." : "Hủy / Xóa Tiệc Này"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
              className="flex-1 sm:flex-none text-xs h-9"
            >
              Đóng
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-5 shadow-xs"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu Thay Đổi"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
