# 데이터 모델

타입 정의: [`src/types/index.ts`](../src/types/index.ts)

```
users (Supabase Auth)
  └─ objects                      ← 오브젝트 (노트북, 헬스, ...)
       ├─ object_closure_reviews  ← 오브젝트를 마칠 때의 리뷰
       └─ schedules               ← 스케줄 (노트북 닦기, 헬스장 가기, ...)
            └─ completions        ← 체크 완료 히스토리
```

오브젝트와 스케줄은 세 가지 스테이트를 가질 수 있다.
1. **active**: `closed_at`, `trashed_at` 모두 null.
2. **closed**: `closed_at` 값이 있음. 히스토리에 남아 있는 것.
3. **trashed**: `trashed_at` 값이 있음, 30d 뒤 완전히 지워짐.

## AppObject

유저가 매니지먼트하고자 하는 것.

```
id, user_id, title
ref_url     — 참고 URL 또는 Storage 파일 패스
ref_type    — 'url' | 'file'
```

## Schedule

오브젝트에 딸린 반복 스케줄. 슈퍼스케줄과 서브스케줄로 이루어진 얼개 서포트.

```
id, obj_id, title
parent_id     — null 값이면 슈퍼스케줄, 값이 있으면 서브스케줄
intvl         — 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
schedule_mode — 'specific' | 'flexible'
end_date      — null 값 가질 수 있음 (YYYY-MM-DD)
weekdays      — Weekly 인터벌일 때 [0=일, 1=월, ..., 6=토]
monthdays     — 매달/분기/반기/매해일 때 날짜 [1..31], null 값이면 start_date 참고
```

`schedule_mode`가 `specific` 값이면 그리드에 날마다 체크박스(`Cell`)로,
`flexible` 값이면 인터벌 피리어드 안에 아무 때나 완료하면 되는 것.

## ObjectClosureReview

오브젝트를 마칠 때 리뷰.

```
id, object_id, user_id
review
created_at, updated_at
```

## Completion

"그 날 그 스케줄을 완료했다"는 히스토리.

```
id, schedule_id, due_date (YYYY-MM-DD), user_id, created_at
memo        — 완료 메모 (optional)
```

`memo`가 `__note_only__::` 접두사로 시작하면 "체크는 안 했지만 메모만 남긴" 스테이트임.