import { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";

export const metadata: Metadata = {
  title: "Yappie | Anonymous Campus Chat & Confessions",
  description: "Connect anonymously with students from your college and chat globally. Share secrets on the confessions feed, make friends, and vibe securely.",
  alternates: {
    canonical: "/"
  }
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Yappie",
              "url": "https://yappie.in",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://yappie.in/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Yappie",
              "url": "https://yappie.in",
              "logo": "https://yappie.in/icon.svg",
              "image": "https://yappie.in/indian_friends_candid.png",
              "description": "Yappie is an anonymous college network connecting students via campus chat and anonymous confessions.",
              "sameAs": []
            },
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Yappie",
              "url": "https://yappie.in",
              "applicationCategory": "SocialNetworkingApplication",
              "operatingSystem": "All",
              "browserRequirements": "Requires JavaScript. Requires HTML5.",
              "description": "Connect anonymously with students from your college and chat globally. Share secrets on the confessions feed, make friends, and vibe securely.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "INR"
              }
            }
          ])
        }}
      />
      <HomeClient />
    </>
  );
}
