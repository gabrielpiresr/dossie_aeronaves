import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'aircraft-history',
  description: 'Aplicação para consulta de histórico de aeronaves.',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
