import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import ServerWakeup from "@/components/ServerWakeup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Driftland",
  description: "Premier drift racing events",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Navbar hidden on admin pages - admin has its own navbar */}
        
        <ServerWakeup />
        <NavbarWrapper />
        {children}
      </body>
    </html>
  );
}
