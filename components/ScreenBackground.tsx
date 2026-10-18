import Image from 'next/image';

/** Photos behind the app screens (preloaded by the app layout, so a screen never appears without its photo). */
export const SCREEN_BACKGROUNDS = [
  '/images/home-bg.jpg',
  '/images/water-bg.jpg',
  '/images/habits-bg.jpg',
  '/images/goals-bg.jpg',
  '/images/stats-bg.jpg',
  '/images/profile-bg.jpg',
  '/images/add-habit-bg.jpg',
  '/images/edit-habit-bg.jpg',
];

/**
 * Full-screen photo behind a screen. `className` is the screen's own wrapper class (e.g. "home-bg-photo").
 * The photos are small blurred JPEGs, served as they are (no resizing round trip) and cached by the browser.
 */
export function ScreenBackground({ className, src }: { className: string; src: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Image src={src} alt="" fill priority unoptimized />
    </div>
  );
}
