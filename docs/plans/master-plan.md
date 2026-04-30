# md_dolphin 마스터 플랜 (이전됨)

> **이 파일은 더 이상 본문을 포함하지 않습니다.**
>
> 마스터 플랜은 2026-04-30 부로 **8개 파일로 분할**되었습니다.
> 새 인덱스: **[`docs/plans/README.md`](./README.md)**

---

## 어디로 갔나

| 이전 절                                                                                     | 새 위치                                        |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 0, 0.1, 0.2, 0.3, 0.4 (확정 사항·변경 이력·진입 게이트·트레이드오프)                        | [`05-changelog.md`](./05-changelog.md)         |
| 1, 2, 3 (비전·페르소나·범위)                                                                | [`00-vision.md`](./00-vision.md)               |
| 4 (기술 결정 — Electron, markdown-it, CSP, Zustand, 데이터 모델, 빌드 도구, 성능 벤치 표준) | [`01-decisions.md`](./01-decisions.md)         |
| 5 (디자인 토큰 — 타이포그래피, 색상, 코드 블록, 표·이미지·링크)                             | [`02-design-tokens.md`](./02-design-tokens.md) |
| 6 (사이클 분할·운영 규칙·의무 기재 항목)                                                    | [`03-cycles.md`](./03-cycles.md)               |
| 7, 8, 9 (미지·외부 의존·운영 계획)                                                          | [`04-deps-impact.md`](./04-deps-impact.md)     |
| 10, 11, 12 (자체 검증·가정·다음 액션)                                                       | [`06-validation.md`](./06-validation.md)       |

## sub-agent 안내

- **spec-writer**: `03-cycles.md` + `05-changelog.md`만 read하면 충분. cross-reference 코드 인용 시 README의 매핑 표 참조.
- **architect / doc-writer**: README의 sub-agent 가이드 참조.

## 원본 보존

분할 전 단일 파일(1140줄)은 git 히스토리에 보존됨:

```bash
git show a830809:docs/plans/master-plan.md
```
