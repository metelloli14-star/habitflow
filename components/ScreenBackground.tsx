import Image from 'next/image';

/** Full-screen photo behind a screen. `className` is the screen's own wrapper class (e.g. "home-bg-photo"). */
export function ScreenBackground({ className, src }: { className: string; src: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Image src={src} alt="" fill priority sizes="440px" />
    </div>
  );
}
