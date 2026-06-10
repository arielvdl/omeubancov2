import Link from "next/link";

const artefactoUrl = "https://blog.omeubanco.xyz";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-dark text-gray-400">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-white">O Meu Banco</h3>
            <p className="mt-2 text-sm leading-relaxed">
              Controle de mesada infantil. Transforme a mesada dos seus filhos
              em uma experiência educativa e divertida.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Conteúdo
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={artefactoUrl}
                  className="hover:text-white transition-colors"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Links
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/privacidade"
                  className="hover:text-white transition-colors"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/termos"
                  className="hover:text-white transition-colors"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="/suporte"
                  className="hover:text-white transition-colors"
                >
                  Suporte
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Contato
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="mailto:suporte@omeubanco.xyz"
                  className="hover:text-white transition-colors"
                >
                  suporte@omeubanco.xyz
                </a>
              </li>
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              E-Commerce Experience Servicos da Informatica LTDA
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-xs text-gray-500">
          {currentYear} O Meu Banco. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
