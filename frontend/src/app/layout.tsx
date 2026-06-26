import type { Metadata, Viewport } from "next";
import Script from "next/script";
import GoogleAnalyticsTracker from "@/components/GoogleAnalyticsTracker";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://yappie.in"),
  title: {
    default: "Yappie | Anonymous Campus Chat & Confessions",
    template: "%s | Yappie"
  },
  description: "Connect anonymously with students from your college and chat globally. Share secrets on the confessions feed, make friends, and vibe securely.",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" }
    ]
  },
  openGraph: {
    title: "Yappie | Anonymous Campus Chat & Confessions",
    description: "Connect anonymously with students from your college and chat globally. Share secrets on the confessions feed, make friends, and vibe securely.",
    url: "https://yappie.in",
    siteName: "Yappie",
    images: [
      {
        url: "/indian_friends_candid.png",
        width: 1200,
        height: 630,
        alt: "Yappie - Anonymous Campus Chat"
      }
    ],
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Yappie | Anonymous Campus Chat & Confessions",
    description: "Connect anonymously with students from your college and chat globally. Share secrets on the confessions feed, make friends, and vibe securely.",
    images: ["/indian_friends_candid.png"]
  }
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
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
