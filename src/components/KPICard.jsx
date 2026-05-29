import React, { useState } from 'react';
import { HEX, COLORS } from '../App.jsx';
import { getKpiColor, fmtVal, fmtDiff, varianceBadge } from '../utils/calculations.js';

// Ring dimensions
const RING_SIZE = 148;
const STROKE_WIDTH = 11;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function colorToHex(colorName) {
  return HEX[colorName] || HEX.gray;
}

function RingGauge({ fill, color, loading }) {
  const clamped = Math.max(0, Math.min(1.2, fill || 0));
  const offset = CIRCUMFERENCE * (1 - clamped);

  const strokeColor = loading ? HEX.border : colorToHex(color);

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={HEX.border}
        strokeWidth={STROKE_WIDTH}
      />
      {/* Progress */}
      <circle
        className="ring-progress"
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={loading ? HEX.gray : strokeColor}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={loading ? CIRCUMFERENCE : offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function SkeletonLine({ width = '60%', height = '16px', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: '6px', ...style }}
    />
  );
}

export default function KPICard({
  kpiName,
  actual,
  target,
  yellowThreshold,
  redThreshold,
  higherIsBetter,
  ly,
  loading,
  noTarget,
}) {
  const [mode, setMode] = useState('target'); // 'target' | 'ly'

  // Determine color
  const rawColor = getKpiColor(actual, target, yellowThreshold, redThreshold, higherIsBetter);
  const color = (noTarget || actual == null) ? 'gray' : rawColor;

  // Ring fill
  let ringFill = 0;
  if (mode === 'target') {
    if (!noTarget && actual != null && target != null && target !== 0) {
      ringFill = actual / target;
    }
  } else {
    // LY mode
    if (ly != null && isFinite(ly) && ly !== 0 && actual != null) {
      ringFill = actual / ly;
    }
  }

  // Variance badge for target mode
  const badge = mode === 'target'
    ? varianceBadge(actual, target, higherIsBetter, kpiName)
    : null;

  // TY vs LY badge for LY mode
  let lyBadge = null;
  if (mode === 'ly' && ly != null && isFinite(ly) && actual != null && isFinite(actual)) {
    const diff = actual - ly;
    const isGood = higherIsBetter ? diff > 0 : diff < 0;
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
    const badgeColor = isGood ? 'green' : diff === 0 ? 'gray' : 'red';
    lyBadge = {
      label: diff === 0 ? 'Same as LY' : `TY ${arrow} ${fmtDiff(Math.abs(diff), kpiName)} vs LY`,
      isGood,
      color: badgeColor,
    };
  }

  const displayValue = actual != null && isFinite(actual) ? fmtVal(actual, kpiName) : '—';
  const lyValue = ly != null && isFinite(ly) ? fmtVal(ly, kpiName) : null;

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '20px 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      minWidth: '180px',
      position: 'relative',
    }}>
      {/* KPI Name */}
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
      }}>
        {kpiName}
      </div>

      {/* Ring + Center Value */}
      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>
        {loading ? (
          <div className="skeleton" style={{ width: RING_SIZE, height: RING_SIZE, borderRadius: '50%' }} />
        ) : (
          <RingGauge fill={ringFill} color={mode === 'ly' ? 'purple' : color} loading={loading} />
        )}
        {/* Center text */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
        }}>
          {loading ? (
            <SkeletonLine width="50px" height="20px" />
          ) : (
            <>
              <span style={{
                fontSize: mode === 'target' ? '22px' : '18px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}>
                {mode === 'ly' && (ly == null || !isFinite(ly)) ? '—' : displayValue}
              </span>
              {mode === 'ly' && lyValue && (
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  LY: {lyValue}
                </span>
              )}
              {mode === 'target' && !noTarget && target != null && (
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  / {fmtVal(target, kpiName)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Badge area */}
      <div style={{ minHeight: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <SkeletonLine width="80px" height="18px" />
        ) : mode === 'target' ? (
          noTarget ? (
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>No target set</span>
          ) : badge ? (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: colorToHex(badge.color),
              backgroundColor: `${colorToHex(badge.color)}22`,
              padding: '3px 8px',
              borderRadius: '20px',
              border: `1px solid ${colorToHex(badge.color)}44`,
            }}>
              {badge.label}
            </span>
          ) : null
        ) : (
          // LY mode
          ly == null || !isFinite(ly) ? (
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>
              LY data not yet available
            </span>
          ) : lyBadge ? (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: colorToHex(lyBadge.color),
              backgroundColor: `${colorToHex(lyBadge.color)}22`,
              padding: '3px 8px',
              borderRadius: '20px',
              border: `1px solid ${colorToHex(lyBadge.color)}44`,
              textAlign: 'center',
            }}>
              {lyBadge.label}
            </span>
          ) : null
        )}
      </div>

      {/* Color dot */}
      {!loading && (
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: colorToHex(mode === 'ly' ? 'purple' : color),
        }} />
      )}

      {/* LY Toggle button — ALWAYS rendered */}
      <button
        onClick={() => setMode(m => m === 'target' ? 'ly' : 'target')}
        title={mode === 'target' ? 'View vs Last Year' : 'View vs Target'}
        style={{
          marginTop: '2px',
          padding: '4px 10px',
          borderRadius: '6px',
          border: `1px solid ${mode === 'ly' ? HEX.purple : HEX.border}`,
          backgroundColor: mode === 'ly' ? `${HEX.purple}22` : 'transparent',
          color: mode === 'ly' ? HEX.purple : 'var(--text-dim)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span>⇅</span>
        <span>{mode === 'target' ? 'vs LY' : 'vs Target'}</span>
      </button>
    </div>
  );
}
