import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchBookings } from "@/app/actions";
import { format, isBefore, addHours } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const allBookings = await fetchBookings();
  
  // Fix timezone issue on Vercel: Vercel runs in UTC. The dateTime strings from HTML input lack timezone,
  // so they are parsed as UTC. To compare correctly, we must shift 'now' to Vietnam time literally.
  const utcNow = new Date();
  const vnTimeStr = utcNow.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const now = new Date(vnTimeStr); 
  
  const next24h = addHours(now, 24);
  const past6h = addHours(now, -6);

  // Lọc các booking sắp tới hoặc đang diễn ra (chưa hoàn tất)
  const upcomingBookings = allBookings
    .filter(b => b.status !== 'completed' && b.status !== 'done' && b.receptionStatus !== 'clean')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  
  // Các booking khẩn cấp (trong vòng 24h tới, hoặc vừa mới diễn ra nhưng chưa xong)
  const urgentBookings = upcomingBookings.filter(b => {
    const time = new Date(b.dateTime);
    return isBefore(time, next24h) && !isBefore(time, past6h);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done': return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1"/> Đã xong</Badge>;
      case 'in_progress': return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1"/> Đang làm</Badge>;
      case 'pending': return <Badge variant="outline" className="text-slate-500 border-slate-300">Chờ</Badge>;
      default: return null;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Bảng Điều Khiển (Dashboard)</h1>
      
      {/* Alert Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> 
              Tiệc Sắp Diễn Ra (24h)
            </CardTitle>
            <CardDescription className="text-orange-600">Cần chú ý hoàn thành các khâu chuẩn bị</CardDescription>
          </CardHeader>
          <CardContent>
            {urgentBookings.length === 0 ? (
              <p className="text-sm text-slate-500">Không có tiệc nào trong 24h tới.</p>
            ) : (
              <div className="space-y-4">
                {urgentBookings.map(b => {
                  // Cảnh báo nếu các bộ phận chưa xong
                  const isFloorWarning = b.floorStatus !== 'done' && b.decorRequest;
                  const isKitchenWarning = b.kitchenStatus !== 'done';
                  return (
                  <div key={b.id} className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          {b.customerName.replace(/\[S?VIP\] /g, '')}
                          {b.customerName.includes('[SVIP]') && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider">SVIP</span>}
                          {b.customerName.includes('[VIP]') && <span className="bg-fuchsia-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">VIP</span>}
                          - {b.phone}
                        </h3>
                        <p className="text-sm text-slate-500">{format(new Date(b.dateTime), "HH:mm, EEEE, dd/MM/yyyy", { locale: vi })}</p>
                      </div>
                      <Badge variant="destructive">Khẩn cấp</Badge>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400"/> {b.guestsCount} khách
                      </div>
                    </div>

                    {/* Cảnh báo trạng thái bộ phận */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-700">Tiến độ Bếp:</span>
                        {getStatusBadge(b.kitchenStatus)}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-700">Tiến độ Sảnh/Decor:</span>
                        {getStatusBadge(b.floorStatus)}
                      </div>
                      {isKitchenWarning && <p className="text-xs text-red-500 mt-1">⚠️ Bếp chưa hoàn thành!</p>}
                      {isFloorWarning && <p className="text-xs text-red-500 mt-1">⚠️ Decor chưa hoàn thành!</p>}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tổng quan */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tổng quan sắp tới</CardTitle>
              <CardDescription>Danh sách tiệc đang chờ phục vụ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingBookings.map(b => (
                  <div key={b.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-100 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800 flex items-center gap-2">
                        {b.customerName.replace(/\[S?VIP\] /g, '')}
                        {b.customerName.includes('[SVIP]') && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider">SVIP</span>}
                        {b.customerName.includes('[VIP]') && <span className="bg-fuchsia-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">VIP</span>}
                        ({b.guestsCount} khách)
                      </p>
                      <p className="text-xs text-slate-500">{format(new Date(b.dateTime), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                    <Badge variant={b.status === 'confirmed' ? "default" : "secondary"}>
                      {b.status === 'confirmed' ? 'Đã chốt' : 'Đang chờ'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
