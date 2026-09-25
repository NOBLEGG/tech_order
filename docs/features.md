# 파일 참고 기능 (ReferenceSection)

```
ref_type = 'url'   → ref_url에 URL 직접 저장, 링크로 표시
ref_type = 'file'  → ref_url에 Storage 경로 저장, 렌더 시 서명 URL(3600s) 생성
```

Storage 버킷 이름: `ref` (private). 절대 public으로 바꾸면 안 됨.
서명 URL은 매번 렌더 시 생성하므로 만료 걱정 없음.
