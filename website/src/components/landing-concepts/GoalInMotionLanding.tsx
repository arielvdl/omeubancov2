import Image from "next/image";
import { AppStoreCTA, PhoneFrame } from "./ConceptPrimitives";
import { landingFaqItems } from "@/lib/landing-content";
import motionStyles from "./goal-in-motion.module.css";
import sharedStyles from "./landing-shared.module.css";

const styles = { ...sharedStyles, ...motionStyles };

const tickerWords = ["Planejar", "Escolher", "Aprender", "Conquistar"];

const journeySteps = [
  {
    label: "Combinado",
    title: "A regra ganha significado.",
    copy: "Transforme acordos da família em referências claras para a criança.",
    accent: "sun",
  },
  {
    label: "Escolha",
    title: "A criança decide o próximo passo.",
    copy: "Guardar, usar ou esperar deixa de ser abstrato quando o progresso está visível.",
    accent: "yellow",
  },
  {
    label: "Conquista",
    title: "A meta vira memória.",
    copy: "Cada objetivo alcançado mostra que planejamento e paciência funcionam.",
    accent: "mint",
  },
] as const;

export default function GoalInMotionLanding() {
  return (
    <article
      className={styles.motionLanding}
      aria-labelledby="goal-in-motion-title"
      data-landing-version="meta-em-movimento"
    >
      <section className={styles.motionHero}>
        <div className={styles.motionGrid} aria-hidden="true" />
        <span className={styles.motionOrbOne} aria-hidden="true" />
        <span className={styles.motionOrbTwo} aria-hidden="true" />

        <div className={`${styles.conceptContainer} ${styles.motionHeroGrid}`}>
          <div className={styles.motionHeroCopy}>
            <span className={styles.motionEyebrow}>
              Aprender fazendo
              <span aria-hidden="true">↗</span>
            </span>
            <h1 id="goal-in-motion-title">
              Cada conquista começa com uma primeira meta.
            </h1>
            <p>
              O app de mesada infantil que transforma desejos em planos e
              pequenas escolhas em confiança. Tudo de um jeito visual, leve e
              feito para aprender junto.
            </p>

            <div className={styles.motionActions}>
              <AppStoreCTA
                label="Criar a primeira meta"
                supportingText="Baixe grátis para iPhone"
                variant="yellow"
                className={styles.motionPrimaryCta}
              />
              <a href="#como-funciona" className={styles.motionSecondaryLink}>
                Ver a jornada
              </a>
            </div>
            <small className={styles.motionDisclaimer}>
              Simulador educacional — não é banco nem aplicativo de pagamentos.
            </small>
          </div>

          <div className={styles.motionStage} aria-label="Prévia do aplicativo">
            <span className={styles.motionTrail} aria-hidden="true" />
            <div className={styles.motionGoalLabel}>
              <span>Meta em movimento</span>
              <strong>Meu primeiro skate</strong>
            </div>
            <PhoneFrame
              screenshot="/screenshots/home.png"
              alt="Tela de O Meu Banco mostrando o saldo e o progresso financeiro da criança"
              priority
              className={styles.motionPhone}
            />
            <div className={styles.motionProgressCard}>
              <div>
                <span>Faltam só</span>
                <strong>€ 45</strong>
              </div>
              <span className={styles.motionProgressTrack} aria-hidden="true">
                <span />
              </span>
              <small>68% da meta concluída</small>
            </div>
            <span className={styles.motionSticker} aria-hidden="true">
              VAI!
            </span>
          </div>
        </div>

        <div className={styles.motionTicker} aria-hidden="true">
          <div className={styles.motionTickerTrack}>
            {[0, 1].map((copy) => (
              <div className={styles.motionTickerGroup} key={copy}>
                {tickerWords.map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.motionJourneySection}>
        <div className={styles.motionJourneyLead}>
          <div className={styles.motionJourneyVisual}>
            <Image
              src="/images/jornada-em-familia.webp"
              alt="Mãe e filho organizam moedas em potes para aprender a poupar juntos."
              width={1774}
              height={887}
              loading="lazy"
              decoding="async"
              unoptimized
            />
          </div>
          <div className={`${styles.conceptContainer} ${styles.motionSectionTitle}`}>
            <div className={styles.motionJourneyIntro}>
              <span>Do combinado à conquista</span>
              <h2>Três momentos. Uma habilidade para a vida toda.</h2>
            </div>
          </div>
        </div>

        <div className={styles.conceptContainer}>
          <ol className={styles.motionJourney}>
            {journeySteps.map((step, index) => (
              <li key={step.label} data-accent={step.accent}>
                <div className={styles.motionStepTopline}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <small>{step.label}</small>
                </div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="seguranca" className={styles.motionTraceSection}>
        <div className={`${styles.conceptContainer} ${styles.motionTraceGrid}`}>
          <div className={styles.motionTraceVisual}>
            <span className={styles.motionTraceWord} aria-hidden="true">
              CLARO
            </span>
            <PhoneFrame
              screenshot="/screenshots/extrato.png"
              alt="Extrato do aplicativo com histórico de entradas e usos do saldo virtual"
              className={styles.motionTracePhone}
            />
          </div>

          <div className={styles.motionTraceCopy}>
            <span className={styles.motionEyebrow}>Autonomia acompanhada</span>
            <h2>Toda escolha deixa um rastro fácil de entender.</h2>
            <p>
              O extrato torna as decisões visíveis e abre espaço para conversar
              sobre consequência, prioridade e espera — sem movimentar dinheiro
              real.
            </p>
            <ul>
              <li>
                <strong>Saldo virtual</strong>
                <span>Aprendizado sem risco financeiro.</span>
              </li>
              <li>
                <strong>Área do responsável</strong>
                <span>Regras e ajustes ficam sob supervisão.</span>
              </li>
              <li>
                <strong>Regras em família</strong>
                <span>Combinados visíveis para orientar cada escolha.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.motionFaqSection} aria-labelledby="faq-title">
        <div className={styles.conceptContainer}>
          <div className={styles.motionFaqHeading}>
            <span>Perguntas frequentes</span>
            <h2 id="faq-title">O essencial, sem letra pequena.</h2>
            <p>
              Respostas diretas para entender como O Meu Banco entra na rotina
              da família.
            </p>
          </div>

          <div className={styles.motionFaqList}>
            {landingFaqItems.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.question}</strong>
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="download" className={styles.motionFinalCta}>
        <div className={styles.motionFinalBackdrop} aria-hidden="true" />
        <div className={styles.motionFinalInner}>
          <span>Prontos?</span>
          <h2>A próxima meta pode começar hoje.</h2>
          <p>
            Baixe O Meu Banco e crie um jeito mais leve de falar sobre dinheiro
            em família.
          </p>
          <AppStoreCTA
            label="Começar uma meta"
            supportingText="Disponível para iPhone"
            variant="ink"
          />
        </div>
      </section>
    </article>
  );
}
