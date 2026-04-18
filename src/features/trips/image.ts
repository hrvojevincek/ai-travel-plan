import "server-only";

export interface DestinationImage {
  url: string;
  attribution: string;
}

interface UnsplashPhoto {
  urls: { regular: string };
  user: { name: string; links: { html: string } };
  links: { html: string };
}

export async function getDestinationImage(
  query: string
): Promise<DestinationImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !query.trim()) return null;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", `${query} travel landmark`);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("per_page", "1");

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: UnsplashPhoto[] };
    const photo = data.results?.[0];
    if (!photo) return null;
    return {
      url: photo.urls.regular,
      attribution: `Photo by ${photo.user.name} on Unsplash`,
    };
  } catch {
    return null;
  }
}
