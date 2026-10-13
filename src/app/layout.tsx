import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Forge | Sales Desk', description: 'Industrial sales negotiation and pipeline workspace' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
