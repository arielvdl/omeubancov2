-- Fase 1 de revogacao de sessao: versao de sessao por familia.
-- ADITIVA e retrocompativel: a revisao anterior do servico ignora a coluna.
-- Em PG16, ADD COLUMN com DEFAULT constante e metadata-only (sem reescrever a tabela).
-- Rollback: nada e dropado; a coluna pode ficar (sem uso) ou ser removida depois com
-- ALTER TABLE "families" DROP COLUMN IF EXISTS "session_version";
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL;
