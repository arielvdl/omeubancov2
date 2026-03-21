import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Suporte",
  description:
    "Central de ajuda e suporte do app O Meu Banco - Controle de Mesada Infantil",
};

const faqs = [
  {
    question: "O que é O Meu Banco?",
    answer:
      "O Meu Banco é um aplicativo de controle de mesada infantil que ajuda pais a ensinarem educação financeira para seus filhos de forma lúdica e segura. É um simulador educacional, não um banco real.",
  },
  {
    question: "É um banco de verdade?",
    answer:
      "Não. O Meu Banco é um simulador educacional. Ele não movimenta dinheiro real, não realiza transações financeiras e não está vinculado a nenhuma conta bancária. É uma ferramenta para ensinar conceitos de mesada e economia para crianças.",
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Sim. Coletamos apenas o mínimo necessário: nome e email dos pais para autenticação, e primeiro nome das crianças para personalização. Não usamos analytics na área infantil, não exibimos publicidade e não compartilhamos dados com terceiros. Todos os dados são armazenados com criptografia em infraestrutura Google Cloud.",
  },
  {
    question: "Como deletar minha conta?",
    answer:
      "Você pode solicitar a exclusão da sua conta e de todos os dados associados (incluindo perfis dos filhos) entrando em contato pelo email suporte@omeubanco.xyz. Processaremos sua solicitação em até 30 dias úteis.",
  },
];

export default function SuportePage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Central de Suporte
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Encontre respostas para as dúvidas mais comuns ou entre em contato
            conosco
          </p>
        </header>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-brand-dark">
            Perguntas Frequentes
          </h2>
          <div className="mt-8 space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-gray-100 bg-brand-beige p-6"
              >
                <h3 className="text-base font-bold text-brand-dark">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-brand-dark">
            Entre em Contato
          </h2>
          <p className="mt-2 text-gray-600">
            Não encontrou o que procurava? Envie-nos uma mensagem.
          </p>

          <div className="mt-8 rounded-3xl border border-gray-100 bg-brand-beige p-8">
            <ContactForm />
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Ou envie um email diretamente para
            </p>
            <a
              href="mailto:suporte@omeubanco.xyz"
              className="mt-1 inline-block text-lg font-semibold text-brand-dark underline underline-offset-2"
            >
              suporte@omeubanco.xyz
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
