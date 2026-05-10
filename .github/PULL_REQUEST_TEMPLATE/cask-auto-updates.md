# Cask `auto_updates: false → true` 전환 PR

이 PR은 `homebrew-tap/Casks/md-dolphin.rb`의 `auto_updates` 값을 `false`에서 `true`로 전환합니다.
**Phase 2 노타라이즈 완료 후에만 사용하세요.** (`docs/release/phase2-checklist.md` 7단계 참조)

---

## 체크리스트

- [ ] **노타라이즈 완료** — `spctl --assess --type exec -v md_dolphin.app` 통과 + `codesign -dv` Developer ID 서명 확인
- [ ] **electron-updater 통합** — 자동 업데이트 IPC 구현 완료 + `pnpm test` 그린
- [ ] **새 DMG 검증** — 해당 버전 DMG 다운로드 → 더블클릭 실행 → 정상 동작 확인 (우클릭 없이)
- [ ] **livecheck 동작** — `brew livecheck --cask md-dolphin` 결과가 최신 GitHub Release 버전과 일치
- [ ] **Homebrew 가이드라인 정합** — `brew style Casks/md-dolphin.rb` 통과 + `auto_updates true` 시 `livecheck` 블록 병존 정합 확인

---

## 변경 요약

<!-- 변경한 Cask 필드와 해당 릴리스 버전을 간략히 기술하세요 -->

- `auto_updates false` → `auto_updates true`
- `version`: x.x.x → x.x.x
- `sha256`: (새 DMG SHA256)
