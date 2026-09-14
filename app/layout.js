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
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <style>{`.material-icons{font-family:'Material Icons';font-weight:normal;font-style:normal;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;font-feature-settings:'liga'}`}</style>
      </head>
      <body style={{ margin: 0, background: '#0b0f1a' }}>{children}</body>
    </html>
  )
}
