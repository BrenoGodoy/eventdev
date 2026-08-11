import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventDev",
  description: "Platform for events and ticket management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}