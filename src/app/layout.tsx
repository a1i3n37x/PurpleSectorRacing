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
  title: "PurpleSectorRacing | The Pursuit of Speed",
  description: "170 hours. 2 months. Top 10% on Monza and Silverstone. This is just the beginning. Follow the journey from sim racer to something more.",
  keywords: ["sim racing", "iRacing", "esports", "motorsport", "racing", "Super Formula"],
  authors: [{ name: "PurpleSectorRacing" }],
  openGraph: {
    title: "PurpleSectorRacing | The Pursuit of Speed",
    description: "170 hours. 2 months. Top 10% on Monza and Silverstone. This is just the beginning.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PurpleSectorRacing | The Pursuit of Speed",
    description: "170 hours. 2 months. Top 10% on Monza and Silverstone. This is just the beginning.",
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
