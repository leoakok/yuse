import type {
  Portfolio,
  PortfolioSettings,
  PortfolioWithContent,
} from "@/lib/types/portfolio";
import { graphqlRequest } from "@/lib/graphql/client";
import { DEFAULT_PAGE_MARGIN_MM } from "@/lib/cv/page-format";
import { mapPortfolioWithContent } from "@/lib/portfolio/preview";
import {
  PORTFOLIOS_QUERY,
  PORTFOLIO_WITH_CONTENT_QUERY,
  CREATE_PORTFOLIO_MUTATION,
  DUPLICATE_PORTFOLIO_MUTATION,
  DELETE_PORTFOLIO_MUTATION,
  UPDATE_PORTFOLIO_SETTINGS_MUTATION,
  UPDATE_PORTFOLIO_SECTION_ITEM_VISIBILITY_MUTATION,
  UPDATE_PORTFOLIO_SECTION_ITEM_MUTATION,
  ADD_PORTFOLIO_SECTION_ITEM_MUTATION,
  DELETE_PORTFOLIO_SECTION_ITEM_MUTATION,
  UPDATE_PORTFOLIO_CONTACT_PROFILE_MUTATION,
} from "@/lib/graphql/operations";
import type { PageFormat } from "@/lib/types/cv";

function mapPageFormat(value: string | undefined): PageFormat {
  return value === "LETTER" ? "LETTER" : "A4";
}

export async function listPortfolios(): Promise<Portfolio[]> {
  const data = await graphqlRequest<{ portfolios: Portfolio[] }>(PORTFOLIOS_QUERY);
  return data.portfolios;
}

export async function getPortfolioWithContent(
  id: string
): Promise<PortfolioWithContent | undefined> {
  const data = await graphqlRequest<{ portfolioWithContent: PortfolioWithContent | null }>(
    PORTFOLIO_WITH_CONTENT_QUERY,
    { id }
  );
  if (!data.portfolioWithContent) return undefined;
  return mapPortfolioWithContent(data.portfolioWithContent);
}

export async function createPortfolio(title: string): Promise<Portfolio> {
  const data = await graphqlRequest<{ createPortfolio: Portfolio }>(CREATE_PORTFOLIO_MUTATION, {
    title,
  });
  return data.createPortfolio;
}

export async function duplicatePortfolio(id: string): Promise<Portfolio> {
  const data = await graphqlRequest<{ duplicatePortfolio: Portfolio }>(
    DUPLICATE_PORTFOLIO_MUTATION,
    { id }
  );
  return data.duplicatePortfolio;
}

export async function deletePortfolio(id: string): Promise<boolean> {
  const data = await graphqlRequest<{ deletePortfolio: boolean }>(DELETE_PORTFOLIO_MUTATION, {
    id,
  });
  return data.deletePortfolio;
}

export async function updatePortfolioSettings(
  portfolioId: string,
  patch: Pick<
    Partial<PortfolioSettings>,
    | "pageFormat"
    | "fontSize"
    | "themeId"
    | "showPhoto"
    | "locale"
    | "marginHorizontalMm"
    | "marginVerticalMm"
  >
): Promise<PortfolioSettings> {
  const input: Record<string, unknown> = { portfolioId };
  if (patch.pageFormat != null) input.pageFormat = patch.pageFormat;
  if (patch.fontSize != null) input.fontSize = patch.fontSize;
  if (patch.themeId != null) input.themeId = patch.themeId;
  if (patch.showPhoto != null) input.showPhoto = patch.showPhoto;
  if (patch.locale != null) input.locale = patch.locale;
  if (patch.marginHorizontalMm != null) input.marginHorizontalMm = patch.marginHorizontalMm;
  if (patch.marginVerticalMm != null) input.marginVerticalMm = patch.marginVerticalMm;

  const data = await graphqlRequest<{ updatePortfolioSettings: PortfolioSettings }>(
    UPDATE_PORTFOLIO_SETTINGS_MUTATION,
    { input }
  );
  return {
    ...data.updatePortfolioSettings,
    pageFormat: mapPageFormat(data.updatePortfolioSettings.pageFormat as string),
    marginHorizontalMm:
      data.updatePortfolioSettings.marginHorizontalMm ?? DEFAULT_PAGE_MARGIN_MM,
    marginVerticalMm:
      data.updatePortfolioSettings.marginVerticalMm ?? DEFAULT_PAGE_MARGIN_MM,
  };
}

export async function updatePortfolioSectionItemVisibility(
  portfolioId: string,
  sectionId: string,
  sectionItemId: string,
  showInPreview: boolean
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{
    updatePortfolioSectionItemVisibility: PortfolioWithContent;
  }>(UPDATE_PORTFOLIO_SECTION_ITEM_VISIBILITY_MUTATION, {
    input: { portfolioId, sectionId, sectionItemId, showInPreview },
  });
  return mapPortfolioWithContent(data.updatePortfolioSectionItemVisibility);
}

export async function updatePortfolioSectionItem(
  portfolioId: string,
  sectionId: string,
  sectionItemId: string,
  patch: { headline?: string; body?: string; metadata?: Record<string, unknown> }
): Promise<PortfolioWithContent> {
  const input: Record<string, unknown> = { portfolioId, sectionId, sectionItemId };
  if (patch.headline != null) input.headline = patch.headline;
  if (patch.body != null) input.body = patch.body;
  if (patch.metadata != null) input.metadata = patch.metadata;

  const data = await graphqlRequest<{ updatePortfolioSectionItem: PortfolioWithContent }>(
    UPDATE_PORTFOLIO_SECTION_ITEM_MUTATION,
    { input }
  );
  return mapPortfolioWithContent(data.updatePortfolioSectionItem);
}

export async function addPortfolioSectionItem(
  portfolioId: string,
  sectionId: string,
  patch?: { headline?: string; body?: string; metadata?: Record<string, unknown> }
): Promise<PortfolioWithContent> {
  const input: Record<string, unknown> = { portfolioId, sectionId };
  if (patch?.headline != null) input.headline = patch.headline;
  if (patch?.body != null) input.body = patch.body;
  if (patch?.metadata != null) input.metadata = patch.metadata;

  const data = await graphqlRequest<{ addPortfolioSectionItem: PortfolioWithContent }>(
    ADD_PORTFOLIO_SECTION_ITEM_MUTATION,
    { input }
  );
  return mapPortfolioWithContent(data.addPortfolioSectionItem);
}

export async function deletePortfolioSectionItem(
  portfolioId: string,
  sectionItemId: string
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ deletePortfolioSectionItem: PortfolioWithContent }>(
    DELETE_PORTFOLIO_SECTION_ITEM_MUTATION,
    { portfolioId, sectionItemId }
  );
  return mapPortfolioWithContent(data.deletePortfolioSectionItem);
}

export async function updatePortfolioContactProfile(
  portfolioId: string,
  patch: {
    fullName?: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedIn?: string;
    github?: string;
    photoUrl?: string | null;
  }
): Promise<PortfolioWithContent> {
  const input: Record<string, unknown> = { portfolioId };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) input[key] = value;
  }
  const data = await graphqlRequest<{ updatePortfolioContactProfile: PortfolioWithContent }>(
    UPDATE_PORTFOLIO_CONTACT_PROFILE_MUTATION,
    { input }
  );
  return mapPortfolioWithContent(data.updatePortfolioContactProfile);
}

export { mapPortfolioWithContent };
