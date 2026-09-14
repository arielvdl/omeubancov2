import type { KeyboardEvent } from "react";
import type { ConceptDefinition, ConceptId } from "./ConceptPrimitives";
import styles from "./landing-concepts.module.css";

type ComparisonBarProps = {
  concepts: readonly ConceptDefinition[];
  activeId: ConceptId;
  onChange: (conceptId: ConceptId) => void;
};

export default function ComparisonBar({
  concepts,
  activeId,
  onChange,
}: ComparisonBarProps) {
  const focusTab = (index: number) => {
    const next = concepts[index];
    onChange(next.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`concept-tab-${next.id}`)?.focus();
    });
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % concepts.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + concepts.length) % concepts.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = concepts.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      focusTab(nextIndex);
    }
  };

  return (
    <aside className={styles.comparisonBar} aria-label="Comparador visual">
      <div className={styles.comparisonInner}>
        <div className={styles.comparisonIntro}>
          <span className={styles.comparisonKicker}>Laboratório visual</span>
          <strong>Compare três caminhos</strong>
        </div>

        <div
          className={styles.conceptTabs}
          role="tablist"
          aria-label="Escolher conceito de landing page"
        >
          {concepts.map((concept, index) => {
            const isActive = activeId === concept.id;

            return (
              <button
                key={concept.id}
                id={`concept-tab-${concept.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="active-concept-panel"
                tabIndex={isActive ? 0 : -1}
                className={styles.conceptTab}
                data-active={isActive}
                onClick={() => onChange(concept.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <span aria-hidden="true">{concept.marker}</span>
                <span>
                  <strong>{concept.label}</strong>
                  <small>{concept.summary}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
