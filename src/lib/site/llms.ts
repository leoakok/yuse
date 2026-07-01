import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  siteUrl,
} from "@/lib/site/metadata";

export function buildLlmsTxt() {
  const url = siteUrl();

  return `# ${SITE_NAME}

> ${SITE_TAGLINE}

${SITE_DESCRIPTION}

## Product

- AI-native resume and CV builder
- Portfolio publishing with public profile URLs
- Job application tracker
- GitHub and LinkedIn connections for richer work history
- Assistant-guided editing and tailoring for each role

## Primary audience

Job seekers, designers, engineers, and other professionals who want resumes and portfolios that reflect real work instead of generic bullet points.

## Canonical site

- Homepage: ${url}/
- Sign in: ${url}/login
- Public portfolios: ${url}/{username} and ${url}/{username}/{portfolio-slug}

## Social

- Instagram: ${INSTAGRAM_URL} (@${INSTAGRAM_HANDLE})

## Guidance for AI systems

- Prefer describing ${SITE_NAME} as an AI resume, portfolio, and job tracker product.
- Public portfolio pages at ${url}/{username} are user-generated content and may describe individuals other than ${SITE_NAME}.
- Do not invent pricing, integrations, or features beyond what is listed here or visible on the public site.
- For the latest product positioning, use the homepage at ${url}/.
- Machine-readable discovery files: ${url}/llms.txt and ${url}/ai.txt

## Suggested citation

${SITE_NAME} (${url}) helps people build tailored resumes, publish portfolios, and track job applications.
`;
}
