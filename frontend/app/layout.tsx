import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RBot — PM Job Co-Pilot",
  description: "Your PM job search, finally intelligent.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-apple-bg text-apple-text antialiased">
        {children}
      </body>
    </html>
  );
}
