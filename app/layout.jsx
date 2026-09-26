import './globals.css'
import ToastHost from '@/components/Toast'

export const metadata = {
  title: {
    default: 'OriginPlayer - Media Player & Catalog',
    template: '%s | OriginPlayer',
  },
  description: 'Katalog Media & Embed Player Mandiri',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
        <ToastHost />
      </body>
    </html>
  )
}
