import { familyRepo } from '../repositories/family.repo.js';

// Fase 1 de revogacao de sessao. Cada familia tem uma `session_version`
// (inteiro, default 0). Os tokens novos carregam o claim `sv` com a versao
// vigente na emissao. Incrementar a versao invalida todos os tokens emitidos
// antes. Tokens antigos SEM o claim valem como versao 0, entao continuam
// validos enquanto a familia estiver na versao 0.

export class SessionRevokedError extends Error {
  constructor() {
    super('Session revoked');
    this.name = 'SessionRevokedError';
  }
}

export class SessionStoreUnavailableError extends Error {
  constructor() {
    super('Session version store unavailable');
    this.name = 'SessionStoreUnavailableError';
  }
}

export interface SessionVersionStore {
  get(familyId: string): Promise<number | undefined>;
  bump(familyId: string): Promise<number | undefined>;
}

const defaultStore: SessionVersionStore = {
  get: (familyId) => familyRepo.getSessionVersion(familyId),
  bump: (familyId) => familyRepo.bumpSessionVersion(familyId),
};

let store: SessionVersionStore = defaultStore;

// Apenas para testes sem banco.
export function setSessionVersionStoreForTests(next: SessionVersionStore | null): void {
  store = next ?? defaultStore;
  cache.clear();
}

// Cache so da verificacao (rota autenticada), para nao somar uma consulta ao
// banco por requisicao. Atraso maximo de revogacao em OUTRA instancia = TTL.
// A emissao de token e o bump nunca usam o cache.
const CACHE_TTL_MS = 15_000;
const CACHE_MAX_ENTRIES = 5_000;
const cache = new Map<string, { version: number; expiresAt: number }>();

function remember(familyId: string, version: number): void {
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(familyId, { version, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Claim ausente = versao 0 (token emitido antes da Fase 1). Claim invalido = null. */
export function claimedSessionVersion(claim: unknown): number | null {
  if (claim === undefined) return 0;
  if (typeof claim === 'number' && Number.isSafeInteger(claim) && claim >= 0) return claim;
  return null;
}

export function isSessionVersionCurrent(claim: unknown, current: number): boolean {
  const claimed = claimedSessionVersion(claim);
  return claimed !== null && claimed === current;
}

/** Versao vigente lida direto do banco (para emitir token). undefined se a familia nao existe. */
export async function readSessionVersionFresh(familyId: string): Promise<number | undefined> {
  const version = await store.get(familyId);
  if (version !== undefined) remember(familyId, version);
  return version;
}

/** Valida o claim `sv` de um token ja verificado (assinatura e expiracao). */
export async function assertSessionCurrent(payload: {
  familyId: string;
  sv?: unknown;
}): Promise<void> {
  let current: number | undefined;
  const hit = cache.get(payload.familyId);
  if (hit && hit.expiresAt > Date.now()) {
    current = hit.version;
  } else {
    try {
      current = await readSessionVersionFresh(payload.familyId);
    } catch {
      throw new SessionStoreUnavailableError();
    }
  }
  if (current === undefined || !isSessionVersionCurrent(payload.sv, current)) {
    throw new SessionRevokedError();
  }
}

/** Revoga todos os tokens da familia emitidos ate agora. Devolve a nova versao. */
export async function bumpSessionVersion(familyId: string): Promise<number> {
  const next = await store.bump(familyId);
  if (next === undefined) throw new SessionRevokedError();
  remember(familyId, next);
  return next;
}
