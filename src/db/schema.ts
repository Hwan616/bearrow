// Phase 1+ 에서 테이블 정의를 추가한다.
// 예: export { events }  from './tables/events'
//     export { todos }   from './tables/todos'
//     export { categories } from './tables/categories'

// 공통 컬럼 헬퍼 — 모든 테이블이 id·updated_at을 가지도록 강제
export { commonColumns } from "./helpers";
