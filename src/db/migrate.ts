import { type SQLiteDatabase } from "expo-sqlite";

export interface Migration {
  name: string;
  sql: string;
}

// 테이블 생성 SQL을 순서대로 추가한다. 이름은 '0001_create_xxx' 형식.
const MIGRATIONS: Migration[] = [
  {
    name: "0001_create_events",
    sql: `
      CREATE TABLE IF NOT EXISTS events (
        id          TEXT    NOT NULL PRIMARY KEY,
        title       TEXT    NOT NULL,
        note        TEXT,
        is_all_day  INTEGER NOT NULL DEFAULT 0,
        starts_at   INTEGER NOT NULL,
        ends_at     INTEGER NOT NULL,
        category_id TEXT,
        source      TEXT    NOT NULL DEFAULT 'local',
        external_id TEXT,
        updated_at  INTEGER NOT NULL
      )
    `,
  },
  {
    name: "0002_add_recurrence",
    sql: `
      ALTER TABLE events ADD COLUMN rrule TEXT;
      ALTER TABLE events ADD COLUMN recurring_event_id TEXT;
      ALTER TABLE events ADD COLUMN exception_date INTEGER;
      ALTER TABLE events ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    name: "0003_add_reminder",
    sql: `ALTER TABLE events ADD COLUMN reminder_minutes INTEGER;`,
  },
  {
    name: "0004_create_categories",
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id          TEXT    NOT NULL PRIMARY KEY,
        name        TEXT    NOT NULL,
        color       TEXT    NOT NULL DEFAULT '#2E5AAC',
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
    `,
  },
];

// 앱 시작 시 한 번 호출한다 (예: App.tsx useEffect).
// 적용 완료된 마이그레이션은 재실행하지 않는다.
export async function runMigrations(rawDb: SQLiteDatabase): Promise<void> {
  await rawDb.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      applied_at  INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  for (const migration of MIGRATIONS) {
    const row = await rawDb.getFirstAsync<{ id: number }>(
      "SELECT id FROM _migrations WHERE name = ?",
      [migration.name],
    );
    if (!row) {
      await rawDb.execAsync(migration.sql);
      await rawDb.runAsync("INSERT INTO _migrations (name) VALUES (?)", [
        migration.name,
      ]);
    }
  }
}
