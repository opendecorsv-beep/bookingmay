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
import MainHeader from "@/components/MainHeader";
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
          <MainHeader />
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


