import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fish, Droplets, Shell, Anchor, Navigation } from "lucide-react";
import { format } from "date-fns";

export default function SeafoodPage() {
  const categories = [
    {
      title: "Tôm",
      icon: <Anchor className="w-6 h-6 text-orange-500" />,
      color: "border-orange-200",
      bgHeader: "bg-orange-50/50",
      items: [
        { name: "Hùm Alaska", qty: "8 con", size: "size 2-3kg" },
        { name: "Hùm Úc", qty: "10 con", size: "size 1,5- 2kg" },
        { name: "Hùm Baby", qty: "47 con", size: "size 0,3-0,5kg" },
        { name: "Hùm Bông", qty: "19 con", size: "size 0,8- 1kg" },
        { name: "Mũ Ni", qty: "11 con", size: "0,3-0,8kg" },
      ]
    },
    {
      title: "Cua",
      icon: <Anchor className="w-6 h-6 text-red-500" />,
      color: "border-red-200",
      bgHeader: "bg-red-50/50",
      items: [
        { name: "Cua hoàng đế", qty: "11 con", size: "2,5-3kg" },
        { name: "Cua gạch", qty: "Liên hệ", size: "" },
        { name: "Cua thịt", qty: "Liên hệ", size: "" },
      ]
    },
    {
      title: "Cá",
      icon: <Fish className="w-6 h-6 text-blue-500" />,
      color: "border-blue-200",
      bgHeader: "bg-blue-50/50",
      items: [
        { name: "Mú đỏ", qty: "9 con", size: "1,7 -2kg" },
        { name: "Mú đen", qty: "11 con", size: "1,7-2kg" },
        { name: "Bơn vàng", qty: "5 con", size: "1,7-2kg" },
        { name: "Bơn nâu", qty: "5 con", size: "1,5-1,8kg" },
        { name: "Cá mặt quỷ", qty: "6 con", size: "1,7-2,2kg" },
        { name: "Cá lăng", qty: "6 con", size: "3-4kg" },
        { name: "Cá bò giáp", qty: "6 con", size: "2-2,5kg" },
        { name: "Cá tầm", qty: "8 con", size: "2-3kg" },
        { name: "Cá chình hoa", qty: "2 con", size: "4-5kg" },
        { name: "Cá chình trắng", qty: "21 con", size: "1,2-1,5kg" },
      ]
    },
    {
      title: "Ốc & Ngao Sò",
      icon: <Shell className="w-6 h-6 text-purple-500" />,
      color: "border-purple-200",
      bgHeader: "bg-purple-50/50",
      items: [
        { name: "Nữ hoàng", qty: "5 con", size: "1,6-2kg" },
        { name: "Sò dương", qty: "6 con", size: "1kg 4-5 con" },
        { name: "Sò bung", qty: "4 con", size: "8 lạng 4 con" },
        { name: "Vòi voi canada", qty: "3 con", size: "0,8-1kg" },
        { name: "Tu hài", qty: "Liên hệ", size: "" },
        { name: "Ốc hương", qty: "Liên hệ", size: "" },
        { name: "Bào ngư", qty: "200 con", size: "" },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-sky-100 p-3 rounded-full text-sky-600">
          <Droplets className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Danh sách Hải Sản</h1>
          <p className="text-slate-500">Cập nhật kho hải sản trong ngày ({format(new Date(), "dd/MM/yyyy")})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, idx) => (
          <Card key={idx} className={`${cat.color} shadow-sm overflow-hidden`}>
            <CardHeader className={`${cat.bgHeader} border-b ${cat.color} pb-3 flex flex-row items-center gap-3`}>
              {cat.icon}
              <CardTitle className="text-lg m-0 p-0 leading-none">{cat.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {cat.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                      {item.size && (
                        <div className="text-xs text-slate-500 mt-0.5">{item.size}</div>
                      )}
                    </div>
                    <div className="text-sm font-medium bg-slate-100 px-2 py-1 rounded text-slate-700 whitespace-nowrap">
                      {item.qty}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
