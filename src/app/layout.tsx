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

import { AuthProvider } from "@/context/AuthContext";
import AppNavbar from "@/components/AppNavbar";
import StaffAccessGuard from "@/components/StaffAccessGuard";
import { getAuthUserAction } from "@/app/actions";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthUserAction();

  return (
    <html lang="vi" className={cn("font-sans", inter.variable)}>
      <body className={`${inter.className} bg-slate-50 min-h-screen flex flex-col`}>
        <AuthProvider initialUser={user}>
          <AutoRefresh interval={7000} />
          <header className="bg-white border-b sticky top-0 z-10 shadow-2xs">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3 text-xl font-bold text-slate-800 shrink-0">
                <div className="relative w-10 h-10 overflow-hidden rounded-md border border-slate-100 shadow-sm">
                  <Image src="/logo.jpg" alt="Mây Restaurant Logo" fill className="object-cover" />
                </div>
                <span className="tracking-tight hidden md:block">Mây Restaurant</span>
              </Link>
              <AppNavbar />
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
            <StaffAccessGuard>
              {children}
            </StaffAccessGuard>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

