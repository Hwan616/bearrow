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
    db.getFirstAsync.mockResolvedValue(null); // 전부 미적용

    await runMigrations(db as never);

    // _migrations 테이블 생성 1회 + MIGRATIONS 배열 항목 수(현재 8건)만큼 SQL 실행
    expect(db.execAsync).toHaveBeenCalledTimes(9); // 1(tracker) + 8(migrations)
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0001_create_events"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0002_add_recurrence"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0003_add_reminder"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0004_create_categories"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0005_create_todos"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0006_add_event_id_to_todos"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0007_create_sync_tables"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _migrations (name) VALUES (?)",
      ["0008_add_assigned_date_to_todos"],
    );
  });

  it("이미 적용된 마이그레이션은 건너뛴다 (getFirstAsync → row)", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue({ id: 1 }); // 전부 적용됨

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

  it("execAsync에 반복 일정 컬럼 추가 SQL이 포함된다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null);

    await runMigrations(db as never);

    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE events ADD COLUMN rrule"),
    );
  });

  it("execAsync에 알림 컬럼 추가 SQL이 포함된다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null);

    await runMigrations(db as never);

    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE events ADD COLUMN reminder_minutes"),
    );
  });

  it("execAsync에 categories 테이블 생성 SQL이 포함된다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null);

    await runMigrations(db as never);

    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS categories"),
    );
  });

  it("execAsync에 todos 테이블 생성 SQL이 포함된다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null);

    await runMigrations(db as never);

    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS todos"),
    );
  });

  it("execAsync에 todos.event_id 컬럼 추가 SQL이 포함된다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null);

    await runMigrations(db as never);

    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE todos ADD COLUMN event_id"),
    );
  });

  it("execAsync에 todos.assigned_date 컬럼 추가 SQL이 포함된다", async () => {
    const db = makeMockDb();
    db.getFirstAsync.mockResolvedValue(null);

    await runMigrations(db as never);

    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE todos ADD COLUMN assigned_date"),
    );
  });
});
