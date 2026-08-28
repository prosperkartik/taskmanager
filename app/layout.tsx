import type { Metadata } from 'next';
import { Anton, Space_Grotesk } from 'next/font/google';
import './globals.css';

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-head' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'TASK MANAGER',
  description: 'Daily / weekly / monthly task board. Big screen only.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
