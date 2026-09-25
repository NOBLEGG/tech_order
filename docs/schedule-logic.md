# 핵심 로직: `isScheduleDueOn` / `buildFlexibleScheduleSegments`

[`src/lib/dateUtils.ts`](../src/lib/dateUtils.ts)

`Schedule.schedule_mode`에 따라 그리드 렌더링 방식이 갈린다.

- `specific` (기본) — 날짜 하나하나에 대해 `isScheduleDueOn`으로 체크박스 유무를 판단 (`Cell.tsx`)
- `flexible` — 인터벌 기간 전체를 하나의 "언제 완료해도 되는" 구간으로 보고 `buildFlexibleScheduleSegments`가
  기간 단위 세그먼트를 만든다 (`FlexiblePeriodCell.tsx`). **`daily` 인터벌에는 flexible이 적용되지 않는다** —
  하루짜리 기간은 의미가 없어서 항상 `specific`처럼 취급된다.

## `isScheduleDueOn`

"이 스케줄이 이 날 해당하는가?"를 판단하는 핵심 함수.

```
1. start_date(origin)가 없으면 → false
2. end_date 또는 closed_at이 있고 그 이후면 → false (더 이른 쪽이 hard end)
3. flexible 모드 + daily 아님: origin 이후이고, 그 날이 속한 인터벌 기간(주/월/분기/반기/해) 안이면 → true
4. daily: start_date 이후면 → true
5. weekly: start_date 이후 + weekdays에 해당 요일 포함
6. monthly/quarterly/semi_annual/annual (specific 모드):
   a. monthdays가 있으면 → 그 날이 속한 "타겟 월"이 인터벌 경계와 맞고 + monthdays에 해당 일
   b. monthdays가 없으면 → start_date로부터 advanceN한 n번째 날짜와 같은 날
```

## advanceN 패턴

말일 계산 오류 방지를 위해 커서를 누적하지 않고, 항상 origin에서 n배 전진.

```typescript
// 잘못된 방법 (체이닝 → 말일 drift 발생)
cursor = addMonths(cursor, 1)

// 올바른 방법 (항상 origin 기준)
candidate = addMonths(origin, n)
```

## `buildFlexibleScheduleSegments` (flexible 모드)

날짜별 셀 대신, 뷰에 보이는 날짜 목록(`dates`)을 스캔해서 "기간 단위 세그먼트" 배열을 만든다.
`Grid`가 이 세그먼트를 `colSpan`으로 병합된 `FlexiblePeriodCell` 하나로 렌더링한다.

```
1. dates를 순서대로 훑으며 isScheduleDueOn이 true인 연속 구간을, 같은 기간 키
   (getFlexiblePeriodKey = intvl + 기간 시작일)를 공유하는 만큼 하나의 세그먼트로 묶는다
2. 기간의 실제 시작/끝(periodStart/periodEnd)은 캘린더 상 기간 경계(getFlexiblePeriodBounds)를
   origin(start_date)과 hardEnd(end_date/closed_at 중 이른 쪽)로 클리핑한 값
   → 뷰에 보이는 구간(visibleStart/visibleEnd)과는 다를 수 있음 (달이 넘어가며 잘리는 경우)
3. 상태(status) 판정:
   - completed — 그 기간 안에 "진짜" completion이 있음 (메모만 있는 note-only는 제외, getRealCompletionInPeriod)
   - future    — 오늘이 periodStart 이전
   - missed    — 오늘이 periodEnd 이후
   - active    — 그 사이 (진행 중)
4. active일 때 urgencyLevel(1~7)을 기간 경과 비율로 계산 → FlexiblePeriodCell의 색상 그라데이션에 사용
5. showCountdown은 뷰에 보이는 첫 future 세그먼트에만 true → "시작까지 N일" 카운트다운 중복 표시 방지
6. openDate(클릭 시 completion을 기록할 날짜) = 기존 completion이 있으면 그 due_date,
   active면 오늘, 아니면(future/missed) 세그먼트의 마지막 visible 날짜
```

`getRealCompletionInPeriod`가 완료 여부를 판단할 때 `isNoteOnlyMemo`인 completion은 무시한다 —
체크 없이 메모만 남긴 기록으로는 flexible 기간이 "완료" 처리되지 않는다.

관련 데이터 모델은 [data-model.md](./data-model.md) 참고.
