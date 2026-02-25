import type { Metadata } from 'next';
import { Cinzel, Nunito } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import ErrorBoundary from '@/components/error-boundary';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '500', '600', '700'],
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Infinite Realms',
  description: 'AI-powered solo tabletop adventure platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${nunito.variable} ${cinzel.variable} font-sans`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
