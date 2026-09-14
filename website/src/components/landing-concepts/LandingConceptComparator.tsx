"use client";

import { useState, type ReactNode } from "react";
import ComparisonBar from "./ComparisonBar";
import {
  type ConceptDefinition,
  type ConceptId,
} from "./ConceptPrimitives";
import styles from "./landing-concepts.module.css";

const concepts = [
  {
    id: "familia-primeiro",
    marker: "01",
    label: "Família Primeiro",
    summary: "Acolhedor e confiável",
  },
  {
    id: "meta-em-movimento",
    marker: "02",
    label: "Meta em Movimento",
    summary: "Expressivo e memorável",
  },
  {
    id: "duas-visoes",
    marker: "03",
    label: "Duas Visões",
    summary: "Produto em primeiro plano",
  },
] as const satisfies readonly ConceptDefinition[];

type LandingConceptComparatorProps = {
  conceptPanels: Record<ConceptId, ReactNode>;
};

export default function LandingConceptComparator({
  conceptPanels,
}: LandingConceptComparatorProps) {
  const [activeConcept, setActiveConcept] =
    useState<ConceptId>("meta-em-movimento");
  const currentConcept = concepts.find(
    (concept) => concept.id === activeConcept,
  );

  return (
    <div id="landing-concepts" className={styles.comparatorPage}>
      <ComparisonBar
        concepts={concepts}
        activeId={activeConcept}
        onChange={setActiveConcept}
      />
      <p className={styles.srOnly} aria-live="polite">
        Exibindo o conceito {currentConcept?.label}.
      </p>
      <div
        key={activeConcept}
        id="active-concept-panel"
        role="tabpanel"
        aria-labelledby={`concept-tab-${activeConcept}`}
        className={styles.conceptPanel}
      >
        {conceptPanels[activeConcept]}
      </div>
    </div>
  );
}
