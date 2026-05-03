import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Repara Lá — Painel Admin',
  description: 'Painel de gestão do Repara Lá',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
