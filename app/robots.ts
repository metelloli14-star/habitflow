import type { MetadataRoute } from 'next';

// Landing and legal pages are public; the app screens and the API are personal and shouldn't be indexed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/legal/'],
      disallow: ['/api/', '/app', '/home', '/water', '/habits', '/goals', '/stats', '/profile', '/menu',
        '/welcome', '/login', '/register', '/confirm', '/start', '/forgot', '/reset', '/documents/'],
    },
    sitemap: 'https://poleznyeprivychki.ru/sitemap.xml',
    host: 'https://poleznyeprivychki.ru',
  };
}
