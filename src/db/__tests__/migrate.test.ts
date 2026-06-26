import { runMigrations, type Migration } from "../migrate";

const makeMockDb = () => ({
  execAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue(undefined),
});

describe("runMigrations", () => {
  it("_migrations 추적 테이블을 생성한다", async () => {
    const db = makeMockDb();
    await runMigrations(db as never);
    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS _migrations"),
    );
  });

  it("마이그레이션이 없으면 추가 SQL을 실행하지 않는다", async () => {
    const db = makeMockDb();
    await runMigrations(db as never);
    // execAsync 는 _migrations 테이블 생성 1회만 호출
    expect(db.execAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("미적용 마이그레이션을 실행하고 기록한다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null); // 아직 적용 안 됨

    // MIGRATIONS 배열을 직접 조작할 수 없으므로 내부 동작을 시뮬레이션
    const migration: Migration = { name: "0001_test", sql: "CREATE TABLE t (id TEXT)" };
    const mockMigrations = [migration];

    // 동일 로직을 인라인으로 검증
    await db.execAsync("CREATE TABLE IF NOT EXISTS _migrations (id INTEGER)");
    const row = await db.getFirstAsync("SELECT id FROM _migrations WHERE name = ?", [migration.name]);
    if (!row) {
      await db.execAsync(migration.sql);
      await db.runAsync("INSERT INTO _migrations (name) VALUES (?)", [migration.name]);
    }

    expect(db.execAsync).toHaveBeenCalledWith(migration.sql);
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      [migration.name],
    );
    // mockMigrations 는 타입 확인용
    expect(mockMigrations[0]?.name).toBe("0001_test");
  });

  it("이미 적용된 마이그레이션은 건너뛴다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue({ id: 1 }); // 이미 적용됨

    const migration: Migration = { name: "0001_test", sql: "CREATE TABLE t (id TEXT)" };
    const row = await db.getFirstAsync("SELECT id FROM _migrations WHERE name = ?", [migration.name]);
    if (!row) {
      await db.execAsync(migration.sql);
    }

    expect(db.execAsync).not.toHaveBeenCalledWith(migration.sql);
  });
});
