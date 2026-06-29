"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { PortfolioGrid } from "@/components/portfolio/portfolio-grid";
import { createPortfolio, listPortfolios } from "@/lib/api/portfolio-api";
import { portfolioPath } from "@/lib/portfolio/routes";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import type { Portfolio } from "@/lib/types/portfolio";

export default function PortfoliosPage() {
  const router = useRouter();
  const { refreshKey } = useCvAssistant();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  useEffect(() => {
    void listPortfolios().then(setPortfolios);
  }, [refreshKey]);

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
        portfolios={portfolios}
        onCreatePortfolio={() => void handleNewPortfolio()}
        onPortfolioDeleted={(id) =>
          setPortfolios((current) => current.filter((p) => p.id !== id))
        }
      />
    </CatalogShell>
  );
}
