import type { Metadata } from "next";
import {
  creatorJsonLdId,
  O_MEU_BANCO_CREATORS,
} from "@/lib/people";
import { serializeJsonLd } from "@/lib/json-ld";

const siteUrl = "https://omeubanco.xyz";
const pageUrl = `${siteUrl}/quem-somos`;

export const metadata: Metadata = {
  title: "Quem somos",
  description:
    "Conheça Ariel Alexandre e Vanessa Caldas, criadores do O Meu Banco, app de educação financeira para famílias.",
  alternates: {
    canonical: "/quem-somos",
  },
  openGraph: {
    title: "Quem somos",
    description:
      "Conheça Ariel Alexandre e Vanessa Caldas, criadores do O Meu Banco, app de educação financeira para famílias.",
    type: "website",
    url: "/quem-somos",
  },
};

export default function QuemSomosPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <article className="mx-auto max-w-4xl px-6">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            O Meu Banco
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Quem somos
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-600">
            O Meu Banco nasceu dentro de casa. Ariel Alexandre e Vanessa Caldas
            queriam ajudar a filha a entender a mesada sem a complexidade de uma
            conta bancária real. A ideia virou um app para aproximar famílias da
            educação financeira de forma visual, segura e prática.
          </p>
        </header>

        <section
          aria-labelledby="criadores-title"
          className="mt-16 border-t border-gray-200 pt-12"
        >
          <h2
            id="criadores-title"
            className="text-2xl font-bold text-brand-dark"
          >
            Criadores
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {O_MEU_BANCO_CREATORS.map((person) => (
              <article
                key={person.id}
                className="rounded-3xl border border-gray-100 bg-brand-beige p-8"
              >
                <h3 className="text-xl font-bold text-brand-dark">
                  {person.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {person.role}
                </p>
                <p className="mt-5 leading-relaxed text-gray-600">
                  {person.description}
                </p>

                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
                  {person.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-dark underline decoration-gray-300 underline-offset-4 transition-colors hover:decoration-brand-dark"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "@id": `${pageUrl}#page`,
            url: pageUrl,
            name: "Quem somos | O Meu Banco",
            description:
              "Conheça Ariel Alexandre e Vanessa Caldas, criadores do O Meu Banco.",
            mainEntity: {
              "@id": `${siteUrl}/#organization`,
            },
            about: O_MEU_BANCO_CREATORS.map((person) => ({
              "@id": creatorJsonLdId(person.id),
            })),
          }),
        }}
      />
    </div>
  );
}
