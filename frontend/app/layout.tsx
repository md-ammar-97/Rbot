import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PMFit — AI Job Co-Pilot for Product Managers",
  description:
    "PMFit recovers your resume, finds the right PM roles, scores your fit with evidence, and drafts tailored applications — grounded in what you actually built.",
  icons: { icon: "/logo-icon.png" },
  openGraph: {
    title: "PMFit — AI Job Co-Pilot for Product Managers",
    description: "Your PM job search, finally intelligent.",
    siteName: "PMFit",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-pmfit-bg text-pmfit-text antialiased">
        {children}
      </body>
    </html>
  );
}
