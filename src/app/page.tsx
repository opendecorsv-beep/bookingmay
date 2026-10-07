import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockBookings } from "@/lib/data";
import { format, isBefore, addHours } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";

export default function Dashboard() {
  const now = new Date("2026-10-07T15:42:16+07:00"); // Current time for demo
  const next24h = addHours(now, 24);

  // Lọc các booking sắp tới
  const upcomingBookings = mockBookings.filter(b => isBefore(now, new Date(b.dateTime))).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  
  // Các booking khẩn cấp (trong vòng 24h tới)
  const urgentBookings = upcomingBookings.filter(b => isBefore(new Date(b.dateTime), next24h));

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
                        <h3 className="font-semibold text-slate-800">{b.customerName} - {b.phone}</h3>
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
                      <p className="font-medium text-slate-800">{b.customerName} ({b.guestsCount} khách)</p>
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
