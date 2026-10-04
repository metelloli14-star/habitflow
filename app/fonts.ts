import { Archivo, Inter, Montserrat, Outfit } from 'next/font/google';

// next/font downloads these at build time and serves them from your own domain:
// visitors' browsers never contact Google (no IP transfer abroad).
// Outfit and Archivo have no Cyrillic, so Russian text falls back to Inter — same as the original design.
export const inter = Inter({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-inter', display: 'swap' });
export const montserrat = Montserrat({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'], variable: '--font-montserrat', display: 'swap' });
export const archivo = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-archivo', display: 'swap' });
export const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-outfit', display: 'swap' });

export const fontVariables = [inter.variable, montserrat.variable, archivo.variable, outfit.variable].join(' ');
