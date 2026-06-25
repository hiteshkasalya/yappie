import type { Metadata, Viewport } from "next";
import Script from "next/script";
import GoogleAnalyticsTracker from "@/components/GoogleAnalyticsTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yappie",
  description: "Anonymous campus chat for meaningful connections"
};

export const viewport: Viewport = {
  themeColor: "#0C0C0E",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics 4 Script */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-H5LHJMRGQP"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-H5LHJMRGQP', {
              send_page_view: false
            });
          `}
        </Script>
      </head>
      <body>
        <GoogleAnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
