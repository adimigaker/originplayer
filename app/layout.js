export const metadata = {
  title: {
    default: 'OriginPlayer - Playlist Streaming Opensource',
    template: '%s | OriginPlayer',
  },
  description: 'Buat playlist streaming sendiri. Tanpa akun, cukup kode.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, background: '#0b0f1a' }}>{children}</body>
    </html>
  )
}
