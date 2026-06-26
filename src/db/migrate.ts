import { type SQLiteDatabase } from "expo-sqlite";

export interface Migration {
  name: string;
  sql: string;
}

// Phase 1+ 에서 테이블 생성 SQL을 순서대로 추가한다.
// 이름은 '0001_create_events' 형식으로 일관되게 유지한다.
const MIGRATIONS: Migration[] = [];

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
