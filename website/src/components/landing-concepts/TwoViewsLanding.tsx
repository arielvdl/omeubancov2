"use client";

import { useState, type KeyboardEvent } from "react";
import { AppStoreCTA, PhoneFrame } from "./ConceptPrimitives";
import conceptStyles from "./landing-concepts.module.css";
import sharedStyles from "./landing-shared.module.css";

const styles = { ...sharedStyles, ...conceptStyles };

type ViewId = "child" | "guardian";

const productViews = {
  child: {
    label: "Visão da criança",
    shortLabel: "Criança",
    title: "Meu saldo faz sentido.",
    copy: "Uma visão simples para acompanhar escolhas, histórico e objetivos.",
    screenshot: "/screenshots/home.png",
    alt: "Área da criança em O Meu Banco com saldo, progresso e movimentações",
  },
  guardian: {
    label: "Visão do responsável",
    shortLabel: "Responsável",
    title: "Eu acompanho sem complicar.",
    copy: "Mesada, ajustes e regras da família organizados em um só lugar.",
    screenshot: "/screenshots/alterar-saldo.png",
    alt: "Área do responsável em O Meu Banco para gerir o saldo virtual da criança",
  },
} as const;

export default function TwoViewsLanding() {
  const [activeView, setActiveView] = useState<ViewId>("child");
  const view = productViews[activeView];
  const viewIds = Object.keys(productViews) as ViewId[];

  const selectView = (viewId: ViewId, moveFocus = false) => {
    setActiveView(viewId);
    if (moveFocus) {
      window.requestAnimationFrame(() => {
        document.getElementById(`product-view-tab-${viewId}`)?.focus();
      });
    }
  };

  const handleViewKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % viewIds.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + viewIds.length) % viewIds.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = viewIds.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      selectView(viewIds[nextIndex], true);
    }
  };

  return (
    <article
      className={styles.viewsLanding}
      aria-labelledby="two-views-title"
    >
      <section className={styles.viewsHero}>
        <div className={styles.viewsHeroRule} aria-hidden="true" />
        <div className={`${styles.conceptContainer} ${styles.viewsHeroGrid}`}>
          <div className={styles.viewsHeroCopy}>
            <span className={styles.viewsEyebrow}>Um banco virtual. Duas experiências.</span>
            <h1 id="two-views-title">
              Vocês aprendem juntos. Cada um do seu jeito.
            </h1>
            <p>
              A criança entende o próprio dinheiro. O responsável orienta as
              decisões. O Meu Banco conecta as duas pontas com clareza.
            </p>

            <div className={styles.viewsActions}>
              <AppStoreCTA
                label="Começar em família"
                supportingText="Baixe grátis para iPhone"
                variant="ink"
                className={styles.viewsPrimaryCta}
              />
              <a href="#como-funciona" className={styles.viewsTextLink}>
                Explorar as duas visões
                <span aria-hidden="true">↘</span>
              </a>
            </div>
          </div>

          <div className={styles.viewsProductDemo}>
            <div
              className={styles.viewsSwitcher}
              role="tablist"
              aria-label="Alternar visualização do aplicativo"
            >
              {viewIds.map((viewId, index) => {
                const item = productViews[viewId];
                const isActive = activeView === viewId;

                return (
                  <button
                    key={viewId}
                    id={`product-view-tab-${viewId}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="product-view-panel"
                    tabIndex={isActive ? 0 : -1}
                    data-active={isActive}
                    onClick={() => selectView(viewId)}
                    onKeyDown={(event) => handleViewKeyDown(event, index)}
                  >
                    {item.shortLabel}
                  </button>
                );
              })}
            </div>

            <div
              id="product-view-panel"
              className={styles.viewsDemoPanel}
              role="tabpanel"
              aria-labelledby={`product-view-tab-${activeView}`}
            >
              <div className={styles.viewsDemoCopy}>
                <span>{view.label}</span>
                <h2>{view.title}</h2>
                <p>{view.copy}</p>
              </div>
              <PhoneFrame
                key={activeView}
                screenshot={view.screenshot}
                alt={view.alt}
                priority
                className={styles.viewsPhone}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.viewsFlowSection}>
        <div className={styles.conceptContainer}>
          <div className={styles.viewsSectionHeading}>
            <span>O mesmo aprendizado, visto pelos dois lados</span>
            <h2>Clareza para orientar. Liberdade para experimentar.</h2>
          </div>

          <div className={styles.viewsFlowGrid}>
            <article className={styles.viewsRoleCard} data-role="child">
              <span className={styles.viewsRoleIndex}>01</span>
              <span className={styles.viewsRoleBadge}>Para a criança</span>
              <h3>Ver, escolher e entender.</h3>
              <ul>
                <li>Saldo virtual em linguagem simples</li>
                <li>Histórico das próprias escolhas</li>
                <li>Desejos que viram metas visíveis</li>
              </ul>
            </article>

            <div className={styles.viewsConnection} aria-hidden="true">
              <span />
              <strong>JUNTOS</strong>
              <span />
            </div>

            <article className={styles.viewsRoleCard} data-role="guardian">
              <span className={styles.viewsRoleIndex}>02</span>
              <span className={styles.viewsRoleBadge}>Para o responsável</span>
              <h3>Combinar, acompanhar e conversar.</h3>
              <ul>
                <li>Mesada e agenda organizadas</li>
                <li>Contrato com regras da família</li>
                <li>Acesso protegido às decisões importantes</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="seguranca" className={styles.viewsSafetySection}>
        <div className={`${styles.conceptContainer} ${styles.viewsSafetyGrid}`}>
          <div className={styles.viewsSafetyIntro}>
            <span className={styles.viewsEyebrow}>Limites que ficam visíveis</span>
            <h2>Autonomia não precisa vir sem supervisão.</h2>
            <p>
              O Meu Banco separa a experiência da criança das funções de
              gestão, mantendo o aprendizado leve e as decisões importantes
              com a família.
            </p>
          </div>

          <div className={styles.viewsSafetyList}>
            <div>
              <span aria-hidden="true">A</span>
              <p>
                <strong>Ambiente educacional</strong>
                Nenhuma movimentação financeira real acontece no app.
              </p>
            </div>
            <div>
              <span aria-hidden="true">B</span>
              <p>
                <strong>Responsável no comando</strong>
                Regras, saldo e configurações importantes ficam protegidos.
              </p>
            </div>
            <div>
              <span aria-hidden="true">C</span>
              <p>
                <strong>Contrato em família</strong>
                Regras podem ser criadas e assinadas por pais e filhos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="download" className={styles.viewsFinalCta}>
        <div className={styles.viewsFinalGrid}>
          <span className={styles.viewsFinalNumber} aria-hidden="true">
            2
          </span>
          <div>
            <span>Duas visões</span>
            <h2>Uma conversa que acompanha a família.</h2>
          </div>
          <AppStoreCTA
            label="Baixar O Meu Banco"
            supportingText="Disponível para iPhone"
            variant="light"
            className={styles.viewsFinalCtaButton}
          />
        </div>
      </section>
    </article>
  );
}
