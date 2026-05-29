import React from 'react';

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'wtd',   label: 'WTD' },
  { value: 'mtd',   label: 'MTD' },
];

export default function PeriodToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.15s ease',
            backgroundColor: value === p.value ? 'var(--color-purple)' : 'transparent',
            color: value === p.value ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
