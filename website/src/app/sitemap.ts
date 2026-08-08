import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://omeubanco.xyz";

  return [
    {
      url: baseUrl,
      lastModified: "2026-06-10",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/suporte`,
      lastModified: "2026-03-21",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/quem-somos`,
      lastModified: "2026-08-08",
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/termos`,
      lastModified: "2026-04-19",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: "2026-04-19",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/docs/api`,
      lastModified: "2026-04-18",
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
