# 아키텍처

## 디렉터리 구조

```
src/
├── types/index.ts          ← 모든 타입 정의 (AppObject, Schedule, ObjectClosureReview, Completion, Interval, ScheduleMode)
├── lib/
│   ├── supabase.ts         ← Supabase 클라이언트 (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
│   ├── dateUtils.ts        ← 날짜 유틸 (isScheduleDueOn, buildFlexibleScheduleSegments, getDaysInMonth 등)
│   └── completionMemo.ts   ← Completion.memo 인코딩 (체크 없이 메모만 남긴 경우 구분)
├── context/
│   ├── AuthContext.tsx      ← 인증 상태 (user, signInWithGoogle, signOut)
│   └── DataContext.tsx      ← 앱 데이터 상태 전부 (objects/schedules + 마침/휴지통 CRUD)
├── hooks/
│   └── useCompletions.ts   ← 해당 월의 completions 조회 + toggle
├── components/
│   ├── Auth/
│   │   └── LoginPage.tsx   ← Google 로그인 버튼
│   ├── Grid/               ← 스프레드시트 뷰
│   │   ├── Grid.tsx        ← 월 이동 툴바 + <table> 뼈대, 히스토리/휴지통 패널 토글
│   │   ├── ObjectRow.tsx   ← 오브젝트 행 (접기/펼치기)
│   │   ├── ScheduleRow.tsx ← 스케줄 행. schedule_mode가 'specific'이면 Cell, 'flexible'이면 FlexiblePeriodCell 렌더
│   │   ├── Cell.tsx        ← specific 모드의 개별 체크박스 셀
│   │   ├── FlexiblePeriodCell.tsx ← flexible 모드의 기간(pill) 셀. 완료/놓침/대기/진행중 상태 표시
│   │   └── CompletionModal.tsx   ← 셀 클릭 시 뜨는 완료 체크 + 메모 모달
│   ├── Modal/
│   │   ├── CreateObjectModal.tsx← 새 오브젝트 생성 모달 (제목 + 설명)
│   │   ├── ObjectModal.tsx     ← 오브젝트 편집 모달 (제목/설명/참고 + 스케줄 목록 + 마침/휴지통)
│   │   ├── ScheduleModal.tsx   ← 스케줄 편집 모달 (제목/설명 + 마침/복원/휴지통)
│   │   ├── ScheduleItem.tsx    ← DnD 가능한 스케줄 항목 (제목 인라인 편집)
│   │   ├── AddScheduleRow.tsx  ← 스케줄 추가 폼 (인터벌/모드/요일/날짜 선택)
│   │   └── ReferenceSection.tsx← URL 입력 또는 파일 업로드 (서명 URL 표시)
│   ├── History/
│   │   └── HistoryPanel.tsx    ← 마친(closed) 오브젝트와 회고 리뷰를 보고 다시 여는 패널
│   └── Trash/
│       └── TrashPanel.tsx      ← 휴지통의 오브젝트/스케줄을 복원하거나 완전 삭제하는 패널
└── App.tsx                 ← Provider 조합 + 최상위 라우팅
```

## 컨텍스트 (Context)

### AuthContext ([`src/context/AuthContext.tsx`](../src/context/AuthContext.tsx))

Google OAuth 상태를 앱 전체에 제공한다. `App.tsx`의 최상단에 위치.

```
AuthContext 제공값
├── user        ← Supabase User 객체 (null이면 미로그인)
├── session     ← Supabase Session
├── loading     ← 세션 복원 중 여부
├── signInWithGoogle()
└── signOut()
```

### DataContext ([`src/context/DataContext.tsx`](../src/context/DataContext.tsx))

오브젝트와 스케줄의 서버 상태 + 로컬 캐시. `DataProvider`는 `AuthContext` 안쪽, 그리드 위에 위치.
오브젝트/스케줄 각각 **활성(active) / 마침(closed) / 휴지통(trashed)** 3가지 상태를 가지며, 상태 전이는 전부 이 컨텍스트를 통한다.

```
DataContext 제공값
├── objects[] / closedObjects[] / trashedObjects[]       ← AppObject 목록, 상태별로 분리 제공
├── schedules[] / closedSchedules[] / trashedSchedules[] ← Schedule 목록, 상태별로 분리 제공
├── objectClosureReviews[]  ← 오브젝트를 마칠 때 남긴 회고 (object_closure_reviews 테이블)
├── loading
├── addObject(title, description?)
├── updateObject(id, patch)
├── deleteObject(id)        ← trashObject(id)의 별칭. 하드 삭제 아님
├── trashObject(id)         ← 오브젝트 + 딸린 스케줄 전부를 휴지통으로 (trashed_at 세팅)
├── restoreClosedObject(id) / restoreTrashedObject(id)
├── purgeTrashedObject(id)  ← 휴지통에서 완전 삭제 (completions/schedules/review까지 cascade)
├── closeObject(id, review) ← 회고를 저장하고 closed_at 세팅 → 히스토리로 이동
├── addSchedule(obj_id, title, intvl, start_date, schedule_mode?, parent_id?, weekdays?, monthdays?, end_date?, description?)
├── updateSchedule(id, patch)  ← intvl 변경 시 completions 자동 삭제
├── deleteSchedule(id)      ← trashSchedule(id)의 별칭
├── trashSchedule(id) / restoreTrashedSchedule(id) / purgeTrashedSchedule(id) ← 서브 스케줄까지 트리 전체에 적용
├── restoreClosedSchedule(id) / closeSchedule(id)
└── reorderSchedules(ordered[]) ← DnD 후 sort_order 일괄 업데이트
```

**휴지통 자동 정리:** `fetchAll` 호출 시(로그인 직후, 그리고 모든 CRUD 이후) `trashed_at`이 30일
(`TRASH_RETENTION_MS`)보다 오래된 항목을 자동으로 영구 삭제한다. 별도의 배치/크론 없이 클라이언트 fetch 시점에 처리된다.

## 인증 흐름

```
App.tsx
└── AuthProvider (세션 복원 + OAuth 리스너)
    └── AppInner
        ├── user 없음 → LoginPage (Google 로그인)
        └── user 있음 → DataProvider → Grid + ObjectModal
```

Supabase RLS(Row Level Security)가 모든 테이블에 적용되어 있어,
`user_id = auth.uid()`인 행만 접근 가능.
