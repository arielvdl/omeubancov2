import GoalInMotionLanding from "@/components/landing-concepts/GoalInMotionLanding";
import { landingFaqItems } from "@/lib/landing-content";
import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";

const siteUrl = "https://omeubanco.xyz";

export const metadata: Metadata = {
  title: {
    absolute: "O Meu Banco — Controle de mesada infantil",
  },
  description:
    "Transforme desejos em metas e pequenas escolhas em confiança com um app visual de mesada infantil, sem movimentar dinheiro real.",
  alternates: {
    canonical: "/",
    languages: { "pt-BR": "/" },
  },
  openGraph: {
    title: "O Meu Banco — Controle de mesada infantil",
    description:
      "Metas, saldo virtual e escolhas acompanhadas para aprender sobre dinheiro em família.",
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "O Meu Banco",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "O Meu Banco — Controle de mesada infantil",
      },
    ],
  },
};

export default function Home() {
  return (
    <>
      <GoalInMotionLanding />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: landingFaqItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          }),
        }}
      />
    </>
  );
}
