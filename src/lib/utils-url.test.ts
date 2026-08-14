import { describe, expect, it } from "vitest";

import { escapeHtml, isSafeHttpUrl } from "./utils";

describe("isSafeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isSafeHttpUrl("https://cdn.example.com/cover.jpg")).toBe(true);
    expect(isSafeHttpUrl("http://localhost:3000/img.png")).toBe(true);
  });

  it("rejects schemes that must never land in img src", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects credentials, whitespace, and empty values", () => {
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl(" https://example.com")).toBe(false);
    expect(isSafeHttpUrl("https://user:pass@example.com")).toBe(false);
    expect(isSafeHttpUrl("https://example.com\\@evil")).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes attribute-breaking characters", () => {
    expect(escapeHtml(`<img src="x" onerror="alert(1)">`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});
