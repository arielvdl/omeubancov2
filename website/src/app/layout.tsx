import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AgentCapabilities from "@/components/agent/AgentCapabilities";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = "https://omeubanco.xyz";

export const metadata: Metadata = {
  title: {
    default: "O Meu Banco - Controle de mesada infantil",
    template: "%s | O Meu Banco",
  },
  description:
    "Transforme a mesada dos seus filhos em uma experiencia educativa e divertida! App de controle de mesada infantil para toda a familia, sem banco real.",
  keywords: [
    "mesada",
    "mesada infantil",
    "controle financeiro infantil",
    "educação financeira",
    "educação financeira infantil",
    "crianças",
    "família",
    "app mesada",
    "cofrinho digital",
    "poupança infantil",
    "controle de mesada",
  ],
  authors: [{ name: "Paleta Fosforescente, LDA" }],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/",
    },
  },
  openGraph: {
    title: "O Meu Banco - Controle de mesada infantil",
    description:
      "Transforme a mesada dos seus filhos em uma experiencia educativa e divertida! Sem banco real, sem cartao. Educacao financeira para toda a familia.",
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "O Meu Banco",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "O Meu Banco - Controle de mesada infantil",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "O Meu Banco - Controle de mesada infantil",
    description:
      "App de mesada infantil para toda a familia. Educacao financeira de forma divertida!",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AgentCapabilities />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
