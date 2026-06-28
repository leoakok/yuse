import { redirect } from "next/navigation";
import { backendBaseUrl } from "@/lib/auth/backend-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const upstream = await fetch(
    `${backendBaseUrl()}/auth/github/callback?${url.searchParams.toString()}`,
    { redirect: "manual", cache: "no-store" },
  );

  const location = upstream.headers.get("location");
  if (upstream.status >= 300 && upstream.status < 400 && location) {
    redirect(location);
  }

  redirect("/connections?error=GitHub%20sign-in%20failed");
}
