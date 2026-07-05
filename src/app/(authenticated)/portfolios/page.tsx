"use client";

import { useRouter } from "next/navigation";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { PortfolioGrid } from "@/components/portfolio/portfolio-grid";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { createPortfolio, listPortfolios } from "@/lib/api/portfolio-api";
import {
  getCachedPortfolios,
  setCachedPortfolios,
} from "@/lib/cache/workspace-cache";
import { useStaleWhileRevalidate } from "@/lib/hooks/use-stale-while-revalidate";
import { portfolioPath } from "@/lib/portfolio/routes";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";

export default function PortfoliosPage() {
  const router = useRouter();
  const { user } = useWorkspace();
  const { refreshKey } = useCvAssistant();
  const {
    data: portfolios,
    isLoading,
    isRevalidating,
    setData: setPortfolios,
  } = useStaleWhileRevalidate(
    () => listPortfolios(),
    [user.id, refreshKey],
    {
      getCached: () => getCachedPortfolios(user.id),
      setCached: (items) => setCachedPortfolios(user.id, items),
    }
  );

  const handleNewPortfolio = async () => {
    const portfolio = await createPortfolio("Untitled Portfolio");
    router.push(portfolioPath(portfolio.id));
  };

  return (
    <CatalogShell
      title="Portfolios"
      description="Personal sites that showcase your projects and experience."
    >
      <PortfolioGrid
        portfolios={portfolios ?? []}
        isLoading={isLoading}
        isRevalidating={isRevalidating}
        onCreatePortfolio={() => void handleNewPortfolio()}
        onPortfolioDeleted={(id) =>
          setPortfolios((current) => (current ?? []).filter((p) => p.id !== id))
        }
      />
    </CatalogShell>
  );
}
