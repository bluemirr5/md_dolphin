# md_dolphin

> 깔끔하고 집중력 있는 macOS 마크다운 뷰어.

[English README](README.md)

---

md_dolphin은 `.md` 파일을 클릭 한 번으로 바로 열어줍니다. 에디터처럼 무겁지 않고, 설정도 필요 없고, 클라우드도 없습니다. 콘텐츠만, 아름답게 렌더링됩니다.

**기능**

- GitHub Flavored Markdown 즉시 렌더링
- 읽기에 최적화된 미니멀 UI
- 파일 연결: `.md` 파일을 클릭하면 md_dolphin으로 바로 열림
- 라이트/다크 변형을 갖춘 내장 테마 5종, macOS 시스템 설정과 자동 동기화
- JSON 파일 하나로 커스텀 테마 제작 가능
- 완전 오프라인 — 계정 없음, 텔레메트리 없음
- 유니버설 바이너리 — Apple Silicon · Intel 모두 지원

---

## 테마

md_dolphin은 편안한 장시간 독서를 위해 설계된 내장 테마 5종을 제공합니다. 모든 테마는 라이트/다크 변형을 포함하며, macOS 시스템 설정에 따라 자동으로 전환됩니다.

| 테마 | 특징 |
|---|---|
| **Default** | 깔끔하고 모던한 — 따뜻한 뉴트럴 톤에 부드러운 대비 |
| **Solarized** | 클래식. 따뜻한 크림 라이트, 깊은 틸 다크 |
| **Nord** | 아틱 쿨 — 차분한 블루와 소프트 그레이 |
| **Ocean** | 시원한 블루에 시안 포인트 |
| **Autumn** | 풍부한 황토와 앰버 — 따뜻한 톤을 좋아하는 분들께 |

테마 전환은 메뉴 바에서: **View → Theme**

### 커스텀 테마

코드 없이 나만의 테마를 만들 수 있습니다.

1. `light`와 `dark` 색상 맵(21개 토큰)을 담은 JSON 파일을 작성합니다.
2. `~/Library/Application Support/md-dolphin/themes/`에 넣습니다.
3. **View → Theme → Refresh Themes**로 목록을 갱신합니다.

<details>
<summary>테마 JSON 스켈레톤</summary>

```json
{
  "name": "나만의 테마",
  "light": {
    "color.bg": "#FAFAFA",
    "color.text": "#1A1A1A"
  },
  "dark": {
    "color.bg": "#1A1A1A",
    "color.text": "#E0E0E0"
  },
  "shiki": { "light": "github-light", "dark": "github-dark" }
}
```

전체 토큰 목록: [`docs/themes.md`](docs/themes.md)
</details>

> **팁:** 원하는 색상 팔레트나 분위기를 AI에게 설명하고 테마 JSON을 생성해달라고 하면 생각보다 잘 됩니다.

---

## 설치

md_dolphin은 커스텀 Homebrew tap을 통해 배포됩니다.

```bash
brew tap bluemirr5/md-dolphin
brew install --cask md-dolphin
```

이게 전부입니다. md_dolphin이 `/Applications`에 설치됩니다.

---

## 첫 실행 — Gatekeeper 우회

md_dolphin은 현재 미서명 앱입니다(Apple Developer Program 미가입). macOS가 첫 실행을 차단합니다. 아래 방법 중 하나로 **한 번만** 진행하면 이후에는 정상 실행됩니다.

**방법 A — 터미널 (가장 빠름)**

```bash
xattr -dr com.apple.quarantine /Applications/md_dolphin.app
```

이후 md_dolphin을 평소처럼 더블클릭하세요.

**방법 B — Finder**

1. **Finder** → **응용 프로그램**을 엽니다.
2. `md_dolphin.app`을 우클릭(또는 Control+클릭)합니다.
3. 메뉴에서 **열기**를 선택합니다.
4. 보안 경고 다이얼로그에서 **열기**를 클릭합니다.

둘 중 어느 방법이든, 이후부터는 md_dolphin이 정상적으로 실행됩니다.

> **왜 이런 경고가 나타나나요?**  
> macOS Gatekeeper는 앱에 Apple Developer ID 서명이 있어야 합니다. md_dolphin은 오픈소스 개인 개발 앱으로, Apple Developer Program 가입은 향후 릴리즈에서 계획 중입니다. 이 경고는 배포 방식의 한계이며, 앱 자체의 안전 문제가 아닙니다.

---

## 시스템 요구사항

- macOS 12 Monterey 이상
- Apple Silicon 또는 Intel

---

## 라이선스

[MIT](LICENSE)

---

## 보안

취약점을 발견하셨나요? [SECURITY.md](SECURITY.md)를 참고하세요.
