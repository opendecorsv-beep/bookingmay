import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import AutoRefresh from "@/components/AutoRefresh";

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
        <AutoRefresh interval={7000} />
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 text-xl font-bold text-slate-800">
              <div className="relative w-10 h-10 overflow-hidden rounded-md border border-slate-100 shadow-sm">
                <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" />
              </div>
              <span className="tracking-tight">Mây Restaurant</span>
            </Link>
            <nav className="flex gap-6 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-orange-600">Bảng điều khiển</Link>
              <Link href="/bookings" className="hover:text-orange-600">Danh sách Đặt bàn</Link>
              <Link href="/floor-plan" className="hover:text-orange-600">Sơ đồ bàn</Link>
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
