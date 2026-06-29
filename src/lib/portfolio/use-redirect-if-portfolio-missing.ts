"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useRedirectIfPortfolioMissing(
  portfolioId: string,
  loading: boolean,
  found: boolean
) {
  const router = useRouter();

  useEffect(() => {
    if (!loading && !found) {
      router.replace("/portfolios");
    }
  }, [loading, found, portfolioId, router]);
}
