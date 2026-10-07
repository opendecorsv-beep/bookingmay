import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "BookingMay - Quản lý tiệc",
  description: "Webapp quản lý booking cho Mây Restaurant BMT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={cn("font-sans", inter.variable)}>
      <body className={`${inter.className} bg-slate-50 min-h-screen flex flex-col`}>
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <UtensilsCrossed className="w-6 h-6 text-orange-600" />
              <span>BookingMay</span>
            </Link>
            <nav className="flex gap-6 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-orange-600">Bảng điều khiển</Link>
              <Link href="/bookings" className="hover:text-orange-600">Danh sách Đặt bàn</Link>
              <Link href="/kitchen" className="hover:text-orange-600">Bếp</Link>
              <Link href="/floor" className="hover:text-orange-600">Sảnh</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
