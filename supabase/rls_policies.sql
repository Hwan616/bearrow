-- BeArrow Supabase RLS 정책
-- Supabase Dashboard > SQL Editor 에서 실행한다.
-- 각 테이블은 auth.uid() 와 user_id 컬럼이 일치하는 행만 접근 가능하다 (NFR-SEC-002).

-- ── 테이블 생성 (미생성 시) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL DEFAULT auth.uid(),
  title            TEXT NOT NULL,
  note             TEXT,
  is_all_day       INTEGER NOT NULL DEFAULT 0,
  starts_at        BIGINT NOT NULL,
  ends_at          BIGINT NOT NULL,
  category_id      TEXT,
  source           TEXT NOT NULL DEFAULT 'local',
  external_id      TEXT,
  updated_at       BIGINT NOT NULL,
  rrule            TEXT,
  recurring_event_id TEXT,
  exception_date   BIGINT,
  is_deleted       INTEGER NOT NULL DEFAULT 0,
  reminder_minutes INTEGER
);

CREATE TABLE IF NOT EXISTS todos (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL DEFAULT auth.uid(),
  title        TEXT NOT NULL,
  note         TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at BIGINT,
  due_date     BIGINT,
  category_id  TEXT,
  event_id     TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL DEFAULT auth.uid(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ── RLS 활성화 ──────────────────────────────────────────────────────────────

ALTER TABLE events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ── 정책: 자신의 행만 접근 ──────────────────────────────────────────────────

CREATE POLICY "events_user_isolation" ON events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "todos_user_isolation" ON todos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "categories_user_isolation" ON categories
  FOR ALL USING (auth.uid() = user_id);

-- ── 인덱스: 동기화 쿼리 최적화 ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS events_user_updated     ON events     (user_id, updated_at);
CREATE INDEX IF NOT EXISTS todos_user_updated      ON todos      (user_id, updated_at);
CREATE INDEX IF NOT EXISTS categories_user_updated ON categories (user_id, updated_at);
