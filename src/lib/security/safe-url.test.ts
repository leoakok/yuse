import { describe, expect, it } from "vitest";

import { isSafeJobUrl, sanitizeExternalUrl } from "@/lib/security/safe-url";

describe("sanitizeExternalUrl", () => {
  it("allows https links", () => {
    expect(sanitizeExternalUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("blocks javascript urls", () => {
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
  });

  it("blocks data urls", () => {
    expect(sanitizeExternalUrl("data:text/html,hello")).toBeNull();
  });
});

describe("isSafeJobUrl", () => {
  it("allows manual scheme", () => {
    expect(isSafeJobUrl("manual://job-1")).toBe(true);
  });

  it("rejects private hosts", () => {
    expect(isSafeJobUrl("http://localhost/jobs")).toBe(false);
  });
});
