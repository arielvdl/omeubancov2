import { statSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Marca e downloads",
  description:
    "Baixe a marca do O Meu Banco em SVG vetorial e PNG, com arquivos para imprensa, apresentações e publicações.",
  alternates: { canonical: "/marca" },
  openGraph: {
    title: "Marca e downloads | O Meu Banco",
    description: "Arquivos da marca em SVG e PNG, prontos para download.",
    url: "/marca",
    type: "website",
  },
};

const files = [
  {
    filename: "o-meu-banco.svg",
    format: "SVG",
    title: "Vetor original",
    detail: "Escalável, sem perda de qualidade",
  },
  {
    filename: "o-meu-banco-1024.png",
    format: "PNG",
    title: "Alta resolução",
    detail: "1024 × 1024 px",
  },
  {
    filename: "o-meu-banco-512.png",
    format: "PNG",
    title: "Uso digital",
    detail: "512 × 512 px",
  },
  {
    filename: "o-meu-banco-192.png",
    format: "PNG",
    title: "Ícone compacto",
    detail: "192 × 192 px",
  },
] as const;

const packageFilename = "o-meu-banco-marca.zip";

function fileSize(filename: string) {
  const bytes = statSync(join(process.cwd(), "public", "brand", filename)).size;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />
    </svg>
  );
}

export default function MarcaPage() {
  return (
    <article className="bg-white py-16 text-brand-dark sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
            Para imprensa e parceiros
          </p>
          <h1 className="mt-5 text-5xl leading-[0.95] font-extrabold tracking-[-0.06em] uppercase sm:text-7xl">
            A marca<br />O Meu Banco.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            Arquivos da marca para matérias, apresentações e publicações.
            Escolha o formato e faça o download.
          </p>
        </div>

        <section aria-labelledby="downloads-title" className="mt-12 grid items-start gap-10 lg:mt-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <figure className="m-0">
            <div className="flex aspect-square items-center justify-center border-2 border-brand-dark bg-brand-beige p-12 shadow-[8px_8px_0_#1a1a1a] sm:p-16">
              <Image
                src="/brand/o-meu-banco.svg"
                alt="Marca O Meu Banco: letras escuras sobre um quadrado amarelo com cantos arredondados."
                width={217}
                height={217}
                unoptimized
                className="h-auto w-full max-w-72"
              />
            </div>
            <figcaption className="mt-5 text-sm text-gray-500">
              Marca original · Amarelo e grafite
            </figcaption>
          </figure>

          <div>
            <h2 id="downloads-title" className="text-2xl font-bold tracking-tight">
              Escolha seu arquivo
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Use SVG para ampliar a marca e PNG para inserir em imagens e documentos.
            </p>

            <ul className="mt-6 border-t border-gray-200">
              {files.map((file) => (
                <li key={file.filename} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-gray-200 py-5">
                  <div className="min-w-0">
                    <p className="font-semibold">{file.title}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {file.detail} · {fileSize(file.filename)}
                    </p>
                  </div>
                  <a
                    href={`/brand/${file.filename}`}
                    download={file.filename}
                    aria-label={`Baixar ${file.format}: ${file.title}${file.format === "PNG" ? `, ${file.detail}` : ""}`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold transition-colors hover:border-brand-dark hover:bg-brand-beige focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark"
                  >
                    <DownloadIcon />
                    {file.format}
                  </a>
                </li>
              ))}
            </ul>

            <a
              href={`/brand/${packageFilename}`}
              download={packageFilename}
              className="mt-7 flex min-h-14 items-center justify-center gap-3 rounded-full bg-brand-yellow px-6 py-4 font-semibold text-black transition-colors hover:bg-brand-yellow-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-dark"
            >
              <DownloadIcon />
              Baixar todos os arquivos
            </a>
            <p className="mt-3 text-center text-xs text-gray-500">
              ZIP · 1 SVG + 3 PNGs · {fileSize(packageFilename)}
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
