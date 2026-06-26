import { commonColumns } from "../helpers";
import * as schema from "../schema";

describe("schema 모듈", () => {
  it("정상적으로 임포트된다", () => {
    expect(schema).toBeDefined();
  });

  it("commonColumns 를 re-export 한다", () => {
    expect(schema.commonColumns).toBeDefined();
  });
});

describe("commonColumns", () => {
  it("id 컬럼이 존재한다", () => {
    expect(commonColumns.id).toBeDefined();
  });

  it("updatedAt 컬럼이 존재한다", () => {
    expect(commonColumns.updatedAt).toBeDefined();
  });
});
