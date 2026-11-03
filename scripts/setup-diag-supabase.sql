-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS: DIAGNÓSTICO DO CLIENTE (PAINEL OPS - ATENDIMENTO)
-- Execute este script no SQL Editor do Supabase (tanto em HML quanto em PRD)
-- ==============================================================================

-- 1. Tabela de Volumetria Agregada (consolidação mensal por canal e tabulação)
CREATE TABLE IF NOT EXISTS diag_volume (
    id BIGSERIAL PRIMARY KEY,
    env TEXT NOT NULL DEFAULT 'hml', -- 'hml' ou 'prd'
    mes_ref TEXT NOT NULL,           -- 'AAAA-MM' (ex: '2026-08')
    canal TEXT NOT NULL,             -- 'LIGACOES', 'CHAT', 'WHATSAPP', 'URA'
    orig_produto TEXT DEFAULT '',
    orig_motivo TEXT DEFAULT '',
    orig_submotivo TEXT DEFAULT '',
    norm_produto TEXT NOT NULL DEFAULT 'Não Especificado',
    norm_motivo TEXT NOT NULL DEFAULT 'Não Especificado',
    norm_submotivo TEXT NOT NULL DEFAULT '-',
    volume INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_diag_volume_item UNIQUE (env, mes_ref, canal, orig_produto, orig_motivo, orig_submotivo)
);

CREATE INDEX IF NOT EXISTS idx_diag_volume_query ON diag_volume(env, mes_ref, canal, norm_produto);

-- 2. Tabela de Tickets (alimentada pelo Tabelão para apuração de Efetividade / SLA 7 dias)
CREATE TABLE IF NOT EXISTS diag_tickets (
    ticket_id TEXT NOT NULL,
    env TEXT NOT NULL DEFAULT 'hml',
    mes_fechamento TEXT,             -- 'AAAA-MM' do fechamento (referência do SLA)
    mes_abertura TEXT NOT NULL,      -- 'AAAA-MM' da abertura
    data_abertura TIMESTAMPTZ NOT NULL,
    data_fechamento TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Aberto', -- 'Fechado', 'Aberto', etc.
    grupo TEXT NOT NULL DEFAULT 'Geral',   -- GRUPO_DO_TICKET (N1, N3 Crédito, etc.)
    fila TEXT DEFAULT '',
    canal TEXT DEFAULT 'Telefone',
    dias_corridos NUMERIC(6,2),
    dentro_prazo BOOLEAN NOT NULL DEFAULT FALSE,
    orig_motivo TEXT DEFAULT '',
    orig_submotivo TEXT DEFAULT '',
    norm_produto TEXT DEFAULT 'Não Especificado',
    norm_motivo TEXT DEFAULT 'Não Especificado',
    norm_submotivo TEXT DEFAULT '-',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (env, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_diag_tickets_efetividade ON diag_tickets(env, mes_fechamento, grupo, dentro_prazo);
CREATE INDEX IF NOT EXISTS idx_diag_tickets_abertos ON diag_tickets(env, status, data_abertura);

-- 3. Tabela de Regras De-Para (Persistente e editável via painel)
CREATE TABLE IF NOT EXISTS diag_depara (
    id BIGSERIAL PRIMARY KEY,
    env TEXT NOT NULL DEFAULT 'hml',
    tipo_origem TEXT NOT NULL,       -- 'IA' (para Chat, WhatsApp, URA) ou 'CENTRAL' (Tabelão)
    chave_origem TEXT NOT NULL,      -- Código da IA ou 'TIPO_CONTATO | MOTIVO | SUB_MOTIVO'
    dest_produto TEXT NOT NULL,      -- ASSUNTO / Produto normalizado
    dest_motivo TEXT NOT NULL,       -- Motivo normalizado
    dest_submotivo TEXT NOT NULL DEFAULT '-', -- Submotivo normalizado
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_diag_depara_regra UNIQUE (env, tipo_origem, chave_origem)
);

CREATE INDEX IF NOT EXISTS idx_diag_depara_lookup ON diag_depara(env, tipo_origem, chave_origem);

-- 4. Tabela de Histórico de Importações (Controle de cobertura de meses)
CREATE TABLE IF NOT EXISTS diag_importacoes (
    id BIGSERIAL PRIMARY KEY,
    env TEXT NOT NULL DEFAULT 'hml',
    mes_ref TEXT NOT NULL,           -- 'AAAA-MM'
    canal TEXT NOT NULL,             -- 'LIGACOES', 'CHAT', 'WHATSAPP', 'URA'
    nome_arquivo TEXT NOT NULL,
    total_linhas INTEGER NOT NULL DEFAULT 0,
    usuario_email TEXT,
    data_importacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_diag_importacao_mes_canal UNIQUE (env, mes_ref, canal)
);

-- 5. Tabela de Configurações do Diagnóstico (Metas e parâmetros globais)
CREATE TABLE IF NOT EXISTS diag_config (
    env TEXT PRIMARY KEY,
    meta_sla_pct NUMERIC(5,2) NOT NULL DEFAULT 96.10,
    prazo_dias_corridos INTEGER NOT NULL DEFAULT 7,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inicializar parâmetros padrão
INSERT INTO diag_config (env, meta_sla_pct, prazo_dias_corridos)
VALUES ('hml', 96.10, 7)
ON CONFLICT (env) DO NOTHING;

INSERT INTO diag_config (env, meta_sla_pct, prazo_dias_corridos)
VALUES ('prd', 96.10, 7)
ON CONFLICT (env) DO NOTHING;

-- Habilitar RLS e criar políticas de leitura e escrita
ALTER TABLE diag_volume ENABLE ROW LEVEL SECURITY;
ALTER TABLE diag_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE diag_depara ENABLE ROW LEVEL SECURITY;
ALTER TABLE diag_importacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE diag_config ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura: Permitida para qualquer usuário autenticado ou anon do painel
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Leitura diag_volume" ON diag_volume;
    CREATE POLICY "Leitura diag_volume" ON diag_volume FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Gravacao diag_volume" ON diag_volume;
    CREATE POLICY "Gravacao diag_volume" ON diag_volume FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Leitura diag_tickets" ON diag_tickets;
    CREATE POLICY "Leitura diag_tickets" ON diag_tickets FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Gravacao diag_tickets" ON diag_tickets;
    CREATE POLICY "Gravacao diag_tickets" ON diag_tickets FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Leitura diag_depara" ON diag_depara;
    CREATE POLICY "Leitura diag_depara" ON diag_depara FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Gravacao diag_depara" ON diag_depara;
    CREATE POLICY "Gravacao diag_depara" ON diag_depara FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Leitura diag_importacoes" ON diag_importacoes;
    CREATE POLICY "Leitura diag_importacoes" ON diag_importacoes FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Gravacao diag_importacoes" ON diag_importacoes;
    CREATE POLICY "Gravacao diag_importacoes" ON diag_importacoes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Leitura diag_config" ON diag_config;
    CREATE POLICY "Leitura diag_config" ON diag_config FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Gravacao diag_config" ON diag_config;
    CREATE POLICY "Gravacao diag_config" ON diag_config FOR ALL USING (true) WITH CHECK (true);
END $$;
