import type { ReactNode } from "react";
import styles from "./landing-shared.module.css";

export const APP_STORE_URL =
  "https://apps.apple.com/app/o-meu-banco-mesada-infantil/id6761734592";

export type ConceptId =
  | "familia-primeiro"
  | "meta-em-movimento"
  | "duas-visoes";

export type ConceptDefinition = {
  id: ConceptId;
  marker: string;
  label: string;
  summary: string;
};

type AppStoreCTAProps = {
  label?: string;
  supportingText?: string;
  variant?: "ink" | "yellow" | "light" | "outline";
  className?: string;
};

export function AppStoreCTA({
  label = "Baixar na App Store",
  supportingText = "Disponível para iPhone",
  variant = "ink",
  className,
}: AppStoreCTAProps) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={[styles.appStoreCta, className].filter(Boolean).join(" ")}
      data-variant={variant}
      aria-label={`${label} — abre a App Store em uma nova aba`}
    >
      <AppleMark />
      <span className={styles.appStoreCopy}>
        <span>{supportingText}</span>
        <strong>{label}</strong>
      </span>
      <span className={styles.ctaArrow} aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

function AppleMark() {
  return (
    <svg
      className={styles.appleMark}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

type PhoneFrameProps = {
  screenshot: string;
  alt: string;
  priority?: boolean;
  className?: string;
  children?: ReactNode;
};

export function PhoneFrame({
  screenshot,
  alt,
  priority = false,
  className,
  children,
}: PhoneFrameProps) {
  const baseName = screenshot
    .replace("/screenshots/", "")
    .replace(/\.(png|webp)$/i, "");
  const webp2x = `/screenshots/${baseName}.webp`;
  const webp1x = `/screenshots/${baseName}-1x.webp`;
  const fallback = `/screenshots/${baseName}.png`;

  return (
    <figure
      className={[styles.phoneFrame, className].filter(Boolean).join(" ")}
    >
      <span className={styles.phoneSpeaker} aria-hidden="true" />
      <span className={styles.phoneSideTop} aria-hidden="true" />
      <span className={styles.phoneSideBottom} aria-hidden="true" />
      <div className={styles.phoneScreen}>
        <picture>
          <source
            type="image/webp"
            srcSet={`${webp1x} 400w, ${webp2x} 800w`}
            sizes="(max-width: 640px) 250px, 340px"
          />
          <img
            src={fallback}
            alt={alt}
            width={800}
            height={1734}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            draggable={false}
          />
        </picture>
      </div>
      {children}
    </figure>
  );
}
