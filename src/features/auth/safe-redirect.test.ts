import { describe, expect, it } from "vitest";
import { safeInternalRedirect } from "./safe-redirect";

describe("safeInternalRedirect", () => {
  it.each([
    ["/", "/"],
    ["/dashboard", "/dashboard"],
    ["/trip/abc?tab=1", "/trip/abc?tab=1"],
    ["/path%20with%20spaces", "/path%20with%20spaces"],
    ["/a/b/c#frag", "/a/b/c#frag"],
  ])("accepts safe path %p → %p", (input, expected) => {
    expect(safeInternalRedirect(input)).toBe(expected);
  });

  it.each([
    [undefined, "/"],
    [null, "/"],
    ["", "/"],
    ["//evil.com", "/"],
    ["//evil.com/path", "/"],
    ["https://evil.com", "/"],
    ["http://evil.com/phish", "/"],
    ["javascript:alert(1)", "/"],
    ["data:text/html,<script>alert(1)</script>", "/"],
    ["dashboard", "/"],
    ["\\\\evil.com", "/"],
    ["/path\\evil", "/"],
    ["/\nLocation: evil", "/"],
    ["/\r\nHeader: Injection", "/"],
    ["/\x00null-byte", "/"],
    ["/\x1fcontrol", "/"],
    ["/%2F%2Fevil.com", "/"],
    ["/%2f/evil", "/"],
    ["/%0Ainjection", "/"],
  ])("rejects unsafe input %p → %p", (input, expected) => {
    expect(safeInternalRedirect(input as string | undefined)).toBe(expected);
  });

  it("returns '/' on malformed URI encoding rather than throwing", () => {
    expect(safeInternalRedirect("/%zz")).toBe("/");
  });

  it("preserves the caller's original encoding when the decoded form is safe", () => {
    expect(safeInternalRedirect("/trip/%E2%9C%93-check")).toBe(
      "/trip/%E2%9C%93-check"
    );
  });
});
