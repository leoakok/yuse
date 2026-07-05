export function isAllowedRedirectUrl(location: string, appOrigin: string): boolean {
  try {
    const target = new URL(location);
    const origin = new URL(appOrigin);
    if (target.origin === origin.origin) {
      return true;
    }
    if (target.hostname === "github.com" && target.protocol === "https:") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function appOriginFromRequest(request: Request): string {
  return new URL(request.url).origin;
}
