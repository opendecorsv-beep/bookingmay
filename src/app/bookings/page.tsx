import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockBookings } from "@/lib/data";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Plus, Users, CalendarDays, ClipboardList, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Danh Sách Đặt Bàn</h1>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" /> Thêm Booking Mới
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {mockBookings.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {b.customerName} - {b.phone}
                        <Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'}>{b.status === 'confirmed' ? 'Đã chốt' : 'Đang chờ'}</Badge>
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4"/> 
                          {format(new Date(b.dateTime), "HH:mm - dd/MM/yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4"/> 
                          {b.guestsCount} khách
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <PenLine className="w-4 h-4 mr-2" /> Sửa
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-700 mb-1 flex items-center gap-1">
                        <ClipboardList className="w-4 h-4"/> Menu Đã Đặt:
                      </h4>
                      <ul className="list-disc list-inside text-sm text-slate-600 ml-1">
                        {b.menu.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-1">Yêu cầu Decor:</h4>
                        <p className="text-sm text-slate-600">{b.decorRequest || "Không có"}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-1">Yêu cầu Riêng (Ghi chú):</h4>
                        <p className="text-sm text-slate-600 italic">{b.specialRequest || "Không có"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="w-full md:w-64 space-y-3 border-l pl-0 md:pl-6 pt-4 md:pt-0">
                  <h4 className="font-semibold text-sm text-slate-700">Trạng thái công việc</h4>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Lễ tân:</span>
                    <Badge variant={b.receptionStatus === 'done' ? 'default' : 'outline'} className={b.receptionStatus === 'done' ? 'bg-green-500' : ''}>
                      {b.receptionStatus === 'done' ? 'Hoàn thành' : 'Chờ xử lý'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Bếp:</span>
                    <Badge variant={b.kitchenStatus === 'done' ? 'default' : (b.kitchenStatus === 'in_progress' ? 'secondary' : 'outline')} 
                           className={b.kitchenStatus === 'done' ? 'bg-green-500' : (b.kitchenStatus === 'in_progress' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : '')}>
                      {b.kitchenStatus === 'done' ? 'Hoàn thành' : (b.kitchenStatus === 'in_progress' ? 'Đang làm' : 'Chờ xử lý')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Sảnh / Decor:</span>
                    <Badge variant={b.floorStatus === 'done' ? 'default' : 'outline'} className={b.floorStatus === 'done' ? 'bg-green-500' : ''}>
                      {b.floorStatus === 'done' ? 'Hoàn thành' : 'Chờ xử lý'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
