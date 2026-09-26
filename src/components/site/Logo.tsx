export function LogoMark({ bg = "var(--ink)", fg = "var(--bg)" }: { bg?: string; fg?: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="9" style={{ fill: bg }} />
      <path d="M39 22 V30 A9 9 0 0 1 30 39 H22 Z" fill="#E1102B" />
      <path d="M22 39 L39 22 L28 22 A6 6 0 0 0 22 28 Z" fill="#fff" opacity=".9" />
      <text x="18.5" y="26" textAnchor="middle" fontWeight="900" fontSize="17" style={{ fill: fg, fontFamily: "var(--display)" }}>
        SS
      </text>
    </svg>
  );
}
