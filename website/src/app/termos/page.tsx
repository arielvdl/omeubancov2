import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso do app O Meu Banco - Controle de Mesada Infantil",
};

export default function TermosPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <article className="mx-auto max-w-3xl px-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Termos de Uso
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Última atualização: março de 2026
          </p>
        </header>

        <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
          <Section title="1. Aceitação dos Termos">
            <p>
              Ao baixar, instalar ou utilizar o aplicativo O Meu Banco, você
              concorda com estes Termos de Uso. Se você não concordar com
              algum destes termos, não utilize o aplicativo.
            </p>
          </Section>

          <Section title="2. Descrição do Serviço">
            <p>
              O Meu Banco é um <strong>simulador educacional</strong> de
              controle de mesada infantil. O app foi criado para ajudar famílias
              a ensinar conceitos de educação financeira para crianças de forma
              lúdica e segura.
            </p>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-brand-yellow/10 p-4">
              <p className="font-semibold text-black">
                IMPORTANTE: O Meu Banco NÃO é um banco real, instituição
                financeira ou aplicativo de pagamentos. O app NÃO movimenta
                dinheiro real, NÃO realiza transações financeiras e NÃO está
                vinculado a nenhuma conta bancária.
              </p>
            </div>
          </Section>

          <Section title="3. Uso Destinado">
            <p>O Meu Banco é destinado para uso por:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                Pais e responsáveis legais que desejam ensinar educação
                financeira aos seus filhos
              </li>
              <li>
                Crianças, sob supervisão e consentimento dos pais/responsáveis
              </li>
            </ul>
            <p className="mt-4">
              O uso do app por menores de idade deve ser sempre supervisionado
              e autorizado por um pai ou responsável legal.
            </p>
          </Section>

          <Section title="4. Responsabilidades dos Pais/Responsáveis">
            <p>Ao usar o app, os pais/responsáveis se comprometem a:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Supervisionar o uso do app pelos seus filhos</li>
              <li>
                Fornecer informações precisas ao criar perfis de crianças
              </li>
              <li>Gerenciar adequadamente as funcionalidades de mesada</li>
              <li>
                Manter a segurança do acesso ao app (PIN e biometria)
              </li>
              <li>
                Entender que o app é um simulador educacional e não
                substitui orientação financeira profissional
              </li>
            </ul>
          </Section>

          <Section title="5. Conta e Autenticação">
            <p>
              O acesso ao app é feito através de autenticação via Passkey,
              vinculada ao email do pai/responsável. Você é responsável por
              manter a segurança do seu dispositivo e do acesso ao app.
            </p>
          </Section>

          <Section title="6. Propriedade Intelectual">
            <p>
              Todo o conteúdo do app O Meu Banco, incluindo mas não limitado a
              textos, gráficos, logos, ícones, imagens, interface de usuário e
              código fonte, é propriedade da{" "}
              <strong>E-Commerce Experience Servicos da Informatica LTDA</strong> e está protegido
              pelas leis de propriedade intelectual aplicáveis.
            </p>
            <p>
              É proibido copiar, modificar, distribuir, vender ou explorar
              comercialmente qualquer parte do app sem autorização prévia e por
              escrito.
            </p>
          </Section>

          <Section title="7. Limitação de Responsabilidade">
            <p>
              O Meu Banco é fornecido &quot;como está&quot; e &quot;conforme
              disponível&quot;. A E-Commerce Experience Servicos da Informatica LTDA não garante que:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>O app estará disponível ininterruptamente</li>
              <li>O app estará livre de erros ou defeitos</li>
              <li>
                Os resultados educacionais atingirão expectativas específicas
              </li>
            </ul>
            <p className="mt-4">
              Em nenhuma circunstância a E-Commerce Experience Servicos da Informatica LTDA será
              responsável por danos indiretos, incidentais, especiais ou
              consequenciais decorrentes do uso ou incapacidade de uso do app.
            </p>
          </Section>

          <Section title="8. Modificações do App e dos Termos">
            <p>
              Reservamo-nos o direito de modificar, suspender ou descontinuar
              qualquer funcionalidade do app a qualquer momento.
              Notificaremos os usuários sobre alterações significativas nestes
              termos através do app ou por email.
            </p>
          </Section>

          <Section title="9. Rescisão">
            <p>
              Você pode encerrar sua conta a qualquer momento solicitando a
              exclusão dos seus dados. Reservamo-nos o direito de encerrar ou
              suspender o acesso ao app em caso de violação destes termos.
            </p>
          </Section>

          <Section title="10. Lei Aplicável">
            <p>
              Estes termos são regidos pelas leis aplicáveis na jurisdição da
              E-Commerce Experience Servicos da Informatica LTDA. Qualquer disputa será resolvida nos
              tribunais competentes dessa jurisdição.
            </p>
          </Section>

          <Section title="11. Contato">
            <p>
              Para dúvidas sobre estes Termos de Uso, entre em contato:
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
                <strong>Empresa:</strong> E-Commerce Experience Servicos da Informatica LTDA
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
