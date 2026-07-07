import type { Event } from "../types";

// 시간 이벤트의 최소 표시 길이(분) — 겹침 판정도 이 값을 반영해 시각적 겹침과 일치시킴
const MIN_DURATION_MIN = 30;

export interface EventLayout {
  event: Event;
  /** 클러스터 내 컬럼 인덱스 (0 = 가장 왼쪽) */
  colIndex: number;
  /** 클러스터가 사용하는 총 컬럼 수 (= 동시 겹침 최대치) */
  colCount: number;
}

/**
 * 하루의 시간 이벤트들을 겹침에 따라 컬럼으로 배치한다.
 *
 * 규칙:
 *  - 먼저 시작한 일정이 왼쪽 컬럼부터 배정된다.
 *  - 끝난 컬럼은 재사용해 최대한 덜 쪼개지도록 한다(컬럼 수 = 클러스터 내 동시 겹침 최대치).
 *  - 서로 연결(전이적으로 겹침)된 이벤트들은 하나의 클러스터로 묶여 같은 컬럼 수를 공유한다.
 */
export function layoutTimedEvents(events: Event[]): EventLayout[] {
  const items = events
    .map((event) => {
      const startMin = event.startsAt.getHours() * 60 + event.startsAt.getMinutes();
      const endMinRaw = event.endsAt.getHours() * 60 + event.endsAt.getMinutes();
      const endMin = Math.max(endMinRaw, startMin + MIN_DURATION_MIN);
      return { event, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const result: EventLayout[] = [];
  let clusterStart = 0; // 현재 클러스터가 result에서 시작하는 인덱스
  let columnsEnd: number[] = []; // 컬럼별 마지막 이벤트 종료 시각(분)
  let clusterMaxEnd = -Infinity;

  const closeCluster = () => {
    const colCount = columnsEnd.length;
    for (let i = clusterStart; i < result.length; i++) {
      result[i]!.colCount = colCount;
    }
    columnsEnd = [];
    clusterStart = result.length;
    clusterMaxEnd = -Infinity;
  };

  for (const it of items) {
    // 클러스터의 모든 이벤트와 겹치지 않으면 새 클러스터 시작
    if (it.startMin >= clusterMaxEnd) closeCluster();

    // 끝난 컬럼 재사용, 없으면 새 컬럼 추가
    let col = columnsEnd.findIndex((end) => end <= it.startMin);
    if (col === -1) {
      col = columnsEnd.length;
      columnsEnd.push(it.endMin);
    } else {
      columnsEnd[col] = it.endMin;
    }

    result.push({ event: it.event, colIndex: col, colCount: 1 });
    clusterMaxEnd = Math.max(clusterMaxEnd, it.endMin);
  }
  closeCluster();

  return result;
}
