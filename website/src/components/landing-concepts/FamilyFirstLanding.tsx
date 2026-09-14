import { AppStoreCTA, PhoneFrame } from "./ConceptPrimitives";
import conceptStyles from "./landing-concepts.module.css";
import sharedStyles from "./landing-shared.module.css";

const styles = { ...sharedStyles, ...conceptStyles };

const familySteps = [
  {
    number: "01",
    title: "Combinem",
    description:
      "Pais e filhos criam juntos as regras, a frequência da mesada e os objetivos da criança.",
  },
  {
    number: "02",
    title: "Acompanhem",
    description:
      "Saldo, extrato e desejos ficam claros para transformar cada escolha em uma conversa real.",
  },
  {
    number: "03",
    title: "Celebrem",
    description:
      "O progresso aparece de forma simples — e cada meta alcançada vira uma conquista da família.",
  },
] as const;

export default function FamilyFirstLanding() {
  return (
    <article
      className={styles.familyLanding}
      aria-labelledby="family-first-title"
    >
      <section className={styles.familyHero}>
        <div className={styles.familyAura} aria-hidden="true" />
        <div className={`${styles.conceptContainer} ${styles.familyHeroGrid}`}>
          <div className={styles.familyHeroCopy}>
            <span className={styles.familyEyebrow}>
              Educação financeira que aproxima
            </span>
            <h1 id="family-first-title">
              Aprender sobre dinheiro começa em família.
            </h1>
            <p>
              Um espaço simples para transformar mesada, escolhas e desejos em
              conversas que acompanham seus filhos por toda a vida.
            </p>

            <div className={styles.familyActions}>
              <AppStoreCTA
                label="Começar em família"
                supportingText="Baixe grátis para iPhone"
                className={styles.familyPrimaryCta}
              />
              <a className={styles.familyTextLink} href="#como-funciona">
                Conhecer a experiência
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <ul className={styles.familyTrustList} aria-label="Características">
              <li>Sem movimentar dinheiro real</li>
              <li>Uso acompanhado pelos responsáveis</li>
              <li>Regras construídas em família</li>
            </ul>
          </div>

          <div className={styles.familyVisual} aria-label="Prévia do aplicativo">
            <div className={styles.familyVisualBackdrop} aria-hidden="true" />
            <PhoneFrame
              screenshot="/screenshots/home.png"
              alt="Tela inicial de O Meu Banco com saldo e movimentações da criança"
              priority
              className={styles.familyPhone}
            />

            <div className={styles.familyAgreementCard}>
              <span className={styles.familyAgreementIcon} aria-hidden="true">
                ✓
              </span>
              <span>
                <small>Acordo da família</small>
                <strong>Regras combinadas</strong>
              </span>
            </div>

            <div className={styles.familyGoalCard}>
              <span>Meta da Sofia</span>
              <strong>80%</strong>
              <span className={styles.familyGoalTrack} aria-hidden="true">
                <span />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.familyRitualSection}>
        <div className={styles.conceptContainer}>
          <div className={styles.familySectionIntro}>
            <span>Um novo ritual em casa</span>
            <h2>Dinheiro deixa de ser um assunto difícil.</h2>
            <p>
              O Meu Banco cria pequenos momentos de aprendizagem no ritmo de
              cada família.
            </p>
          </div>

          <ol className={styles.familySteps}>
            {familySteps.map((step) => (
              <li key={step.number}>
                <span className={styles.familyStepNumber}>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="seguranca" className={styles.familyContractSection}>
        <div
          className={`${styles.conceptContainer} ${styles.familyContractGrid}`}
        >
          <div className={styles.familyContractVisual}>
            <div className={styles.familyContractShape} aria-hidden="true" />
            <PhoneFrame
              screenshot="/screenshots/contrato.png"
              alt="Contrato familiar no aplicativo com regras definidas por pais e filhos"
              className={styles.familyContractPhone}
            />
          </div>

          <div className={styles.familyContractCopy}>
            <span className={styles.familyEyebrow}>Confiança antes de controle</span>
            <h2>Um acordo claro vale mais do que um discurso.</h2>
            <p>
              O contrato familiar transforma expectativas em regras visíveis.
              A criança entende o combinado e o responsável acompanha sem
              transformar a experiência em vigilância.
            </p>

            <dl className={styles.familyAssurances}>
              <div>
                <dt>Educacional</dt>
                <dd>O saldo é virtual e serve para aprender na prática.</dd>
              </div>
              <div>
                <dt>Compartilhado</dt>
                <dd>As regras são construídas e assinadas em família.</dd>
              </div>
              <div>
                <dt>Supervisionado</dt>
                <dd>Funções importantes ficam na área do responsável.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="download" className={styles.familyFinalCta}>
        <div className={styles.familyFinalInner}>
          <span className={styles.familyFinalSeal} aria-hidden="true">
            OMB
          </span>
          <div>
            <span>Uma escolha pequena hoje</span>
            <h2>Uma relação mais saudável com dinheiro amanhã.</h2>
          </div>
          <AppStoreCTA
            label="Baixar O Meu Banco"
            supportingText="Disponível para iPhone"
            variant="yellow"
            className={styles.familyFinalCtaButton}
          />
        </div>
      </section>
    </article>
  );
}
