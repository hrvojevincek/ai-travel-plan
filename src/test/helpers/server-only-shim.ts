// Vitest stub for Next.js' `server-only` marker. The real package throws on
// import to prevent bundling into client code; tests run outside RSC context
// so the throw is incorrect — we export nothing instead.
export {};
