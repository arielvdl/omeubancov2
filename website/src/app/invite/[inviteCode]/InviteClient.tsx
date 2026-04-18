"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const APP_STORE_URL =
  "https://apps.apple.com/br/app/o-meu-banco-mesada-infantil/id6761734592";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.omeubanco.app";

function extractInviteCodeFromPath(): string {
  if (typeof window === "undefined") return "";
  const match = window.location.pathname.match(/\/invite\/([^/?#]+)/i);
  if (!match) return "";
  return match[1].toUpperCase();
}

export default function InviteClient() {
  const [inviteCode, setInviteCode] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(
    null
  );
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setInviteCode(extractInviteCodeFromPath());
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "desktop");
  }, []);

  useEffect(() => {
    if (!platform || platform === "desktop" || !inviteCode) return;
    if (inviteCode === "PLACEHOLDER") return;

    setRedirecting(true);
    const schemeUrl = `omeubanco://invite/${inviteCode}`;
    const storeUrl = platform === "ios" ? APP_STORE_URL : PLAY_STORE_URL;

    const openedAt = Date.now();
    const timeout = setTimeout(() => {
      if (Date.now() - openedAt < 2500 && !document.hidden) {
        window.location.href = storeUrl;
      }
    }, 1500);

    const onVisibility = () => {
      if (document.hidden) clearTimeout(timeout);
    };
    document.addEventListener("visibilitychange", onVisibility);

    window.location.href = schemeUrl;

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [platform, inviteCode]);

  const openApp = () => {
    if (!inviteCode) return;
    window.location.href = `omeubanco://invite/${inviteCode}`;
  };

  const showCode = inviteCode && inviteCode !== "PLACEHOLDER";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-12 text-center">
      <div className="w-24 h-24 rounded-3xl bg-[#FFD600] flex items-center justify-center mb-6 shadow-lg">
        <Image
          src="/icon.png"
          alt="O Meu Banco"
          width={72}
          height={72}
          className="rounded-2xl"
        />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
        Convite para a família
      </h1>

      <p className="text-gray-600 mb-2 max-w-md">
        Você foi convidado para fazer parte de uma família no O Meu Banco.
      </p>

      {showCode && (
        <div className="mt-4 mb-6 bg-gray-100 px-5 py-3 rounded-2xl">
          <span className="text-sm text-gray-500 block mb-1">Código</span>
          <span className="text-xl font-mono font-bold text-gray-900 tracking-widest">
            {inviteCode}
          </span>
        </div>
      )}

      {platform === "ios" && (
        <div className="flex flex-col gap-3 w-full max-w-sm mt-2">
          <button
            onClick={openApp}
            className="bg-[#FFD600] text-gray-900 font-semibold py-4 px-6 rounded-2xl hover:bg-[#FFE033] transition"
          >
            {redirecting ? "Abrindo o app..." : "Abrir no app"}
          </button>
          <a
            href={APP_STORE_URL}
            className="bg-gray-900 text-white font-semibold py-4 px-6 rounded-2xl hover:bg-gray-800 transition"
          >
            Instalar na App Store
          </a>
        </div>
      )}

      {platform === "android" && (
        <div className="flex flex-col gap-3 w-full max-w-sm mt-2">
          <button
            onClick={openApp}
            className="bg-[#FFD600] text-gray-900 font-semibold py-4 px-6 rounded-2xl hover:bg-[#FFE033] transition"
          >
            {redirecting ? "Abrindo o app..." : "Abrir no app"}
          </button>
          <a
            href={PLAY_STORE_URL}
            className="bg-gray-900 text-white font-semibold py-4 px-6 rounded-2xl hover:bg-gray-800 transition"
          >
            Instalar no Google Play
          </a>
        </div>
      )}

      {platform === "desktop" && (
        <div className="flex flex-col gap-3 w-full max-w-sm mt-4">
          <p className="text-sm text-gray-500 mb-2">
            Abra este link no seu celular ou baixe o app:
          </p>
          <a
            href={APP_STORE_URL}
            className="bg-gray-900 text-white font-semibold py-4 px-6 rounded-2xl hover:bg-gray-800 transition"
          >
            App Store (iOS)
          </a>
          <a
            href={PLAY_STORE_URL}
            className="bg-gray-900 text-white font-semibold py-4 px-6 rounded-2xl hover:bg-gray-800 transition"
          >
            Google Play (Android)
          </a>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-8 max-w-md">
        Se o app estiver instalado, ele abrirá automaticamente. Caso contrário,
        instale pelo botão acima. O convite expira em 48 horas.
      </p>
    </div>
  );
}
