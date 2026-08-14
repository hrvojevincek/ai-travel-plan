export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-8 h-10 w-48 animate-pulse rounded-md bg-muted" />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c"].map((key) => (
          <li key={key} className="h-48 animate-pulse rounded-2xl bg-muted" />
        ))}
      </ul>
    </div>
  );
}
