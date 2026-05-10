# h1 헤딩 — 테마 색상 쇼케이스

## h2 헤딩

### h3 헤딩

#### h4 헤딩

본문 텍스트와 **굵은 텍스트**, *이탤릭 텍스트*가 함께 표시됩니다.

---

## 링크

- [내부 앵커](#h2-헤딩)
- [외부 링크 — MDN](https://developer.mozilla.org)
- [외부 링크 — Shiki](https://shiki.style)

---

## 인용문

> 인용문 텍스트입니다. 좌측 accent bar 색상이 --quote-bar 변수를 사용합니다.
> 텍스트 색상은 --text-muted 변수를 사용합니다.

> 중첩 인용문:
>
> > 안쪽 인용문 텍스트

---

## 코드 블록

```javascript
// JavaScript 예시 — shiki 하이라이팅 테스트
const theme = {
  name: 'Solarized',
  light: { 'color.bg': '#FDF6E3' },
  dark: { 'color.bg': '#002B36' },
};

function applyTheme(pack, mode) {
  const tokens = mode === 'dark' ? pack.dark : pack.light;
  Object.entries(tokens).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, value);
  });
}
```

```typescript
// TypeScript 예시
interface ThemePack {
  id: string;
  name: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

const defaultPack: ThemePack = {
  id: 'builtin:default',
  name: 'Default',
  light: { 'color.bg': '#FAFAF7' },
  dark: { 'color.bg': '#1C1C1E' },
};
```

인라인 코드: `const x = 42;`

---

## 표 (GFM Table)

| 변수 이름 | 라이트 값 | 다크 값 | 설명 |
|-----------|-----------|---------|------|
| `--bg` | `#FAFAF7` | `#1C1C1E` | 배경색 (4동결) |
| `--text` | `#1A1A1A` | `#E5E5E7` | 텍스트 색 (4동결) |
| `--heading-h1` | `#1A1A1A` | `#E5E5E7` | h1 헤딩 색 |
| `--link` | `#0A66C2` | `#5BA8FF` | 링크 색상 |
| `--table-border` | `#D1D1D6` | `#3A3A3C` | 표 테두리 |

---

## 이미지

![예시 이미지 — 존재하지 않으면 fallback 표시](./nonexistent-image.png)

*캡션 텍스트 — --image-caption-text 변수 색상*

---

## 리스트

- 아이템 1
- 아이템 2
  - 중첩 아이템 2-1
  - 중첩 아이템 2-2
- 아이템 3

1. 순서 있는 아이템 1
2. 순서 있는 아이템 2
3. 순서 있는 아이템 3

---

## 취소선 + 체크박스

~~취소선 텍스트~~

- [x] 완료된 항목
- [ ] 미완료 항목
- [x] 테마 팩 구현

---

## 긴 본문 — 스크롤 테스트

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
