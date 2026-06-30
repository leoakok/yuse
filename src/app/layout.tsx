import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const siteUrl = "https://yuse.one";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Yuse",
  description: "AI-native CV platform",
  openGraph: {
    siteName: "Yuse",
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    images: [{ url: "/social/og-homepage.png", width: 1200, height: 900, alt: "Yuse, AI-native CV builder" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/social/og-homepage.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col antialiased">
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
