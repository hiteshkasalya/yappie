import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Yappie",
  description: "An anonymous transmission. If you know, you know.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
