import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import AppInitializer from "@/components/utility/AppInitializer";
import { Toaster } from "sonner";
import JsonLd from "@/components/seo/JsonLd";
import { getOrganizationJsonLd } from "@/lib/seo";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "http://localhost:3000";
const siteUrl = rawSiteUrl.startsWith("http")
  ? rawSiteUrl
  : `https://${rawSiteUrl}`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// CRITICAL FIX: Explicit viewport export to kill window pinch-to-zoom completely across mobile browsers
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Disables multi-touch global page zoom
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IKNA | Comfort-First Bras for Everyday Confidence",
    template: "%s | IKNA",
  },
  description:
    "Shop IKNA bras designed for comfort, support, and everyday confidence. Explore seamless fits, size guidance, and customer-loved collections.",
  keywords: [
  "IKNA bras",
  "women bras online",
  "comfortable bras India",
  "seamless bras",
  "wirefree bras",
  "support bras",
  "lingerie India",
  "women innerwear",
  "everyday bras",
  "premium bras",
  "bra shopping online",
  "best bras for women",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: "/images/AI_images/logo1_ikna.png",
        type: "image/png",
      },
    ],
    shortcut: ["/images/AI_images/logo1_ikna.png"],
    apple: [
      {
        url: "/images/AI_images/logo1_ikna.png",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "IKNA",
    title: "IKNA | Comfort-First Bras for Everyday Confidence",
    description:
      "Discover IKNA's comfort-first bra collection with premium fits, elegant designs, and dependable support.",
    images: [
      {
        url: "/images/AI_images/logo1_ikna.png",
        width: 1200,
        height: 630,
        alt: "IKNA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IKNA | Comfort-First Bras for Everyday Confidence",
    description:
      "Explore IKNA bra collections crafted for comfort, support, and confidence.",
    images: ["/images/AI_images/logo1_ikna.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      {/* CRITICAL STYLING FIX: 
        Added 'overscroll-behavior-x-none' and structural touches to ensure that if a gesture spills 
        outside the chart container, the rest of your web app pages don't shift sideways.
      */}
      <body 
        className="min-h-full flex flex-col overflow-x-hidden overscroll-x-none selection:bg-[#840d5c]/20"
        suppressHydrationWarning
      >
        <AppInitializer />
        <JsonLd data={getOrganizationJsonLd()} />
        {children}
        <Toaster position="top-right" richColors closeButton />
        {GA4_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA4_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
