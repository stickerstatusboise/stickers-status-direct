/**
 * Placeholder sticker designs from the prototype, as SVG fragments on a 200×200 canvas.
 * Used for product cards, the gallery and the preview before a customer uploads artwork.
 */
import type { ArtKey } from "./catalog";

const FD = 'style="font-family:var(--display);font-weight:900"';
const FM = 'style="font-family:var(--mono);font-weight:700"';

const starPts = (() => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 42 : 94;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    p.push((100 + r * Math.cos(a)).toFixed(1) + "," + (104 + r * Math.sin(a)).toFixed(1));
  }
  return p.join(" ");
})();

const sunRays = Array.from(
  { length: 12 },
  (_, i) => `<rect x="95" y="16" width="10" height="24" rx="5" fill="#FFC21A" transform="rotate(${i * 30} 100 84)"/>`,
).join("");

const fuel = (cup: string, fs: number) =>
  `<g stroke="#9A9393" stroke-width="7" stroke-linecap="round" fill="none"><path d="M76 22q-10 12 0 24q10 12 0 24"/><path d="M102 16q-10 12 0 24q10 12 0 24"/><path d="M128 22q-10 12 0 24q10 12 0 24"/></g><path d="M42 74H158L148 166Q146 182 130 182H70Q54 182 52 166Z" fill="${cup}"/><circle cx="160" cy="112" r="22" fill="none" stroke="${cup}" stroke-width="12"/><text x="100" y="${fs > 36 ? 142 : 136}" text-anchor="middle" ${FD} font-size="${fs}" letter-spacing="2" fill="#fff">FUEL</text>`;

export const ART: Record<ArtKey, { bg: string; svg: string }> = {
  bolt: { bg: "#0D0B0B", svg: `<circle cx="100" cy="100" r="82" fill="#E1102B"/><polygon points="114,26 56,114 94,114 80,176 144,84 106,84" fill="#fff"/>` },
  peak: {
    bg: "#FFFFFF",
    svg: `<circle cx="120" cy="78" r="36" fill="#E1102B"/><polygon points="16,146 72,64 98,98 128,50 186,146" fill="#0D0B0B"/><polygon points="72,64 61,81 68,77 75,83 83,79" fill="#fff"/><polygon points="128,50 114,72 121,67 128,74 140,70" fill="#fff"/><rect x="24" y="140" width="154" height="40" rx="7" fill="#0D0B0B"/><text x="101" y="170" text-anchor="middle" ${FD} font-size="30" letter-spacing="5" fill="#fff">BOISE</text>`,
  },
  sendit: {
    bg: "#E1102B",
    svg: `<polygon points="34,54 194,54 168,146 8,146" fill="#0D0B0B"/><text x="127" y="114" text-anchor="middle" transform="skewX(-14)" ${FD} font-size="46" letter-spacing="1" fill="#fff">SEND IT</text><polygon points="30,126 178,126 175,134 27,134" fill="#E1102B"/>`,
  },
  fuel: { bg: "#0D0B0B", svg: fuel("#E1102B", 44) },
  "fuel-v1": { bg: "#0D0B0B", svg: fuel("#3B3434", 30) },
  mono: {
    bg: "#E1102B",
    svg: `<rect x="22" y="22" width="156" height="156" rx="24" fill="#0D0B0B"/><text x="100" y="130" text-anchor="middle" ${FD} font-size="96" fill="#E1102B">SS</text><text x="100" y="160" text-anchor="middle" ${FM} font-size="13" letter-spacing="6" fill="#fff">STATUS</text>`,
  },
  sun: {
    bg: "#1C1A3A",
    svg: `${sunRays}<circle cx="100" cy="84" r="40" fill="#FFC21A"/><path d="M14 128H186L175 150L186 172H14L25 150Z" fill="#E1102B"/><text x="100" y="160" text-anchor="middle" ${FD} font-size="27" letter-spacing="3" fill="#fff">GOOD VIBES</text>`,
  },
  flame: {
    bg: "#0D0B0B",
    svg: `<path d="M100 12C112 46 152 66 158 112C164 158 134 190 100 190C66 190 36 162 42 118C46 90 64 78 68 52C80 68 86 80 88 92C94 64 98 42 100 12Z" fill="#E1102B"/><path d="M100 84C108 104 128 116 128 142C128 164 114 176 100 176C86 176 72 164 72 144C72 128 82 122 86 108C92 118 96 122 98 128C100 112 100 100 100 84Z" fill="#FFC21A"/>`,
  },
  "flame-v2": {
    bg: "#0D0B0B",
    svg: `<path d="M100 8C112 40 150 58 156 100C162 140 134 166 100 166C66 166 38 142 44 104C48 80 64 70 68 48C80 62 86 72 88 84C94 58 98 38 100 8Z" fill="#B00A1F"/><path d="M100 76C108 94 126 104 126 128C126 146 114 156 100 156C86 156 74 146 74 130C74 116 82 110 86 98C92 106 96 110 98 116C100 102 100 92 100 76Z" fill="#FFC21A"/><rect x="40" y="170" width="120" height="26" rx="5" fill="#0D0B0B" stroke="#fff" stroke-width="2"/><text x="100" y="189" text-anchor="middle" ${FM} font-size="13" letter-spacing="3" fill="#fff">EST. 1998</text>`,
  },
  star: {
    bg: "#FFFFFF",
    svg: `<polygon points="${starPts}" fill="#0D0B0B"/><circle cx="100" cy="106" r="36" fill="#E1102B"/><text x="100" y="102" text-anchor="middle" ${FD} font-size="17" letter-spacing="1.5" fill="#fff">LOCAL</text><text x="100" y="121" text-anchor="middle" ${FD} font-size="17" letter-spacing="1.5" fill="#fff">LEGEND</text>`,
  },
};
