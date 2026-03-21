"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand-dark">
          <img src="/icon.png" alt="O Meu Banco" width={36} height={36} className="rounded-lg" />
          O Meu Banco
        </Link>

        <button
          type="button"
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <li>
            <a href="#como-funciona" className="hover:text-brand-dark transition-colors">
              Como Funciona
            </a>
          </li>
          <li>
            <a href="#seguranca" className="hover:text-brand-dark transition-colors">
              Segurança
            </a>
          </li>
          <li>
            <Link href="/suporte" className="hover:text-brand-dark transition-colors">
              Suporte
            </Link>
          </li>
          <li>
            <a
              href="#download"
              className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-black hover:bg-brand-yellow-dark transition-colors"
            >
              Baixar App
            </a>
          </li>
        </ul>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 pb-4">
          <ul className="flex flex-col gap-4 pt-4 text-sm font-medium text-gray-600">
            <li>
              <a
                href="#como-funciona"
                className="block py-2 hover:text-brand-dark transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Como Funciona
              </a>
            </li>
            <li>
              <a
                href="#seguranca"
                className="block py-2 hover:text-brand-dark transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Segurança
              </a>
            </li>
            <li>
              <Link
                href="/suporte"
                className="block py-2 hover:text-brand-dark transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Suporte
              </Link>
            </li>
            <li>
              <a
                href="#download"
                className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-black hover:bg-brand-yellow-dark transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Baixar App
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
