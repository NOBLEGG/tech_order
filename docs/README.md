# Docs

내가 이 프로젝트를 오랜만에 보았을 때, 콘셉트를 빠르게 받아들일 수 있게 정리.
(프로젝트 철학은 루트 [README.md](../README.md) 참고.)

## 개발의 AI 활용 레벨

- 4~6. 케이스에 따라 AI와 함께 개발. 모든 코드의 뜻을 알고 있어야 한다.
    - 4, 구현을 사람이 이끌지만, AI도 함께 구현.
    - 5, 구현을 AI가 이끌고, 사람은 그 모든 코드가 뭔지 받아들임.
    - 6, 구현을 AI가 이끌고, 사람은 거의 모든 코드가 뭔지 받아들임.
- React가 아직 눈에 익지 않음, 애써야 함.

## 속판

- [data-model.md](./data-model.md) — 데이터 모델 (AppObject, Schedule, Completion), 스케줄 hierarchy
- [architecture.md](./architecture.md) — 디렉터리 짜임, Context (Auth/Data), auth 흐름
- [schedule-logic.md](./schedule-logic.md) — `isScheduleDueOn` 코어 로직
- [features.md](./features.md) — 파일 참고 기능 (ReferenceSection)
- [setup.md](./setup.md) — 환경 변수, Supabase 세팅
