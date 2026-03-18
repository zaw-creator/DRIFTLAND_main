import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar02 from "@/components/Navbar/Navbar02";

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
        {/* targetId must match the sentinel <div id="nav-trigger"> in page.js */}
        <Navbar02 targetId="nav-trigger" />
        {children}
      </body>
    </html>
  );
}
