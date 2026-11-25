import { cx } from '../lib/cx';

const MATRIX_COLUMNS = 5;
// Each lit dot switches a little after the one before it, so a changing digit "redraws" top-left to bottom-right.
const DOT_CASCADE_MS = 14;
// Diagonal sweep for the seconds pop: the last dot starts ~180ms in, so the digit is complete long before the next tick.
const SECONDS_POP_STAGGER_MS = 18;
// 5x7 dot-matrix glyphs, one string per row ('1' = lit dot).
const DOT_GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
};

function DotDigit({ digit, small }: { digit: string; small: boolean }) {
  const rows = DOT_GLYPHS[digit] ?? DOT_GLYPHS['0'];

  return (
    <span className={cx('grid grid-cols-5', small ? 'gap-px' : 'gap-[2px]')}>
      {rows.flatMap((row, rowIndex) =>
        row.split('').map((cell, columnIndex) => {
          const isLit = cell === '1';
          return (
            <span
              key={`${rowIndex}-${columnIndex}`}
              className={cx(
                'rounded-full transition-[background-color,box-shadow,transform] duration-300 motion-reduce:transition-none',
                small ? 'size-[2.5px]' : 'size-1',
                isLit && 'scale-100 bg-fg shadow-[0_0_6px_rgba(255,255,255,0.55)]',
                isLit && small && 'animate-dot-pop motion-reduce:animate-none',
                !isLit && (small ? 'bg-transparent' : 'scale-75 bg-fg/[0.07]'),
              )}
              // Seconds remount every tick and pop in fresh (done well inside one second), so no old glyph lingers.
              style={
                small
                  ? { animationDelay: `${(rowIndex + columnIndex) * SECONDS_POP_STAGGER_MS}ms` }
                  : { transitionDelay: `${(rowIndex * MATRIX_COLUMNS + columnIndex) * DOT_CASCADE_MS}ms` }
              }
            />
          );
        }),
      )}
    </span>
  );
}

export function DotNumber({ value, small = false }: { value: string; small?: boolean }) {
  return (
    <span className={cx('flex', small ? 'gap-[3px]' : 'gap-1.5')}>
      {value.split('').map((digit, index) => (
        // Small (seconds) digits remount when they change so their pop animation replays.
        <DotDigit key={small ? `${index}-${digit}` : index} digit={digit} small={small} />
      ))}
    </span>
  );
}
