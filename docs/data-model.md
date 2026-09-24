# 데이터 모델

타입 정의: [`src/types/index.ts`](../src/types/index.ts)

```
users (Supabase Auth)
  └─ objects          ← 오브젝트 (노트북, 헬스, ...)
       └─ schedules   ← 스케줄 (노트북 닦기, 헬스장 가기, ...)
            └─ completions  ← 체크 완료 히스토리
```

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
parent_id   — null 값이면 슈퍼스케줄, 값이 있으면 서브스케줄
intvl       — 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
end_date    — null 값 가질 수 있음
weekdays    — Weekly 인터벌일 때 [0=일, 1=월, ..., 6=토]
monthdays   — 매달/분기/반기/매해일 때 날짜 [1..31], null 값이면 start_date 참고
```

## Completion

"그 날 그 스케줄을 완료했다"는 히스토리.

```
id, schedule_id, due_date (YYYY-MM-DD), user_id
```
