import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade do app O Meu Banco - Controle de Mesada Infantil",
};

export default function PrivacidadePage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <article className="mx-auto max-w-3xl px-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Última atualização: março de 2026
          </p>
        </header>

        <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
          <Section title="1. Introdução">
            <p>
              O Meu Banco é um aplicativo de controle de mesada infantil
              desenvolvido pela <strong>Paleta Fosforescente, LDA</strong>,
              voltado para uso familiar por pais/responsáveis e crianças. Esta
              política descreve como coletamos, usamos e protegemos as
              informações dos nossos usuários.
            </p>
            <p>
              Levamos a privacidade da sua família a sério, especialmente quando
              se trata de crianças. Nosso app foi projetado em conformidade com
              a <strong>LGPD</strong> (Lei Geral de Proteção de Dados) e o{" "}
              <strong>COPPA</strong> (Children&apos;s Online Privacy Protection Act).
            </p>
          </Section>

          <Section title="2. Dados que coletamos">
            <p>
              Coletamos apenas as informações estritamente necessárias para o
              funcionamento do app:
            </p>
            <h4 className="mt-4 font-semibold text-brand-dark">
              Dados dos pais/responsáveis:
            </h4>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Nome completo</li>
              <li>
                Endereço de email (utilizado para autenticação via Passkey)
              </li>
            </ul>
            <h4 className="mt-4 font-semibold text-brand-dark">
              Dados das crianças:
            </h4>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Primeiro nome (inserido e controlado pelos pais)</li>
              <li>Avatar/imagem de perfil (controlado pelos pais)</li>
            </ul>
            <p className="mt-4 font-semibold text-brand-dark">
              NÃO coletamos dados pessoais de crianças como sobrenome,
              localização, número de telefone, fotos pessoais ou qualquer outra
              informação identificável.
            </p>
          </Section>

          <Section title="3. Como usamos os dados">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Autenticação e identificação dos pais/responsáveis no app
              </li>
              <li>
                Funcionamento das funcionalidades de controle de mesada
              </li>
              <li>Personalização da experiência da criança (nome e avatar)</li>
            </ul>
          </Section>

          <Section title="4. Dados que NÃO coletamos">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                NÃO utilizamos analytics de terceiros na área infantil do app
              </li>
              <li>NÃO exibimos publicidade de nenhum tipo</li>
              <li>
                NÃO compartilhamos dados com terceiros para fins comerciais
              </li>
              <li>NÃO rastreamos a atividade das crianças para fins de marketing</li>
              <li>NÃO coletamos dados de localização</li>
            </ul>
          </Section>

          <Section title="5. Armazenamento e segurança">
            <p>
              Os dados são armazenados de forma segura utilizando infraestrutura{" "}
              <strong>Google Cloud</strong>, com criptografia em trânsito e em
              repouso. Implementamos medidas técnicas e organizacionais
              adequadas para proteger os dados contra acesso não autorizado,
              alteração, divulgação ou destruição.
            </p>
          </Section>

          <Section title="6. Direitos do usuário">
            <p>
              Em conformidade com a LGPD, você tem o direito de:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                <strong>Acesso:</strong> Solicitar uma cópia de todos os dados
                pessoais que mantemos sobre você e seus filhos
              </li>
              <li>
                <strong>Correção:</strong> Solicitar a correção de dados
                incorretos ou desatualizados
              </li>
              <li>
                <strong>Exclusão:</strong> Solicitar a exclusão de todos os seus
                dados e dos dados dos seus filhos
              </li>
              <li>
                <strong>Portabilidade:</strong> Solicitar a exportação dos seus
                dados em formato legível
              </li>
            </ul>
            <p className="mt-4">
              Para exercer qualquer um desses direitos, entre em contato
              conosco pelo email{" "}
              <a
                href="mailto:suporte@omeubanco.xyz"
                className="font-semibold text-brand-dark underline underline-offset-2"
              >
                suporte@omeubanco.xyz
              </a>
              .
            </p>
          </Section>

          <Section title="7. Consentimento dos pais">
            <p>
              Todas as informações de crianças são inseridas e gerenciadas
              exclusivamente pelos pais/responsáveis. Ao criar o perfil de uma
              criança no app, o pai/responsável consente com o uso dos dados
              conforme descrito nesta política.
            </p>
          </Section>

          <Section title="8. Alterações nesta política">
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos os
              usuários sobre alterações significativas através do app ou por
              email. O uso continuado do app após as alterações constitui
              aceitação da política atualizada.
            </p>
          </Section>

          <Section title="9. Contato">
            <p>
              Para dúvidas sobre esta política de privacidade ou sobre o
              tratamento dos seus dados, entre em contato:
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:suporte@omeubanco.xyz"
                  className="font-semibold text-brand-dark underline underline-offset-2"
                >
                  suporte@omeubanco.xyz
                </a>
              </li>
              <li>
                <strong>Empresa:</strong> Paleta Fosforescente, LDA
              </li>
            </ul>
          </Section>
        </div>
      </article>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-brand-dark">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
