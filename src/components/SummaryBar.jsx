import React from 'react';
import DatePicker from './DatePicker.jsx';

function fmt(v, type) {
  if (v == null || !isFinite(v)) return '—';
  if (type === 'dollar') return `$${Math.round(v).toLocaleString()}`;
  if (type === 'count')  return Math.round(v).toLocaleString();
  if (type === 'hours')  return `${v.toFixed(1)} hrs`;
  return String(v);
}

function StatItem({ label, value, loading }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)' }}>
        {label}
      </span>
      {loading ? (
        <div className="skeleton" style={{ width: '60px', height: '18px', borderRadius: '4px' }} />
      ) : (
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {value}
        </span>
      )}
    </div>
  );
}

export default function SummaryBar({ metrics, loading, period, availableDates, selectedDate, onDateSelect, showAllLocations }) {
  const periodLabel = period === 'daily' ? 'Day' : period === 'wtd' ? 'Week-to-Date' : 'Month-to-Date';

  return (
    <div style={{
      padding: '14px 24px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      flexWrap: 'wrap',
      backgroundColor: 'var(--bg-card-light)',
    }}>
      {/* Period label */}
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: 'var(--color-purple)',
        whiteSpace: 'nowrap',
      }}>
        {periodLabel}
      </span>

      {/* Date picker */}
      <DatePicker
        dates={availableDates || []}
        selected={selectedDate}
        onSelect={onDateSelect}
      />

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border)', flexShrink: 0 }} />

      {showAllLocations ? (
        /* When All Locations is active, stats would be meaningless combined totals — show hint instead */
        <span style={{
          fontSize: '12px',
          color: 'var(--text-dim)',
          fontStyle: 'italic',
        }}>
          Select a location to see detail stats
        </span>
      ) : (
        <>
          <StatItem
            label="Transactions"
            value={fmt(metrics?.transactions, 'count')}
            loading={loading}
          />
          <StatItem
            label="Labor Hours"
            value={fmt(metrics?.laborHours, 'hours')}
            loading={loading}
          />
          <StatItem
            label="Labor Cost"
            value={fmt(metrics?.laborCost, 'dollar')}
            loading={loading}
          />

          {/* Date range label (for WTD/MTD) */}
          {metrics?.dateLabel && period !== 'daily' && (
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
              {metrics.dateLabel}
            </span>
          )}
        </>
      )}
    </div>
  );
}
