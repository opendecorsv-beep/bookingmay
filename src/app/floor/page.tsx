import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockBookings } from "@/lib/data";
import { format } from "date-fns";
import { Sparkles, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { setFloorStatus, fetchBookings } from "@/app/actions";

export const dynamic = 'force-dynamic';

export default async function FloorPage() {
  const allBookings = await fetchBookings();
  const pendingBookings = allBookings.filter(b => b.floorStatus !== 'done').sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 p-3 rounded-full text-purple-600">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bộ phận Sảnh / Decor</h1>
          <p className="text-slate-500">Quản lý không gian, bàn tiệc và trang trí</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingBookings.map((b) => (
          <Card key={b.id} className="border-purple-200">
            <CardHeader className="pb-3 border-b bg-purple-50/50">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex flex-col gap-1">
                  <span className="text-purple-900">{b.customerName}</span>
                  <span className="text-sm font-normal text-slate-600 flex items-center gap-1">
                    <Users className="w-4 h-4"/> {b.guestsCount} khách | {format(new Date(b.dateTime), "HH:mm - dd/MM")}
                  </span>
                </CardTitle>
                <Badge variant={b.floorStatus === 'in_progress' ? 'default' : 'outline'} className={b.floorStatus === 'in_progress' ? 'bg-purple-600' : ''}>
                  {b.floorStatus === 'in_progress' ? 'Đang setup' : 'Chờ xử lý'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-1">Yêu cầu Decor:</h4>
                <p className="text-slate-700 bg-white p-3 rounded border border-slate-200 min-h-[60px]">
                  {b.decorRequest || "Setup bàn tiêu chuẩn"}
                </p>
              </div>
              
              {b.specialRequest && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 mb-1">Ghi chú riêng:</h4>
                  <p className="text-slate-600 italic bg-yellow-50 p-2 rounded text-sm border border-yellow-100">
                    {b.specialRequest}
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-2 justify-end border-t">
                {b.floorStatus === 'pending' && (
                  <form action={setFloorStatus.bind(null, b.id, 'in_progress')}>
                    <Button type="submit" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">Bắt đầu Setup</Button>
                  </form>
                )}
                <form action={setFloorStatus.bind(null, b.id, 'done')}>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    <CheckCircle className="w-4 h-4 mr-2"/> Hoàn tất Setup
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {pendingBookings.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
            Mọi không gian đã được setup hoàn tất!
          </div>
        )}
      </div>
    </div>
  );
}
