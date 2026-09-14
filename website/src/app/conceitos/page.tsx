import type { Metadata } from "next";
import FamilyFirstLanding from "@/components/landing-concepts/FamilyFirstLanding";
import GoalInMotionLanding from "@/components/landing-concepts/GoalInMotionLanding";
import LandingConceptComparator from "@/components/landing-concepts/LandingConceptComparator";
import TwoViewsLanding from "@/components/landing-concepts/TwoViewsLanding";

export const metadata: Metadata = {
  title: "Conceitos de landing page",
  description:
    "Comparador interno de direções visuais para a landing page de O Meu Banco.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function LandingConceptsPage() {
  return (
    <LandingConceptComparator
      conceptPanels={{
        "familia-primeiro": <FamilyFirstLanding />,
        "meta-em-movimento": <GoalInMotionLanding />,
        "duas-visoes": <TwoViewsLanding />,
      }}
    />
  );
}
