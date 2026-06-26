import { runMigrations } from "../migrate";

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

  it("미적용 마이그레이션을 실행하고 기록한다 (getFirstAsync → null)", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null); // 미적용

    await runMigrations(db as never);

    // _migrations 테이블 생성 + 마이그레이션 SQL(현재 0001_create_events 1건)
    expect(db.execAsync).toHaveBeenCalledTimes(2);
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0001_create_events"],
    );
  });

  it("이미 적용된 마이그레이션은 건너뛴다 (getFirstAsync → row)", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue({ id: 1 }); // 이미 적용됨

    await runMigrations(db as never);

    // _migrations 테이블 생성 1회만, 마이그레이션 SQL 실행 없음
    expect(db.execAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("execAsync에 events 테이블 생성 SQL이 포함된다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null);

    await runMigrations(db as never);

    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS events"),
    );
  });
});
