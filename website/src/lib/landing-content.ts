export type LandingFaqItem = {
  question: string;
  answer: string;
};

export const landingFaqItems = [
  {
    question: "Qual o melhor app de mesada infantil?",
    answer:
      "Para famílias com iPhone que querem simular mesada sem movimentar dinheiro real, O Meu Banco reúne saldo virtual, metas, extrato e acompanhamento dos responsáveis em uma experiência simples e visual.",
  },
  {
    question: "Mesada educativa vale a pena?",
    answer:
      "Sim, quando vem com regras claras e conversa. A mesada educativa ajuda a praticar escolha, espera, planejamento e consequência dentro da rotina da família.",
  },
  {
    question: "Como ensinar uma criança a poupar?",
    answer:
      "Comece por um desejo concreto. Dê um nome à meta, defina o valor e acompanhe o progresso com a criança para mostrar como pequenas escolhas aproximam uma conquista.",
  },
  {
    question: "O Meu Banco movimenta dinheiro real?",
    answer:
      "Não. O Meu Banco é um simulador educacional: não realiza pagamentos, transferências ou movimentações em contas bancárias reais.",
  },
  {
    question: "Quem controla as regras do aplicativo?",
    answer:
      "Os responsáveis acompanham a experiência e fazem os ajustes na área dos pais. A criança visualiza o saldo, o histórico e suas metas dentro dos combinados definidos em família.",
  },
  {
    question: "Existem planos pagos?",
    answer:
      "Sim. O aplicativo oferece opções Gratuito, Família e Família+. Consulte os recursos, valores e condições atuais diretamente na App Store antes de assinar.",
  },
] as const satisfies readonly LandingFaqItem[];
