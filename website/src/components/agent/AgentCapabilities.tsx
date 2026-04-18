"use client";

import { useEffect } from "react";

declare global {
  interface Navigator {
    modelContext?: {
      provideContext?: (context: unknown) => void | Promise<void>;
      registerTool?: (tool: unknown, options?: unknown) => void | Promise<void>;
    };
  }

  interface Window {
    __omeuBancoWebMcpRegistered?: boolean;
  }
}

const APP_STORE_URL =
  "https://apps.apple.com/app/o-meu-banco-mesada-infantil/id6761734592";
const SUPPORT_EMAIL = "mailto:suporte@omeubanco.xyz";

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function scrollToElement(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function navigateTo(path: string) {
  window.location.assign(path);
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

const tools: ToolDefinition[] = [
  {
    name: "scroll-to-download",
    description:
      "Scrolls to the O Meu Banco download section and returns the App Store URL.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    async execute() {
      scrollToElement("download");
      return {
        ok: true,
        destination: "#download",
        appStoreUrl: APP_STORE_URL,
      };
    },
  },
  {
    name: "open-information-page",
    description:
      "Navigates to a public information page such as support, privacy policy, terms, or API documentation.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        page: {
          type: "string",
          enum: ["support", "privacy", "terms", "api-docs"],
          description: "The public page to open.",
        },
      },
      required: ["page"],
    },
    async execute(input) {
      const page = typeof input.page === "string" ? input.page : "support";
      const destinations: Record<string, string> = {
        support: "/suporte",
        privacy: "/privacidade",
        terms: "/termos",
        "api-docs": "/docs/api",
      };
      const path = destinations[page] ?? "/suporte";
      navigateTo(path);
      return { ok: true, page, path };
    },
  },
  {
    name: "contact-support",
    description:
      "Opens the support email address for O Meu Banco and returns the support contact.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    async execute() {
      openExternal(SUPPORT_EMAIL);
      return {
        ok: true,
        email: "suporte@omeubanco.xyz",
      };
    },
  },
];

export default function AgentCapabilities() {
  useEffect(() => {
    if (typeof window === "undefined" || window.__omeuBancoWebMcpRegistered) {
      return;
    }

    const modelContext = navigator.modelContext;
    if (!modelContext) {
      return;
    }

    window.__omeuBancoWebMcpRegistered = true;

    if (typeof modelContext.registerTool === "function") {
      for (const tool of tools) {
        try {
          void modelContext.registerTool(tool);
        } catch {
          // Ignore duplicate or unsupported registrations.
        }
      }
      return;
    }

    if (typeof modelContext.provideContext === "function") {
      try {
        void modelContext.provideContext({
          tools: tools.map(({ name, description, inputSchema, execute }) => ({
            name,
            description,
            inputSchema,
            execute,
          })),
        });
      } catch {
        // Ignore unsupported legacy implementations.
      }
    }
  }, []);

  return null;
}
