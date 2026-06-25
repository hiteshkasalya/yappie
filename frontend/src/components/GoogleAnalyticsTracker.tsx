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
