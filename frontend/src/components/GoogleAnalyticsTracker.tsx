"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      (window as any).gtag("config", "G-H5LHJMRGQP", {
        page_path: url,
      });
    }

    // Auto-ping the Render backend to wake it up / keep it warm on page load/navigation
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://yappie-72iy.onrender.com";
    fetch(`${apiUrl}/ping`).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
