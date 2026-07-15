import { buildHumansTxt } from "@/lib/site/llms";

export function GET() {
  return new Response(buildHumansTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
