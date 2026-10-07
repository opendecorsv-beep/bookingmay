import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockBookings } from "@/lib/data";
import { format } from "date-fns";
import { Clock, ChefHat, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KitchenPage() {
  const pendingBookings = mockBookings.filter(b => b.kitchenStatus !== 'done').sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-orange-100 p-3 rounded-full text-orange-600">
          <ChefHat className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bộ phận Bếp</h1>
          <p className="text-slate-500">Quản lý món ăn cần chuẩn bị</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pendingBookings.map((b) => (
          <Card key={b.id} className={b.kitchenStatus === 'in_progress' ? 'border-orange-300 shadow-md' : ''}>
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex flex-col gap-1">
                  <span>{b.customerName} - {b.guestsCount} khách</span>
                  <span className="text-sm font-normal text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4"/> {format(new Date(b.dateTime), "HH:mm - dd/MM")}
                  </span>
                </CardTitle>
                <Badge variant={b.kitchenStatus === 'in_progress' ? 'default' : 'outline'} className={b.kitchenStatus === 'in_progress' ? 'bg-orange-500' : ''}>
                  {b.kitchenStatus === 'in_progress' ? 'Đang nấu' : 'Chờ làm'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-2">Danh sách món (Menu):</h4>
                <ul className="space-y-2">
                  {b.menu.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              {b.specialRequest && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm italic border border-red-100">
                  <span className="font-bold">Lưu ý Bếp:</span> {b.specialRequest}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                {b.kitchenStatus === 'pending' && (
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">Bắt đầu nấu</Button>
                )}
                {b.kitchenStatus === 'in_progress' && (
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <CheckSquare className="w-4 h-4 mr-2"/> Báo Xong
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {pendingBookings.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
            Không có đơn tiệc nào đang chờ!
          </div>
        )}
      </div>
    </div>
  );
}
