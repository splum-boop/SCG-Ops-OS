import React, { useState, useRef, useEffect } from 'react';

function formatDateDisplay(isoStr) {
  if (!isoStr) return '—';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const [y, m, d] = parts;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthName = months[parseInt(m, 10) - 1] || m;
  return `${monthName} ${parseInt(d, 10)}, ${y}`;
}

export default function DatePicker({ dates, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // dates is sorted newest-first; index 0 = most recent
  const currentIndex = dates.indexOf(selected);

  function goOlder() {
    // Older = higher index
    const next = currentIndex + 1;
    if (next < dates.length) onSelect(dates[next]);
  }

  function goNewer() {
    // Newer = lower index
    const prev = currentIndex - 1;
    if (prev >= 0) onSelect(dates[prev]);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!dates || dates.length === 0) return null;

  const canGoOlder = currentIndex < dates.length - 1;
  const canGoNewer = currentIndex > 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {/* Left arrow (older) */}
      <button
        onClick={goOlder}
        disabled={!canGoOlder}
        title="Go to older date"
        style={{
          padding: '4px 8px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          backgroundColor: 'transparent',
          color: canGoOlder ? 'var(--text-secondary)' : 'var(--text-dim)',
          cursor: canGoOlder ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          lineHeight: 1,
        }}
      >
        ←
      </button>

      {/* Date display / dropdown trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
        }}
      >
        {formatDateDisplay(selected)}
        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>▾</span>
      </button>

      {/* Right arrow (newer) */}
      <button
        onClick={goNewer}
        disabled={!canGoNewer}
        title="Go to newer date"
        style={{
          padding: '4px 8px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          backgroundColor: 'transparent',
          color: canGoNewer ? 'var(--text-secondary)' : 'var(--text-dim)',
          cursor: canGoNewer ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          lineHeight: 1,
        }}
      >
        →
      </button>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '6px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 100,
          maxHeight: '260px',
          overflowY: 'auto',
          minWidth: '160px',
        }}>
          {dates.map(d => (
            <button
              key={d}
              onClick={() => { onSelect(d); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '9px 14px',
                textAlign: 'left',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                backgroundColor: d === selected ? 'var(--color-purple)' : 'transparent',
                color: d === selected ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: d === selected ? 600 : 400,
              }}
            >
              {formatDateDisplay(d)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
