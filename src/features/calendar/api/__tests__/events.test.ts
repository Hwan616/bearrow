import {
  createEvent,
  createExceptionEvent,
  deleteAllRecurring,
  deleteEvent,
  deleteExceptionInstance,
  deleteThisAndFollowing,
  editAllRecurring,
  getEventById,
  getEventsByDateRange,
  splitAndEditThisAndFollowing,
  updateEvent,
} from "../events";

// ── mock ────────────────────────────────────────────────────────────────────
// jest.mock 팩토리 내에서 참조하는 변수는 반드시 'mock' 접두사가 있어야 한다.

const mockReturning = jest.fn();
const mockValues = jest.fn();
const mockFrom = jest.fn();
const mockSet = jest.fn();
const mockWhereForSelect = jest.fn();
const mockWhereForUpdate = jest.fn();
const mockWhereForDelete = jest.fn();

jest.mock("@/db/client", () => ({
  db: {
    insert: jest.fn(() => ({ values: mockValues })),
    select: jest.fn(() => ({ from: mockFrom })),
    update: jest.fn(() => ({ set: mockSet })),
    delete: jest.fn(() => ({ where: mockWhereForDelete })),
  },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((col, val) => ({ op: "eq", col, val })),
  and: jest.fn((...args) => ({ op: "and", args })),
  gte: jest.fn((col, val) => ({ op: "gte", col, val })),
  lte: jest.fn((col, val) => ({ op: "lte", col, val })),
  isNull: jest.fn((col) => ({ op: "isNull", col })),
  isNotNull: jest.fn((col) => ({ op: "isNotNull", col })),
  inArray: jest.fn((col, vals) => ({ op: "inArray", col, vals })),
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "generated-uuid"),
}));

// ── fixtures ─────────────────────────────────────────────────────────────────

const mockEvent = {
  id: "evt-1",
  title: "팀 미팅",
  note: null,
  isAllDay: false,
  startsAt: new Date("2026-06-26T10:00:00Z"),
  endsAt: new Date("2026-06-26T11:00:00Z"),
  categoryId: null,
  source: "local" as const,
  externalId: null,
  updatedAt: new Date("2026-06-26T00:00:00Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockValues.mockReturnValue({ returning: mockReturning });
  mockFrom.mockReturnValue({ where: mockWhereForSelect });
  mockSet.mockReturnValue({ where: mockWhereForUpdate });
  mockWhereForUpdate.mockReturnValue({ returning: mockReturning });
  mockWhereForDelete.mockResolvedValue(undefined);
});

// ── createEvent ───────────────────────────────────────────────────────────────

describe("createEvent", () => {
  it("이벤트를 삽입하고 반환한다", async () => {
    mockReturning.mockResolvedValue([mockEvent]);
    const result = await createEvent(mockEvent);
    expect(mockValues).toHaveBeenCalledWith(mockEvent);
    expect(result).toEqual(mockEvent);
  });

  it("insert가 빈 배열을 반환하면 에러를 던진다", async () => {
    mockReturning.mockResolvedValue([]);
    await expect(createEvent(mockEvent)).rejects.toThrow("createEvent");
  });
});

// ── getEventById ──────────────────────────────────────────────────────────────

describe("getEventById", () => {
  it("존재하는 id로 이벤트를 반환한다", async () => {
    mockWhereForSelect.mockResolvedValue([mockEvent]);
    const result = await getEventById("evt-1");
    expect(result).toEqual(mockEvent);
  });

  it("존재하지 않는 id면 null을 반환한다", async () => {
    mockWhereForSelect.mockResolvedValue([]);
    const result = await getEventById("no-such");
    expect(result).toBeNull();
  });
});

// ── getEventsByDateRange ──────────────────────────────────────────────────────
// getEventsByDateRange는 3단계 쿼리 (비반복 → 마스터 → 예외) 를 실행한다.
// mockReturnValueOnce로 호출 순서별 반환값을 설정한다.

describe("getEventsByDateRange", () => {
  const rangeFrom = new Date("2026-06-01T00:00:00Z");
  const rangeTo = new Date("2026-06-30T23:59:59Z");

  function setupQueries(regularEvents: unknown[], masterEvents: unknown[] = []) {
    const regularWhere = jest.fn().mockResolvedValue(regularEvents);
    const masterWhere = jest.fn().mockResolvedValue(masterEvents);
    mockFrom
      .mockReturnValueOnce({ where: regularWhere })
      .mockReturnValueOnce({ where: masterWhere });
  }

  it("비반복 이벤트 목록을 반환한다", async () => {
    setupQueries([mockEvent]);
    const result = await getEventsByDateRange(rangeFrom, rangeTo);
    expect(result).toEqual([mockEvent]);
  });

  it("범위 내 이벤트가 없으면 빈 배열을 반환한다", async () => {
    setupQueries([]);
    const result = await getEventsByDateRange(rangeFrom, rangeTo);
    expect(result).toEqual([]);
  });

  it("비반복 이벤트 쿼리에 overlap + isNull 조건을 사용한다", async () => {
    const { lte, gte, isNull } = jest.requireMock("drizzle-orm") as {
      lte: jest.Mock;
      gte: jest.Mock;
      isNull: jest.Mock;
    };
    setupQueries([]);

    await getEventsByDateRange(rangeFrom, rangeTo);

    expect(lte).toHaveBeenCalledWith(expect.anything(), rangeTo);
    expect(gte).toHaveBeenCalledWith(expect.anything(), rangeFrom);
    expect(isNull).toHaveBeenCalled();
  });
});

