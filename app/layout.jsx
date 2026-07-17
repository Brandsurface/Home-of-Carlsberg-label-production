import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'Can Artwork & Production — Brandsurface',
  description: 'Brief and order can artwork & production from Brandsurface',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
