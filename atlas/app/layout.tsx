import type { Metadata } from "next";
import "./globals.css";

const title = "Tablia | Tablas comparativas de sistemas jurídicos";
const description = "Crea tablas comparativas claras. Organiza familias jurídicas, relaciona antecedentes y amplía tus tablas, capítulo por capítulo.";
export const metadata: Metadata = {
  metadataBase: new URL("https://tablia.yunuen-moncada0173.chatgpt.site"),
  title,
  applicationName: "Tablia",
  description,
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Tablia",
    title,
    description,
    images: [{ url: "/brand/seo-thumbnail.png", width: 1734, height: 907, alt: "Tablia. Crea tablas comparativas claras." }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/brand/seo-thumbnail.png"],
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="antialiased">{children}</body></html>;
}
