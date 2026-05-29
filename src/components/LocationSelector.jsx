import React from 'react';

export default function LocationSelector({ locations, selected, onChange }) {
  // Hide when fewer than 2 locations
  if (!locations || locations.length < 2) return null;

  return (
    <select
      value={selected || ''}
      onChange={e => onChange(e.target.value || null)}
      style={{
        padding: '7px 12px',
        borderRadius: '7px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b9abf' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '28px',
      }}
    >
      <option value="">All Locations</option>
      {locations.map(loc => (
        <option key={loc.id} value={loc.id}>
          {loc.name}
        </option>
      ))}
    </select>
  );
}
