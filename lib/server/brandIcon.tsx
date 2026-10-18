import { ImageResponse } from 'next/og';

// The Android status-bar badge of push notifications, drawn from the logo chart.
// App icons and favicons are files from the Figma design: public/icons/* and app/favicon.ico.

const LOGO_PATHS = ['M3 3v16a2 2 0 0 0 2 2h16', 'M7 16c.5-2.5 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4-4.5 5-7'];

/** Small monochrome icon for the Android status bar: only the alpha channel is used. */
export function badgeIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={Math.round(size * 0.8)} height={Math.round(size * 0.8)} viewBox="0 0 24 24" fill="none">
          {LOGO_PATHS.map((d) => (
            <path key={d} d={d} stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
