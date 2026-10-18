import type { MetadataRoute } from 'next';

// Web app manifest (/manifest.webmanifest): lets the app be installed on the home screen.
// On iPhone push notifications work only in the installed app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app',
    name: 'Привычка — в ритме жизни',
    short_name: 'Привычка',
    description: 'Трекер привычек, воды и целей с напоминаниями.',
    lang: 'ru',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#dfe7ef',
    theme_color: '#dfe7ef',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // The chart sits in the middle ~55% of the icon, inside Android's round safe zone.
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
