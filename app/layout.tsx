import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  axes: ['opsz'],
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Raízes — árvore da família',
  description: 'A árvore genealógica e o arquivo da família.',
};

const themeInit = `try{var t=localStorage.getItem('raizes-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${serif.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
