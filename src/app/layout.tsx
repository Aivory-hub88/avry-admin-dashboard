import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/contexts/AuthContext";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: "Aivory Admin",
  description: "Aivory Admin Dashboard",
  icons: {
    icon: "/admin/favicon.svg",
    shortcut: "/admin/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${interTight.variable} font-inter-tight bg-[#353531]`}>
        <AuthProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
