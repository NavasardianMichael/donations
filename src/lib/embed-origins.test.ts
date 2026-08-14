import { describe, expect, it } from "vitest";

import { frameAncestorsValue, parseOrigin } from "./embed-origins";

describe("parseOrigin", () => {
  it("accepts a bare host as https", () => {
    expect(parseOrigin("news.am")).toBe("https://news.am");
  });

  it("keeps an explicit origin, dropping any path", () => {
    expect(parseOrigin("https://news.am/foo?x=1")).toBe("https://news.am");
  });

  it("preserves http and a non-default port", () => {
    expect(parseOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("rejects junk", () => {
    expect(parseOrigin("")).toBeNull();
    expect(parseOrigin("not a host")).toBeNull();
    expect(parseOrigin("ftp://files.am")).toBeNull();
    expect(parseOrigin("javascript:alert(1)")).toBeNull();
    expect(parseOrigin("https://user:pass@news.am")).toBeNull();
  });
});

describe("frameAncestorsValue", () => {
  it("denies framing when the embed is off", () => {
    expect(
      frameAncestorsValue({
        embedEnabled: false,
        allowAnyOrigin: true,
        origins: ["https://news.am"],
      }),
    ).toBe("'none'");
  });

  it("allows any origin when the switch is on", () => {
    expect(
      frameAncestorsValue({
        embedEnabled: true,
        allowAnyOrigin: true,
        origins: ["https://news.am"],
      }),
    ).toBe("*");
  });

  it("allowlists listed origins plus self", () => {
    expect(
      frameAncestorsValue({
        embedEnabled: true,
        allowAnyOrigin: false,
        origins: ["news.am", "https://news.am/blog"],
      }),
    ).toBe("'self' https://news.am");
  });
});
