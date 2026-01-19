import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PurpleSectorsRacing | Sim Racing Documented",
  description: "Following the pursuit of speed in iRacing. The work, the progress, and where it leads.",
  keywords: ["sim racing", "iRacing", "esports", "motorsport", "racing", "Super Formula"],
  authors: [{ name: "PurpleSectorsRacing" }],
  openGraph: {
    title: "PurpleSectorsRacing | Sim Racing Documented",
    description: "Following the pursuit of speed in iRacing. The work, the progress, and where it leads.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PurpleSectorsRacing | Sim Racing Documented",
    description: "Following the pursuit of speed in iRacing. The work, the progress, and where it leads.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Noise texture overlay */}
        <div className="noise-overlay" />

        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
