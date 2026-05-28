

interface Props {
  available: number;
  total: number;
}

export function StockBadge({ available, total }: Props) {
  const pct = total > 0 ? available / total : 0;
  const color =
    available === 0 ? 'var(--red)' :
    pct <= 0.2 ? 'var(--orange)' : 'var(--green)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>Stock</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '13px', color,
          animation: available === 0 ? 'pulse 2s ease infinite' : 'none',
        }}>
          {available === 0 ? 'SOLD OUT' : `${available} / ${total}`}
        </span>
      </div>
      {/* Stock bar */}
      <div style={{
        height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`,
          background: color,
          transition: 'width 600ms ease, background 600ms ease',
        }} />
      </div>
    </div>
  );
}
