import type { User } from "@/lib/types/user";
import type {
  Portfolio,
  PortfolioProject,
  PortfolioSettings,
  PortfolioSkill,
  PortfolioWithContent,
} from "@/lib/types/portfolio";
import { graphqlRequest } from "@/lib/graphql/client";
import { mapPortfolioWithContent } from "@/lib/portfolio/preview";
import {
  PORTFOLIOS_QUERY,
  PORTFOLIO_WITH_CONTENT_QUERY,
  CREATE_PORTFOLIO_MUTATION,
  DUPLICATE_PORTFOLIO_MUTATION,
  DELETE_PORTFOLIO_MUTATION,
  UPDATE_PORTFOLIO_MUTATION,
  UPDATE_PORTFOLIO_SETTINGS_MUTATION,
  UPDATE_PORTFOLIO_CONTACT_PROFILE_MUTATION,
  SET_USERNAME_MUTATION,
  SET_PORTFOLIO_SLUG_MUTATION,
  ADD_PORTFOLIO_PROJECT_MUTATION,
  UPDATE_PORTFOLIO_PROJECT_MUTATION,
  DELETE_PORTFOLIO_PROJECT_MUTATION,
  SET_PORTFOLIO_PROJECT_VISIBILITY_MUTATION,
  ADD_PORTFOLIO_SKILL_MUTATION,
  UPDATE_PORTFOLIO_SKILL_MUTATION,
  DELETE_PORTFOLIO_SKILL_MUTATION,
  ADD_PORTFOLIO_TESTIMONIAL_MUTATION,
} from "@/lib/graphql/operations";

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

export async function updatePortfolio(
  id: string,
  patch: { title?: string; tagline?: string; about?: string }
): Promise<Portfolio> {
  const data = await graphqlRequest<{ updatePortfolio: Portfolio }>(UPDATE_PORTFOLIO_MUTATION, {
    id,
    ...patch,
  });
  return data.updatePortfolio;
}

export async function updatePortfolioSettings(
  portfolioId: string,
  patch: Pick<
    Partial<PortfolioSettings>,
    | "layout"
    | "accentColor"
    | "themeId"
    | "showPhoto"
    | "locale"
    | "projectGridColumns"
    | "projectCardStyle"
    | "typographyScale"
    | "heroStyle"
    | "navigationStyle"
    | "animationLevel"
  >
): Promise<PortfolioSettings> {
  const input: Record<string, unknown> = { portfolioId };
  if (patch.layout != null) input.layout = patch.layout;
  if (patch.accentColor != null) input.accentColor = patch.accentColor;
  if (patch.themeId != null) input.themeId = patch.themeId;
  if (patch.showPhoto != null) input.showPhoto = patch.showPhoto;
  if (patch.locale != null) input.locale = patch.locale;
  if (patch.projectGridColumns != null) input.projectGridColumns = patch.projectGridColumns;
  if (patch.projectCardStyle != null) input.projectCardStyle = patch.projectCardStyle;
  if (patch.typographyScale != null) input.typographyScale = patch.typographyScale;
  if (patch.heroStyle != null) input.heroStyle = patch.heroStyle;
  if (patch.navigationStyle != null) input.navigationStyle = patch.navigationStyle;
  if (patch.animationLevel != null) input.animationLevel = patch.animationLevel;

  const data = await graphqlRequest<{ updatePortfolioSettings: PortfolioSettings }>(
    UPDATE_PORTFOLIO_SETTINGS_MUTATION,
    { input }
  );
  return data.updatePortfolioSettings;
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
    ogImageUrl?: string | null;
    faviconUrl?: string | null;
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

export async function addPortfolioProject(
  portfolioId: string,
  patch: {
    title: string;
    tagline?: string;
    problem?: string;
    approach?: string;
    outcome?: string;
    techStack?: string[];
    liveUrl?: string;
    repoUrl?: string;
    imageUrl?: string;
    featured?: boolean;
  }
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ addPortfolioProject: PortfolioWithContent }>(
    ADD_PORTFOLIO_PROJECT_MUTATION,
    { input: { portfolioId, ...patch } }
  );
  return mapPortfolioWithContent(data.addPortfolioProject);
}

