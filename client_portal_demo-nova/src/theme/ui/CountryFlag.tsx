import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

// Simplified inline flags: Windows has no flag emoji and the theme loads no external images.
const W = 30;
const H = 20;

function starPoints(cx0: number, cy0: number, outer: number, rotation = -90) {
  const inner = outer * 0.4;
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = ((rotation + index * 36) * Math.PI) / 180;
    return `${(cx0 + radius * Math.cos(angle)).toFixed(2)},${(cy0 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

function verticalBands(colors: string[]) {
  const width = W / colors.length;
  return colors.map((color, index) => <rect key={color + index} x={index * width} width={width} height={H} fill={color} />);
}

function horizontalBands(colors: string[]) {
  const height = H / colors.length;
  return colors.map((color, index) => <rect key={color + index} y={index * height} width={W} height={height} fill={color} />);
}

function unionJack() {
  return (
    <>
      <rect width={W} height={H} fill="#012169" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="1.4" />
      <path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3.4" />
    </>
  );
}

const flags: Record<string, () => ReactNode> = {
  FR: () => verticalBands(['#0055A4', '#FFFFFF', '#EF4135']),
  IT: () => verticalBands(['#009246', '#FFFFFF', '#CE2B37']),
  DE: () => horizontalBands(['#000000', '#DD0000', '#FFCE00']),
  NL: () => horizontalBands(['#AE1C28', '#FFFFFF', '#21468B']),
  HU: () => horizontalBands(['#CD2A3E', '#FFFFFF', '#436F4D']),
  PL: () => horizontalBands(['#FFFFFF', '#DC143C']),
  JP: () => (
    <>
      <rect width={W} height={H} fill="#FFFFFF" />
      <circle cx="15" cy="10" r="6" fill="#BC002D" />
    </>
  ),
  DK: () => (
    <>
      <rect width={W} height={H} fill="#C8102E" />
      <rect x="9" width="3" height={H} fill="#FFFFFF" />
      <rect y="8.5" width={W} height="3" fill="#FFFFFF" />
    </>
  ),
  NO: () => (
    <>
      <rect width={W} height={H} fill="#BA0C2F" />
      <rect x="8" width="5" height={H} fill="#FFFFFF" />
      <rect y="7.5" width={W} height="5" fill="#FFFFFF" />
      <rect x="9.25" width="2.5" height={H} fill="#00205B" />
      <rect y="8.75" width={W} height="2.5" fill="#00205B" />
    </>
  ),
  CH: () => (
    <>
      <rect width={W} height={H} fill="#DA291C" />
      <rect x="13" y="4" width="4" height="12" fill="#FFFFFF" />
      <rect x="9" y="8" width="12" height="4" fill="#FFFFFF" />
    </>
  ),
  TR: () => (
    <>
      <rect width={W} height={H} fill="#E30A17" />
      <circle cx="11" cy="10" r="5" fill="#FFFFFF" />
      <circle cx="12.3" cy="10" r="4" fill="#E30A17" />
      <polygon points={starPoints(18, 10, 2.4, 180)} fill="#FFFFFF" />
    </>
  ),
  CA: () => (
    <>
      <rect width={W} height={H} fill="#FFFFFF" />
      <rect width="7.5" height={H} fill="#D52B1E" />
      <rect x="22.5" width="7.5" height={H} fill="#D52B1E" />
      <path d="M15,3.5 L16.2,6.5 L18,5.8 L17.4,9 L19.8,8 L19.2,10 L20.5,10.6 L17,13 L17.4,14.4 L15.4,14 L15.4,16.5 L14.6,16.5 L14.6,14 L12.6,14.4 L13,13 L9.5,10.6 L10.8,10 L10.2,8 L12.6,9 L12,5.8 L13.8,6.5 Z" fill="#D52B1E" />
    </>
  ),
  US: () => (
    <>
      {Array.from({ length: 7 }, (_, index) => (
        <rect key={index} y={(index * H) / 7} width={W} height={H / 7} fill={index % 2 === 0 ? '#B22234' : '#FFFFFF'} />
      ))}
      <rect width="13" height={(H / 7) * 4} fill="#3C3B6E" />
      {[2.2, 5.4, 8.6].flatMap((y) => [2.2, 5.2, 8.2, 11.2].map((x) => <circle key={`${x}-${y}`} cx={x - (y === 5.4 ? 1.5 : 0)} cy={y} r="0.7" fill="#FFFFFF" />))}
    </>
  ),
  GB: unionJack,
  NZ: () => (
    <>
      <rect width={W} height={H} fill="#012169" />
      <g transform="scale(0.5)">{unionJack()}</g>
      {[
        [22, 5],
        [19, 9.5],
        [25, 9],
        [22, 15.5],
      ].map(([x, y]) => (
        <polygon key={`${x}-${y}`} points={starPoints(x, y, 1.6)} fill="#C8102E" stroke="#FFFFFF" strokeWidth="0.4" />
      ))}
    </>
  ),
  EA: () => (
    <>
      <rect width={W} height={H} fill="#003399" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        return <polygon key={index} points={starPoints(15 + 5.5 * Math.cos(angle), 10 + 5.5 * Math.sin(angle), 0.9)} fill="#FFCC00" />;
      })}
    </>
  ),
  CN: () => (
    <>
      <rect width={W} height={H} fill="#DE2910" />
      <polygon points={starPoints(5.5, 5.5, 3)} fill="#FFDE00" />
      {[
        [10, 2],
        [12, 4],
        [12, 7],
        [10, 9],
      ].map(([x, y]) => (
        <polygon key={`${x}-${y}`} points={starPoints(x, y, 1)} fill="#FFDE00" />
      ))}
    </>
  ),
  HK: () => (
    <>
      <rect width={W} height={H} fill="#DE2910" />
      {Array.from({ length: 5 }, (_, index) => (
        <ellipse key={index} cx="15" cy="6.6" rx="1.6" ry="3.2" fill="#FFFFFF" transform={`rotate(${index * 72} 15 10)`} />
      ))}
    </>
  ),
  KR: () => (
    <>
      <rect width={W} height={H} fill="#FFFFFF" />
      <path d="M10,10 A5,5 0 0,1 20,10 Z" fill="#CD2E3A" />
      <path d="M10,10 A5,5 0 0,0 20,10 Z" fill="#0047A0" />
      <path d="M4,4 L7,2 M4.8,5.2 L7.8,3.2 M23,2 L26,4 M22.2,3.2 L25.2,5.2 M4,16 L7,18 M4.8,14.8 L7.8,16.8 M23,18 L26,16 M22.2,16.8 L25.2,14.8" stroke="#000000" strokeWidth="0.8" />
    </>
  ),
  SG: () => (
    <>
      {horizontalBands(['#EF3340', '#FFFFFF'])}
      <circle cx="6" cy="5" r="3.4" fill="#FFFFFF" />
      <circle cx="7.3" cy="5" r="3.2" fill="#EF3340" />
      {[
        [9, 3],
        [11, 4.2],
        [10.4, 6.4],
        [7.8, 6.6],
        [7.6, 4.2],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x + 0.6} cy={y} r="0.6" fill="#FFFFFF" />
      ))}
    </>
  ),
  MX: () => (
    <>
      {verticalBands(['#006847', '#FFFFFF', '#CE1126'])}
      <circle cx="15" cy="10" r="2.6" fill="#8C5A2B" />
      <path d="M12.6,11 Q15,14 17.4,11" stroke="#006847" strokeWidth="0.8" fill="none" />
    </>
  ),
  BR: () => (
    <>
      <rect width={W} height={H} fill="#009C3B" />
      <polygon points="15,2 27,10 15,18 3,10" fill="#FFDF00" />
      <circle cx="15" cy="10" r="4.2" fill="#002776" />
      <path d="M11,9.2 Q15,8.2 19,10.6" stroke="#FFFFFF" strokeWidth="0.7" fill="none" />
    </>
  ),
  AT: () => (
    <>
      <rect width={W} height={H} fill="#C8102E" />
      <rect y="6.67" width={W} height="6.67" fill="#FFFFFF" />
    </>
  ),
  SE: () => (
    <>
      <rect width={W} height={H} fill="#006AA7" />
      <rect x="9" width="3.5" height={H} fill="#FECC00" />
      <rect y="8.25" width={W} height="3.5" fill="#FECC00" />
    </>
  ),
  ZA: () => (
    <>
      <rect width={W} height="10" fill="#E03C31" />
      <rect y="10" width={W} height="10" fill="#001489" />
      <polygon points="0,0 4,0 14,7 30,7 30,13 14,13 4,20 0,20" fill="#FFFFFF" />
      <polygon points="0,1.5 2,0 3.2,0 13.2,8 30,8 30,12 13.2,12 3.2,20 2,20 0,18.5" fill="#007749" />
      <polygon points="0,3.5 9,10 0,16.5" fill="#FFB81C" />
      <polygon points="0,5 7,10 0,15" fill="#000000" />
    </>
  ),
};

export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const renderFlag = flags[code];
  if (!renderFlag) {
    return (
      <span aria-hidden="true" className={cx('inline-grid h-3.5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[7px] font-bold text-fg-subtle ring-1 ring-line', className)}>
        {code}
      </span>
    );
  }
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} className={cx('h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.25)]', className)}>
      {renderFlag()}
    </svg>
  );
}
