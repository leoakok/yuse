import { describe, expect, it, afterEach } from "vitest";
import { backendBaseUrl, resolveBackendGraphqlUrl } from "./backend-url";

const ORIGINAL = {
  GRAPHQL_URL: process.env.GRAPHQL_URL,
  BACKEND_URL: process.env.BACKEND_URL,
  VERCEL_URL: process.env.VERCEL_URL,
};

afterEach(() => {
  process.env.GRAPHQL_URL = ORIGINAL.GRAPHQL_URL;
  process.env.BACKEND_URL = ORIGINAL.BACKEND_URL;
  process.env.VERCEL_URL = ORIGINAL.VERCEL_URL;
});

describe("resolveBackendGraphqlUrl", () => {
  it("prefers explicit GRAPHQL_URL", () => {
    process.env.GRAPHQL_URL = "https://yuse.one/_/backend/graphql/";
    process.env.BACKEND_URL = "https://ignored.example/_/backend";
    process.env.VERCEL_URL = "ignored.vercel.app";
    expect(resolveBackendGraphqlUrl()).toBe("https://yuse.one/_/backend/graphql");
  });

  it("uses BACKEND_URL from Vercel services when GRAPHQL_URL is unset", () => {
    delete process.env.GRAPHQL_URL;
    process.env.BACKEND_URL = "https://yuse-abc.vercel.app/_/backend";
    expect(resolveBackendGraphqlUrl()).toBe(
      "https://yuse-abc.vercel.app/_/backend/graphql",
    );
  });

  it("builds from VERCEL_URL as last dynamic fallback", () => {
    delete process.env.GRAPHQL_URL;
    delete process.env.BACKEND_URL;
    process.env.VERCEL_URL = "yuse-abc.vercel.app";
    expect(resolveBackendGraphqlUrl()).toBe(
      "https://yuse-abc.vercel.app/_/backend/graphql",
    );
  });

  it("falls back to localhost outside Vercel", () => {
    delete process.env.GRAPHQL_URL;
    delete process.env.BACKEND_URL;
    delete process.env.VERCEL_URL;
    expect(resolveBackendGraphqlUrl()).toBe("http://localhost:8080/graphql");
  });
});

describe("backendBaseUrl", () => {
  it("strips the graphql suffix", () => {
    process.env.GRAPHQL_URL = "https://yuse.one/_/backend/graphql";
    expect(backendBaseUrl()).toBe("https://yuse.one/_/backend");
  });
});
