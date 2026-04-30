-- ============================================================
-- ASSISTANT CONVERSATIONS SCHEMA — TASK_017
-- Table: assistant_conversations (persistent chat history)
-- ============================================================

CREATE TABLE IF NOT EXISTS assistant_conversations (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL DEFAULT 'New Conversation',
  messages      JSONB NOT NULL DEFAULT '[]',
  -- [{ role: 'user'|'assistant', content: string, created_at: string, tool_calls?: any[] }]
  context       JSONB DEFAULT '{}',
  -- { contract_id?, contract_title?, opportunity_id? }
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ac_user_id   ON assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ac_updated   ON assistant_conversations(updated_at);

CREATE OR REPLACE FUNCTION update_ac_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ac_updated_at ON assistant_conversations;
CREATE TRIGGER trg_ac_updated_at
  BEFORE UPDATE ON assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION update_ac_updated_at();

ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own conversations"
  ON assistant_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
