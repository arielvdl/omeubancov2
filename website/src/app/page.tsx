export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-yellow">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28 lg:py-36">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="max-w-xl">
              <h1 className="text-4xl font-extrabold tracking-tight text-black sm:text-5xl lg:text-6xl">
                O Meu Banco
              </h1>
              <p className="mt-2 text-lg font-semibold text-black/80 sm:text-xl">
                Controle de Mesada Infantil
              </p>
              <p className="mt-6 text-lg leading-relaxed text-black/70 sm:text-xl">
                Transforme a mesada dos seus filhos em uma experiência educativa e
                divertida!
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row" id="download">
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Disponível na App Store
                </a>
              </div>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-[280px] sm:w-[320px] lg:w-[360px]">
                {/* Phone 2 (behind, right) */}
                <div className="absolute -right-16 sm:-right-20 top-8 w-[240px] sm:w-[270px] lg:w-[300px] rotate-[-6deg] opacity-90">
                  <PhoneMockup screenshot="/screenshots/extrato.png" />
                </div>
                {/* Phone 1 (front, center) */}
                <div className="relative z-10 rotate-[3deg]">
                  <PhoneMockup screenshot="/screenshots/home.png" priority />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-black/5 blur-3xl" />
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Como Funciona
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Simples para os pais, divertido para as crianças
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <StepCard
              step="1"
              title="Cadastre-se"
              description="Crie sua conta em segundos usando Passkey. Sem senhas para lembrar, sem complicação."
            />
            <StepCard
              step="2"
              title="Adicione seus filhos"
              description="Cadastre as crianças com nome e avatar. Você controla tudo pela área dos pais."
            />
            <StepCard
              step="3"
              title="Gerencie a mesada"
              description="Defina valores, acompanhe gastos e ensine seus filhos sobre educação financeira."
            />
          </div>
        </div>
      </section>

      {/* Por que O Meu Banco */}
      <section className="bg-brand-beige py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Por que O Meu Banco?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Mais do que um app, uma ferramenta educacional
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              }
              title="Educativo"
              description="Ensine conceitos financeiros de forma prática e lúdica desde cedo."
            />
            <FeatureCard
              icon={
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              }
              title="Seguro"
              description="Sem dinheiro real envolvido. É um simulador seguro para toda a família."
            />
            <FeatureCard
              icon={
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                </svg>
              }
              title="Divertido"
              description="Interface colorida e intuitiva que as crianças adoram usar."
            />
            <FeatureCard
              icon={
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
              }
              title="Familiar"
              description="Projetado para pais e filhos usarem juntos, fortalecendo a relação."
            />
          </div>
        </div>
      </section>

      {/* Para Toda a Família */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Para Toda a Família
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Cada membro da família tem sua própria experiência, pensada
              especialmente para sua idade e necessidade
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/20 px-4 py-1.5 text-sm font-semibold text-black">
                Área dos Pais
              </div>
              <h3 className="mt-4 text-xl font-bold text-brand-dark">
                Controle total na palma da mão
              </h3>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                  Gerencie mesadas e tarefas dos filhos
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                  Acompanhe o histórico de transações
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                  Defina metas de economia para cada filho
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                  Área protegida com PIN e biometria
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/20 px-4 py-1.5 text-sm font-semibold text-black">
                Área das Crianças
              </div>
              <h3 className="mt-4 text-xl font-bold text-brand-dark">
                Aprender brincando
              </h3>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                  Veja o saldo e extrato de forma simples
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                  Interface colorida e fácil de usar
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                  Acompanhe metas de economia
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-yellow" />
                  Sem publicidade ou conteúdo externo
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section id="seguranca" className="bg-brand-beige py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Segurança em Primeiro Lugar
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Projetado com a proteção da sua família como prioridade
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <SecurityCard
              title="Sem dinheiro real"
              description="O Meu Banco é um simulador educacional. Nenhuma transação financeira real é realizada."
            />
            <SecurityCard
              title="Privacidade infantil"
              description="Conforme LGPD e COPPA. Não coletamos dados pessoais de crianças além do primeiro nome."
            />
            <SecurityCard
              title="Sem publicidade"
              description="Zero anúncios na área infantil. Seus filhos aprendem sem distração comercial."
            />
            <SecurityCard
              title="Login com Passkey"
              description="Autenticação moderna e segura, sem senhas. Proteção biométrica no dispositivo."
            />
            <SecurityCard
              title="Dados protegidos"
              description="Dados armazenados de forma segura em infraestrutura Google Cloud com criptografia."
            />
            <SecurityCard
              title="Controle dos pais"
              description="Área dos pais protegida por PIN e biometria. Você decide o que seus filhos acessam."
            />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-brand-yellow py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Comece a educação financeira dos seus filhos hoje
          </h2>
          <p className="mt-4 text-lg text-black/70 max-w-2xl mx-auto">
            Baixe O Meu Banco e transforme a mesada em uma oportunidade de
            aprendizado para toda a família.
          </p>
          <div className="mt-10">
            <a
              href="#"
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-black px-8 py-4 text-base font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Disponível na App Store
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-3xl border border-gray-200 bg-white p-8">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow text-lg font-bold text-black">
        {step}
      </div>
      <h3 className="mt-4 text-lg font-bold text-brand-dark">{title}</h3>
      <p className="mt-2 text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-yellow/20 text-brand-dark">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-brand-dark">{title}</h3>
      <p className="mt-2 text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function SecurityCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-base font-bold text-brand-dark">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function PhoneMockup({
  screenshot,
  priority = false,
}: {
  screenshot: string;
  priority?: boolean;
}) {
  const baseName = screenshot.replace("/screenshots/", "").replace(".png", "");
  const webp2x = `/screenshots/${baseName}.webp`;
  const webp1x = `/screenshots/${baseName}-1x.webp`;
  const fallback = screenshot;

  return (
    <div className="relative rounded-[2.5rem] bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1c] p-[10px] ring-1 ring-white/[0.08]">
      {/* Side buttons (left) */}
      <div className="absolute -left-[2px] top-[18%] h-[6%] w-[3px] rounded-l-sm bg-[#3a3a3e]" />
      <div className="absolute -left-[2px] top-[28%] h-[8%] w-[3px] rounded-l-sm bg-[#3a3a3e]" />
      <div className="absolute -left-[2px] top-[38%] h-[8%] w-[3px] rounded-l-sm bg-[#3a3a3e]" />
      {/* Power button (right) */}
      <div className="absolute -right-[2px] top-[30%] h-[10%] w-[3px] rounded-r-sm bg-[#3a3a3e]" />

      {/* Dynamic Island */}
      <div className="absolute left-1/2 top-[16px] z-20 h-[24px] w-[100px] -translate-x-1/2 rounded-full bg-black" />

      {/* Screen */}
      <div className="relative overflow-hidden rounded-[2rem] bg-white">
        <picture>
          <source
            type="image/webp"
            srcSet={`${webp1x} 400w, ${webp2x} 800w`}
            sizes="(max-width: 640px) 260px, (max-width: 1024px) 300px, 360px"
          />
          <img
            src={fallback}
            alt="O Meu Banco app screenshot"
            className="block w-full h-auto"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            draggable={false}
          />
        </picture>
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-[12px] left-1/2 h-[4px] w-[28%] -translate-x-1/2 rounded-full bg-white/20" />
    </div>
  );
}
