# Project: tech_order

## Style

- 한 라인 맥시멈 길이는 120 이하.
- Typescript without strict.
- export 되는 함수/컴포넌트/타입에는 JSDoc 쓰기.
  - 첫 라인에 롤 설명.
  - 파라미터/리턴 값의 뜻이 이름만으로는 설명이 안 될 거 같다면 `@param`/`@returns` 활용하기, 타입은 시그니처에 이미 있으므로 반복하지 않음.
  - 이너 프라이빗 함수는 이름이 명확하면 JSDoc 스킵할 수 있다.