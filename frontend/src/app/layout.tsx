import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Brand Research Intelligence",
  description: "AI-powered brand strategy and research platform for marketing agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased min-h-screen`}>
        <div className="fixed inset-0 hero-gradient pointer-events-none z-0" />
        <div className="relative z-10">
          {children}
        </div>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
