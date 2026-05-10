// BrandLogo — WelcomeScreen 히어로 뱃지 (SVG, 단순화)
// 레퍼런스 이미지(돌고래+문서+기어 macOS 앱 아이콘) 구도를 단순 도형으로 재현.
// 그라디언트·스퀴르클·플랫 일러스트 스타일 — 라이트/다크 테마 무관 고정 팔레트.
import type { CSSProperties } from 'react';

interface BrandLogoProps {
  readonly width?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function BrandLogo({ width = 240, className, style }: BrandLogoProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 240 240"
      width={width}
      height={width}
      role="img"
      aria-label="md_dolphin"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 스퀴르클 배경 그라디언트 — 상단 밝은 시안 → 하단 짙은 네이비 */}
        <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5DCEEC" />
          <stop offset="0.55" stopColor="#1E78B5" />
          <stop offset="1" stopColor="#0F4570" />
        </linearGradient>

        {/* 돌고래 본체 그라디언트 */}
        <linearGradient id="dolphin-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5BB8E5" />
          <stop offset="1" stopColor="#1A5FA0" />
        </linearGradient>

        {/* 돌고래 배 라이트 컬러 그라디언트 */}
        <linearGradient id="belly-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D5EEFA" />
          <stop offset="1" stopColor="#7AC2E0" />
        </linearGradient>

        {/* 종이 그라디언트 */}
        <linearGradient id="paper-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E0E8F0" />
        </linearGradient>

        {/* 외곽 시안 글로우 — feGaussianBlur */}
        <filter id="cyan-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>

        {/* 입체감용 드롭섀도우 */}
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* 외곽 시안 글로우 (스퀴르클 뒤) */}
      <rect
        x="14"
        y="14"
        width="212"
        height="212"
        rx="48"
        fill="#3FE3F0"
        opacity="0.45"
        filter="url(#cyan-glow)"
      />

      {/* 스퀴르클 배경 */}
      <rect x="20" y="20" width="200" height="200" rx="44" fill="url(#bg-grad)" />

      {/* 상단 하이라이트 (살짝 띄움) */}
      <rect x="20" y="20" width="200" height="60" rx="44" fill="#FFFFFF" opacity="0.08" />

      {/* 문서(종이) — 우하단 */}
      <g transform="translate(110, 108)" filter="url(#soft-shadow)">
        {/* 종이 본체 — 우상단 접힘 */}
        <path
          d="M 0 4 Q 0 0 4 0 H 56 L 76 20 V 88 Q 76 92 72 92 H 4 Q 0 92 0 88 Z"
          fill="url(#paper-grad)"
        />
        {/* 접힌 모서리 — 오렌지 삼각 */}
        <path d="M 56 0 V 16 Q 56 20 60 20 H 76 Z" fill="#FFB75A" />
        <path d="M 56 0 L 76 20 H 60 Q 56 20 56 16 Z" fill="#FFA133" opacity="0.6" />

        {/* 본문 라인 3줄 */}
        <rect x="10" y="34" width="40" height="3.5" rx="1.75" fill="#9DAEC0" />
        <rect x="10" y="44" width="52" height="3.5" rx="1.75" fill="#9DAEC0" />
        <rect x="10" y="54" width="34" height="3.5" rx="1.75" fill="#9DAEC0" />

        {/* 기어 아이콘 — 우하단 */}
        <g transform="translate(56, 72)">
          {/* 8-방향 톱니: 동일 rect를 45° 간격으로 8회 회전 */}
          <g fill="#5A6B7C">
            <rect x="-2.5" y="-13" width="5" height="5" rx="1" />
            <rect x="-2.5" y="-13" width="5" height="5" rx="1" transform="rotate(45)" />
            <rect x="-2.5" y="-13" width="5" height="5" rx="1" transform="rotate(90)" />
            <rect x="-2.5" y="-13" width="5" height="5" rx="1" transform="rotate(135)" />
            <rect x="-2.5" y="-13" width="5" height="5" rx="1" transform="rotate(180)" />
            <rect x="-2.5" y="-13" width="5" height="5" rx="1" transform="rotate(225)" />
            <rect x="-2.5" y="-13" width="5" height="5" rx="1" transform="rotate(270)" />
            <rect x="-2.5" y="-13" width="5" height="5" rx="1" transform="rotate(315)" />
          </g>
          {/* 기어 본체 원 */}
          <circle cx="0" cy="0" r="8" fill="#5A6B7C" />
          {/* 기어 중앙 홀 */}
          <circle cx="0" cy="0" r="3" fill="#F2F5FA" />
        </g>
      </g>

      {/* 돌고래 — 점프 자세, 문서 앞에 위치 */}
      <g filter="url(#soft-shadow)">
        {/* 본체 — 부드러운 C자형 점프 곡선 */}
        <path
          d="
            M 62 158
            C 62 130 78 102 102 86
            C 122 73 148 65 168 70
            C 180 73 184 85 174 92
            C 168 95 160 94 154 92
            C 160 96 158 104 150 105
            C 132 108 110 122 96 138
            C 86 148 76 158 70 160
            C 62 162 62 162 62 158
            Z
          "
          fill="url(#dolphin-grad)"
        />

        {/* 배 라이트 컬러 — 본체 위에 반투명 오버레이 */}
        <path
          d="
            M 90 142
            C 105 124 125 110 145 102
            C 138 110 122 118 108 130
            C 98 140 90 148 90 142
            Z
          "
          fill="url(#belly-grad)"
          opacity="0.8"
        />

        {/* 등지느러미 — 본체 위로 솟음 */}
        <path
          d="M 108 95 Q 116 73 124 66 Q 130 78 128 100 Z"
          fill="url(#dolphin-grad)"
        />

        {/* 꼬리 지느러미 — 좌측 V형 */}
        <path
          d="
            M 65 158
            C 54 156 46 160 50 167
            C 44 174 58 178 70 168
            Z
          "
          fill="url(#dolphin-grad)"
        />
      </g>

      {/* 눈 + 하이라이트 */}
      <circle cx="170" cy="83" r="2.6" fill="#0A2A4A" />
      <circle cx="171" cy="82" r="0.9" fill="#FFFFFF" />

      {/* 입선 — 부리 끝 살짝 미소 */}
      <path
        d="M 168 92 Q 173 93 176 91"
        stroke="#0A2A4A"
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
      />

      {/* 스파클 ★ — 4-pointed star + 점 */}
      <g fill="#B5EAF5">
        <path
          d="M 50 68 L 52 62 L 54 68 L 60 70 L 54 72 L 52 78 L 50 72 L 44 70 Z"
          opacity="0.9"
        />
        <path
          d="M 198 56 L 199.5 52 L 201 56 L 205 57.5 L 201 59 L 199.5 63 L 198 59 L 194 57.5 Z"
          opacity="0.8"
        />
        <circle cx="60" cy="200" r="1.8" opacity="0.85" />
        <circle cx="195" cy="195" r="2.2" opacity="0.7" />
        <circle cx="38" cy="138" r="1.5" opacity="0.7" />
      </g>
    </svg>
  );
}
