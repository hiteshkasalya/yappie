import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Yappie | Why We Built This",
  description: "Learn why we built Yappie: a space for college students to talk, share secrets, and build real connections anonymously.",
  alternates: {
    canonical: "/about"
  },
  openGraph: {
    title: "About Yappie | Why We Built This",
    description: "Learn why we built Yappie: a space for college students to talk, share secrets, and build real connections anonymously.",
    url: "https://yappie.in/about",
    siteName: "Yappie",
    images: [
      {
        url: "/indian_friends_candid.png",
        width: 1200,
        height: 630,
        alt: "About Yappie"
      }
    ],
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "About Yappie | Why We Built This",
    description: "Learn why we built Yappie: a space for college students to talk, share secrets, and build real connections anonymously.",
    images: ["/indian_friends_candid.png"]
  }
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
