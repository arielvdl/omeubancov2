const siteUrl = "https://omeubanco.xyz";

export const O_MEU_BANCO_CREATORS = [
  {
    id: "ariel-alexandre",
    name: "Ariel Alexandre",
    role: "Cocriador do O Meu Banco",
    description:
      "Empreendedor de inovação e tecnologia que transforma novas tecnologias em produtos úteis para pessoas.",
    websiteUrl: "https://arielalexandre.com.br/",
    links: [
      {
        label: "Site de Ariel Alexandre",
        href: "https://arielalexandre.com.br/",
      },
      {
        label: "Wikidata",
        href: "https://www.wikidata.org/wiki/Q140047567",
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/arielalexandre/",
      },
    ],
  },
  {
    id: "vanessa-caldas",
    name: "Vanessa Caldas",
    role: "Cocriadora do O Meu Banco",
    description:
      "Empreendedora e estrategista de negócios que cria projetos digitais centrados nas necessidades das pessoas.",
    websiteUrl: "https://vanessacaldas.com/",
    links: [
      {
        label: "Site de Vanessa Caldas",
        href: "https://vanessacaldas.com/",
      },
      {
        label: "Wikidata",
        href: "https://www.wikidata.org/wiki/Q140564140",
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/vanessacaldas/",
      },
    ],
  },
] as const;

export function creatorJsonLdId(id: string) {
  return `${siteUrl}/quem-somos#${id}`;
}
