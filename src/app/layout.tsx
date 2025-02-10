import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AIChatBot from './components/AIChatBot';
import Footer from './components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Smart-PodcastFeed',
  description: 'A modern podcast feed reader with AI-powered insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <main className="flex-grow">
          {children}
          <AIChatBot />
        </main>
        <Footer />
      </body>
    </html>
  );
}
