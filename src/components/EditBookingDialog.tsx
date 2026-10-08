'use client'

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PenLine } from "lucide-react";
import { updateExistingBooking } from "@/app/actions";
import MenuSelector from "./MenuSelector";

function formatDateTimeForInput(isoString: string) {
  try {
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (e) {
    return "";
  }
}

export default function EditBookingDialog({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);

  // Extract priority
  let initialPriority = "Bình thường";
  let initialName = booking.customerName;
  if (initialName.includes('[VIP]')) {
    initialPriority = "VIP";
    initialName = initialName.replace('[VIP]', '').trim();
  } else if (initialName.includes('[SVIP]')) {
    initialPriority = "SVIP";
    initialName = initialName.replace('[SVIP]', '').trim();
  }

  const initialDateTime = formatDateTimeForInput(booking.dateTime);

  let initialSpecialRequest = booking.specialRequest || "";
  let initialDeposit = "";
  const depositMatch = initialSpecialRequest.match(/\[Cọc:\s*([^\]]+)\]/);
  if (depositMatch) {
    initialDeposit = depositMatch[1];
    initialSpecialRequest = initialSpecialRequest.replace(/\[Cọc:\s*[^\]]+\]/, '').trim();
  }

  let initialSource = "Khách quen";
  let initialCustomSource = "";
  const sourceMatch = initialSpecialRequest.match(/\[Nguồn:\s*([^\]]+)\]/);
  if (sourceMatch) {
    const src = sourceMatch[1];
    if (["Facebook", "IG", "Threads", "Tiktok", "Khách quen"].includes(src)) {
      initialSource = src;
    } else {
      initialSource = "Khác";
      initialCustomSource = src;
    }
    initialSpecialRequest = initialSpecialRequest.replace(/\[Nguồn:\s*[^\]]+\]/, '').trim();
  }

  let initialDecorOccasion = "Không có";
  let initialDecorPackage = "";
  let initialDecorNote = "";
  const decorStr = booking.decorRequest || "";
  if (decorStr) {
    const parts = decorStr.split('|');
    initialDecorOccasion = parts[0];
    parts.forEach(p => {
      if (p.startsWith('PKG:')) initialDecorPackage = p.replace('PKG:', '');
      if (p.startsWith('NOTE:')) initialDecorNote = p.replace('NOTE:', '');
    });
  }

  const [decorPkg, setDecorPkg] = useState(initialDecorPackage);
  const [sourceOption, setSourceOption] = useState(initialSource);

  async function onSubmit(formData: FormData) {
    const menuArray = formData.getAll("menuItem") as string[];
    
    let custName = formData.get("customerName") as string;
    const priority = formData.get("priority") as string;
    if (priority === "VIP" || priority === "SVIP") {
      custName = `[${priority}] ${custName}`;
    }
    
    let specReq = formData.get("specialRequest") as string;
    const deposit = formData.get("deposit") as string;
    if (deposit && deposit.trim() !== '') {
      specReq += `\n[Cọc: ${deposit.trim()}]`;
    }
    const source = formData.get("source") as string;
    const customSource = formData.get("customSource") as string;
    const finalSource = source === "Khác" ? customSource : source;
    if (finalSource && finalSource.trim() !== '') {
      specReq += `\n[Nguồn: ${finalSource.trim()}]`;
    }

    let finalDecor = formData.get("decorRequest") as string;
    const decorPkg = formData.get("decorPackage") as string;
    const decorNote = formData.get("decorNote") as string;
    if (decorPkg) finalDecor += `|PKG:${decorPkg}`;
    if (decorNote) finalDecor += `|NOTE:${decorNote}`;

    await updateExistingBooking(booking.id, {
      customerName: custName,
      phone: formData.get("phone") as string,
      dateTime: formData.get("dateTime") as string,
      guestsCount: parseInt(formData.get("guestsCount") as string),
      room: formData.get("room") as string || "Chưa chọn",
      menu: menuArray,
      specialRequest: specReq.trim(),
      decorRequest: finalDecor,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-orange-600">
          <PenLine className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa thông tin đặt tiệc</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Tên khách hàng</Label>
              <Input id="customerName" name="customerName" defaultValue={initialName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" defaultValue={booking.phone} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTime">Thời gian (Ngày & Giờ)</Label>
              <Input id="dateTime" name="dateTime" type="datetime-local" defaultValue={initialDateTime} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestsCount">Số lượng khách</Label>
              <Input id="guestsCount" name="guestsCount" type="number" min="1" defaultValue={booking.guestsCount} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Mức độ ưu tiên</Label>
              <select 
                id="priority" 
                name="priority" 
                defaultValue={initialPriority}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Bình thường">Bình thường</option>
                <option value="VIP">VIP</option>
                <option value="SVIP">SVIP</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Phòng / Không gian</Label>
              <select 
                id="room" 
                name="room" 
                defaultValue={booking.room}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Chưa chọn">-- Chưa chọn --</option>
                <optgroup label="Tầng 1">
                  <option value="Mây 101">Mây 101</option>
                  <option value="Mây 102">Mây 102</option>
                  <option value="Mây 103">Mây 103</option>
                  <option value="Mây 104">Mây 104</option>
                  <option value="Mây 105">Mây 105</option>
                  <option value="Mây 106">Mây 106</option>
                </optgroup>
                <optgroup label="Tầng 2">
                  <option value="Mây 201">Mây 201</option>
                  <option value="Mây 202">Mây 202</option>
                  <option value="Mây 203">Mây 203</option>
                  <option value="Mây 204">Mây 204</option>
                </optgroup>
                <optgroup label="Tầng 3">
                  <option value="Mây 301">Mây 301</option>
                  <option value="Mây 302">Mây 302</option>
                  <option value="Mây 303">Mây 303</option>
                  <option value="Mây 304">Mây 304</option>
                </optgroup>
                <optgroup label="Tầng 4">
                  {Array.from({length: 25}, (_, i) => (
                    <option key={`Bàn ${i + 1}`} value={`Bàn ${i + 1}`}>Bàn {i + 1}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="source">Nguồn khách</Label>
              <div className="flex gap-2">
                <select 
                  id="source" 
                  name="source" 
                  value={sourceOption}
                  onChange={(e) => setSourceOption(e.target.value)}
                  className="flex h-10 w-full md:w-1/2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Facebook">Facebook</option>
                  <option value="IG">IG</option>
                  <option value="Threads">Threads</option>
                  <option value="Tiktok">Tiktok</option>
                  <option value="Khách quen">Khách quen</option>
                  <option value="Khác">Khác</option>
                </select>
                {sourceOption === "Khác" && (
                  <Input id="customSource" name="customSource" defaultValue={initialCustomSource} placeholder="Nhập nguồn khác..." className="flex-1" />
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <MenuSelector initialItems={booking.menu} decorPackage={decorPkg} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="decorRequest">Dịp / Yêu cầu Decor</Label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                id="decorRequest" 
                name="decorRequest" 
                defaultValue={initialDecorOccasion}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Không có">Không có</option>
                <option value="Sinh nhật">Sinh nhật</option>
                <option value="Kỷ niệm">Kỷ niệm</option>
                <option value="Tiệc Công ty">Tiệc Công ty</option>
                <option value="Gia đình">Gia đình</option>
                <option value="Khác">Khác</option>
              </select>
              <select 
                id="decorPackage" 
                name="decorPackage" 
                value={decorPkg}
                onChange={(e) => setDecorPkg(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">-- Gói Decor Mây --</option>
                <option value="1">Gói 1</option>
                <option value="2">Gói 2</option>
                <option value="3">Gói 3</option>
                <option value="4">Gói 4</option>
                <option value="5">Gói 5</option>
                <option value="6">Gói 6</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decorNote">Ghi chú Decor (Dành riêng cho Sảnh/Decor)</Label>
            <Textarea id="decorNote" name="decorNote" defaultValue={initialDecorNote} placeholder="Vd: Tone hồng, bóng bay..." rows={2}/>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit">Tiền cọc (VNĐ) - Nếu có</Label>
            <Input id="deposit" name="deposit" defaultValue={initialDeposit} placeholder="Vd: 500,000 hoặc 500k" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequest">Yêu cầu đặc biệt (Bếp / Phục vụ)</Label>
            <Textarea id="specialRequest" name="specialRequest" defaultValue={initialSpecialRequest} placeholder="Vd: Không ăn cay..." rows={2}/>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700">Lưu thay đổi</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
