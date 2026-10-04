// Inline SVG icons used across the app (stroke = currentColor).
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const HomeIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
export const DropIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M12 2s7 7.58 7 12a7 7 0 0 1-14 0c0-4.42 7-12 7-12z" /></svg>;
export const ListIcon = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.5" cy="6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="18" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
export const TrophyIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" /></svg>;
export const MenuIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const PencilIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>;
export const CloseIcon = (p: P) => <svg {...base} strokeWidth={2.2} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const BackIcon = (p: P) => <svg {...base} strokeWidth={2.2} {...p}><path d="m15 18-6-6 6-6" /></svg>;
export const ChevronRightIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="m9 18 6-6-6-6" /></svg>;
export const CheckIcon = (p: P) => <svg {...base} strokeWidth={3} {...p}><path d="M5 13l4 4L19 7" /></svg>;
export const PlusIcon = (p: P) => <svg {...base} strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const GlassIcon = (p: P) => <svg {...base} strokeWidth={1.8} {...p}><path d="M6 3h12l-1.2 16.2A2 2 0 0 1 14.8 21H9.2a2 2 0 0 1-2-1.8L6 3z" /><path d="M6.6 9h10.8" /></svg>;
export const BottleIcon = (p: P) => <svg {...base} strokeWidth={1.8} {...p}><path d="M10 2h4v3.5l1.6 1.8c.26.3.4.67.4 1.06V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8.36c0-.39.14-.76.4-1.06L9.5 5.5V3z" /><path d="M9.4 12h5.2" /></svg>;
export const BellIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
export const ChartIcon = (p: P) => <svg {...base} strokeWidth={1.8} {...p}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></svg>;
export const TargetIcon = (p: P) => (
  <svg {...base} strokeWidth={1.6} {...p}>
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
export const MailIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
export const EyeIcon = (p: P) => <svg {...base} strokeWidth={1.8} {...p}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
export const WarningIcon = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>;
export const TrendIcon = (p: P) => <svg {...base} strokeWidth={2.2} {...p}><path d="M3 17l5-6 4 4 8-9" /></svg>;
