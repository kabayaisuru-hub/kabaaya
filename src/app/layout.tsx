import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kabaaya ERP - Premium Wedding Wear",
  description: "Advanced Management System for Wedding Clothing Shops",
  manifest: "/manifest.json",
  themeColor: "#D4AF37",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-black text-white">
        {children}
      </body>
    </html>
  );
}
