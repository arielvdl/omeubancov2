"use client";

import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-bold text-brand-dark">
          Mensagem enviada!
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Obrigado pelo contato. Responderemos o mais breve possivel.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-semibold text-brand-dark underline underline-offset-2 hover:text-gray-600 transition-colors"
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-brand-dark"
        >
          Nome
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          autoComplete="name"
          className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark placeholder-gray-400 shadow-sm focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/30 focus:outline-none transition-colors"
          placeholder="Seu nome"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-brand-dark"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark placeholder-gray-400 shadow-sm focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/30 focus:outline-none transition-colors"
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-brand-dark"
        >
          Mensagem
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark placeholder-gray-400 shadow-sm resize-none focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/30 focus:outline-none transition-colors"
          placeholder="Como podemos ajudar?"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-brand-yellow px-6 py-3.5 text-sm font-semibold text-black shadow-sm hover:bg-brand-yellow-dark focus:ring-2 focus:ring-brand-yellow/50 focus:ring-offset-2 focus:outline-none transition-colors"
      >
        Enviar Mensagem
      </button>
    </form>
  );
}
