import type { Metadata } from "next";
import { Inter } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { NeighborhoodProvider } from "@/context/NeighborhoodContext";
import OnboardGate from "@/components/OnboardGate";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lede.nyc",
  description: "Your autonomous daily briefing on New York City's neighborhoods — permit anomalies, noise patterns, transit reliability, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <NeighborhoodProvider>
          <OnboardGate>
            <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden border-x border-zinc-800">
              <div className="flex-1 flex flex-col pb-20">
                {children}
              </div>
              <BottomNav />
            </div>
          </OnboardGate>
        </NeighborhoodProvider>
      </body>
    </html>
  );
}
