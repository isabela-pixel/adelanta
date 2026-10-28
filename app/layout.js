import "./globals.css";

export const metadata = {
  title: "Mis tareas · Isa",
  description: "Dashboard personal de tareas",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f2ec",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎯</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
