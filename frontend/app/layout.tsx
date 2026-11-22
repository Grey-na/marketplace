import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/ui/CustomCursor";
import { AuthProvider } from "@/components/auth/AuthProvider";

// big editorial headings
const displayFont = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// body text
const bodyFont = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marketplace | Discover small shops",
  description: "A marketplace where small shops get discovered through their products.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-dots antialiased">
        <CustomCursor />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}