export async function updatePortfolioProject(
  portfolioId: string,
  projectId: string,
  patch: Partial<
    Pick<
      PortfolioProject,
      | "title"
      | "tagline"
      | "problem"
      | "approach"
      | "outcome"
      | "techStack"
      | "liveUrl"
      | "repoUrl"
      | "imageUrl"
      | "featured"
      | "showInPreview"
    >
  >
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ updatePortfolioProject: PortfolioWithContent }>(
    UPDATE_PORTFOLIO_PROJECT_MUTATION,
    { input: { portfolioId, projectId, ...patch } }
  );
  return mapPortfolioWithContent(data.updatePortfolioProject);
}

export async function deletePortfolioProject(
  portfolioId: string,
  projectId: string
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ deletePortfolioProject: PortfolioWithContent }>(
    DELETE_PORTFOLIO_PROJECT_MUTATION,
    { portfolioId, projectId }
  );
  return mapPortfolioWithContent(data.deletePortfolioProject);
}

export async function setPortfolioProjectVisibility(
  portfolioId: string,
  projectId: string,
  showInPreview: boolean
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ setPortfolioProjectVisibility: PortfolioWithContent }>(
    SET_PORTFOLIO_PROJECT_VISIBILITY_MUTATION,
    { input: { portfolioId, projectId, showInPreview } }
  );
  return mapPortfolioWithContent(data.setPortfolioProjectVisibility);
}

export async function addPortfolioSkill(
  portfolioId: string,
  name: string,
  category?: string
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ addPortfolioSkill: PortfolioWithContent }>(
    ADD_PORTFOLIO_SKILL_MUTATION,
    { input: { portfolioId, name, category } }
  );
  return mapPortfolioWithContent(data.addPortfolioSkill);
}

export async function updatePortfolioSkill(
  portfolioId: string,
  skillId: string,
  patch: Partial<Pick<PortfolioSkill, "name" | "category" | "showInPreview">>
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ updatePortfolioSkill: PortfolioWithContent }>(
    UPDATE_PORTFOLIO_SKILL_MUTATION,
    { input: { portfolioId, skillId, ...patch } }
  );
  return mapPortfolioWithContent(data.updatePortfolioSkill);
}

export async function deletePortfolioSkill(
  portfolioId: string,
  skillId: string
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ deletePortfolioSkill: PortfolioWithContent }>(
    DELETE_PORTFOLIO_SKILL_MUTATION,
    { portfolioId, skillId }
  );
  return mapPortfolioWithContent(data.deletePortfolioSkill);
}

export async function addPortfolioTestimonial(
  portfolioId: string,
  quote: string,
  author?: string,
  role?: string
): Promise<PortfolioWithContent> {
  const data = await graphqlRequest<{ addPortfolioTestimonial: PortfolioWithContent }>(
    ADD_PORTFOLIO_TESTIMONIAL_MUTATION,
    { input: { portfolioId, quote, author, role } }
  );
  return mapPortfolioWithContent(data.addPortfolioTestimonial);
}

export async function setUsername(username: string): Promise<User> {
  const data = await graphqlRequest<{ setUsername: User }>(SET_USERNAME_MUTATION, { username });
  return data.setUsername;
}

export async function setPortfolioSlug(portfolioId: string, slug: string): Promise<Portfolio> {
  const data = await graphqlRequest<{ setPortfolioSlug: Portfolio }>(SET_PORTFOLIO_SLUG_MUTATION, {
    portfolioId,
    slug,
  });
  return data.setPortfolioSlug;
}

export { mapPortfolioWithContent };
