import type { MetadataRoute } from 'next';
import { LEGAL_DOCUMENTS, OPERATOR } from '@/lib/shared/legal';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${OPERATOR.siteUrl}/`, changeFrequency: 'monthly', priority: 1 },
    ...Object.keys(LEGAL_DOCUMENTS).map((slug) => ({
      url: `${OPERATOR.siteUrl}/legal/${slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];
}
