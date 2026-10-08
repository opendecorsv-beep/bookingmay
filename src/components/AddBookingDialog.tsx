'use client'

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createNewBooking } from "@/app/actions";

export default function AddBookingDialog() {
  const [open, setOpen] = useState(false);

  async function onSubmit(formData: FormData) {
    const rawMenu = formData.get("menu") as string;
    const menuArray = rawMenu.split('\n').filter(item => item.trim() !== '');
    
    await createNewBooking({
      customerName: formData.get("customerName") as string,
      phone: formData.get("phone") as string,
      dateTime: formData.get("dateTime") as string,
      guestsCount: parseInt(formData.get("guestsCount") as string),
      room: formData.get("room") as string || "Chưa chọn",
      menu: menuArray,
      specialRequest: formData.get("specialRequest") as string,
      decorRequest: formData.get("decorRequest") as string,
      status: "pending",
      receptionStatus: "pending",
      kitchenStatus: "pending",
      floorStatus: "pending"
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" /> Thêm tiệc mới
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm thông tin đặt tiệc</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Tên khách hàng</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTime">Thời gian (Ngày & Giờ)</Label>
              <Input id="dateTime" name="dateTime" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestsCount">Số lượng khách</Label>
              <Input id="guestsCount" name="guestsCount" type="number" min="1" required />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="room">Phòng / Không gian</Label>
              <Input id="room" name="room" placeholder="Vd: Mây 101, Sảnh tầng 2..." />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="menu">Thực đơn (Mỗi món 1 dòng)</Label>
            <Textarea id="menu" name="menu" placeholder="Vd: 2 Gà nướng&#10;1 Lẩu Thái" required rows={3}/>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="decorRequest">Yêu cầu Decor / Setup</Label>
            <Textarea id="decorRequest" name="decorRequest" placeholder="Vd: Trang trí sinh nhật..." rows={2}/>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequest">Yêu cầu đặc biệt (Bếp / Phục vụ)</Label>
            <Textarea id="specialRequest" name="specialRequest" placeholder="Vd: Không ăn cay..." rows={2}/>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700">Lưu thông tin</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