// ── updateEvent ───────────────────────────────────────────────────────────────

describe("updateEvent", () => {
  it("업데이트된 이벤트를 반환한다", async () => {
    const updated = { ...mockEvent, title: "수정된 미팅" };
    mockReturning.mockResolvedValue([updated]);
    const result = await updateEvent("evt-1", { title: "수정된 미팅" });
    expect(mockSet).toHaveBeenCalledWith({ title: "수정된 미팅" });
    expect(result).toEqual(updated);
  });

  it("존재하지 않는 id면 null을 반환한다", async () => {
    mockReturning.mockResolvedValue([]);
    const result = await updateEvent("no-such", { title: "X" });
    expect(result).toBeNull();
  });
});

// ── deleteEvent ───────────────────────────────────────────────────────────────

describe("deleteEvent", () => {
  it("에러 없이 삭제를 완료한다", async () => {
    await expect(deleteEvent("evt-1")).resolves.toBeUndefined();
    expect(mockWhereForDelete).toHaveBeenCalled();
  });
});

// ── 반복 일정 CRUD ─────────────────────────────────────────────────────────

describe("createExceptionEvent", () => {
  it("예외 이벤트를 삽입한다 (recurringEventId·exceptionDate 설정)", async () => {
    const instanceDate = new Date("2026-06-15T00:00:00Z");
    await createExceptionEvent("master-1", instanceDate, mockEvent as never);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        recurringEventId: "master-1",
        exceptionDate: instanceDate,
        rrule: null,
        isDeleted: false,
      }),
    );
  });
});

describe("deleteExceptionInstance", () => {
  it("삭제 예외 이벤트를 삽입한다 (isDeleted=true)", async () => {
    const instanceDate = new Date("2026-06-15T00:00:00Z");
    await deleteExceptionInstance("master-1", instanceDate);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        recurringEventId: "master-1",
        exceptionDate: instanceDate,
        isDeleted: true,
      }),
    );
  });
});

describe("editAllRecurring", () => {
  it("마스터를 업데이트하고 기존 예외를 삭제한다", async () => {
    await editAllRecurring("master-1", { title: "수정" });
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ title: "수정" }));
    expect(mockWhereForDelete).toHaveBeenCalled();
  });
});

describe("splitAndEditThisAndFollowing", () => {
  it("마스터에 UNTIL 설정 후 새 마스터를 생성한다", async () => {
    mockWhereForSelect.mockResolvedValue([{ ...mockEvent, rrule: "FREQ=DAILY" }]);
    const instanceDate = new Date("2026-06-15T00:00:00Z");
    await splitAndEditThisAndFollowing("master-1", instanceDate, mockEvent as never);
    // 마스터 rrule에 UNTIL 추가
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ rrule: expect.stringContaining("UNTIL=") }),
    );
    // 새 마스터 삽입
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ recurringEventId: null, exceptionDate: null }),
    );
  });

  it("마스터가 없으면 에러를 던진다", async () => {
    mockWhereForSelect.mockResolvedValue([]);
    await expect(
      splitAndEditThisAndFollowing("no-such", new Date(), mockEvent as never),
    ).rejects.toThrow();
  });
});

describe("deleteThisAndFollowing", () => {
  it("마스터에 UNTIL을 설정한다", async () => {
    mockWhereForSelect.mockResolvedValue([{ ...mockEvent, rrule: "FREQ=DAILY" }]);
    await deleteThisAndFollowing("master-1", new Date("2026-06-15T00:00:00Z"));
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ rrule: expect.stringContaining("UNTIL=") }),
    );
  });

  it("마스터가 없으면 아무 작업도 하지 않는다", async () => {
    mockWhereForSelect.mockResolvedValue([]);
    await expect(
      deleteThisAndFollowing("no-such", new Date()),
    ).resolves.toBeUndefined();
  });
});

describe("deleteAllRecurring", () => {
  it("마스터와 예외를 모두 삭제한다 (delete 2회)", async () => {
    await deleteAllRecurring("master-1");
    expect(mockWhereForDelete).toHaveBeenCalledTimes(2);
  });
});
