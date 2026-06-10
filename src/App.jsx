import React, { useState, useMemo } from 'react';
import { useAirtableData } from './hooks/useAirtableData.js';
import { useInvoiceData } from './hooks/useInvoiceData.js';
import { useVendorData } from './hooks/useVendorData.js';
import { getPeriodRows, aggregateRows, getKpiColor, fmtVal, buildTargetsMap } from './utils/calculations.js';
import KPICard from './components/KPICard.jsx';
import PeriodToggle from './components/PeriodToggle.jsx';
import LocationSelector from './components/LocationSelector.jsx';
import SummaryBar from './components/SummaryBar.jsx';
import InvoicePanels from './components/InvoicePanels.jsx';
import VendorSchedule from './components/VendorSchedule.jsx';

// ── Auto-refresh ──────────────────────────────────────────────────────────────
export const CONFIG = {
  REFRESH_INTERVAL_MS: 5 * 60 * 1000,
  DEFAULT_PERIOD: 'daily',
};

// ── Table names ───────────────────────────────────────────────────────────────
export const TABLE_NAMES = {
  dailySalesLabor: 'Daily Sales & Labor',
  kpiTargets:      'KPI Targets',
  storeLocations:  'Store Locations',
};

// ── Field names — every field reference in the entire codebase must use these ─
export const FIELDS = {
  // Daily Sales & Labor
  date:           'Date',
  salesBudget:    'Sales Plan / Budget',
  grossSales:     'Gross Sales',
  lyGrossSales:   'LY Gross Sales',
  laborHours:     'Labor Hours',
  lyLaborHours:   'LY Hours',
  laborCost:      'Labor Cost',
  lyLaborCost:    'LY Labor Cost',
  laborPct:       'Labor Percentage',
  lyLaborPct:     'LY Labor Pct',
  transactions:   'Transaction Count',
  avgTicket:      'Average Ticket',
  lyAvgTicket:    'LY Avg Ticket',
  splh:           'SPLH',
  lySplh:         'LY SPLH',
  location:       'Location',   // linked record → array of record IDs (auto-detected at runtime)
  storeNum:       'Store #',    // lookup → array
  // Food Cost / Waste (optional fields — may not exist)
  foodCostDollar: 'Food Cost $',
  wastePct:       'Waste %',
  // KPI Targets
  kpiMetric:         'Metric',
  kpiTargetPct:      '% Target Value',
  kpiYellowPct:      '% Yellow Threshold',
  kpiRedPct:         '% Red Alert',
  kpiTargetDollar:   'Target Value in $',
  kpiYellowDollar:   'Yellow Threshold in $',
  kpiRedDollar:      'Red Alert in $',
  kpiHigherIsBetter: 'Higher is Better',
  // Store Locations
  locName: 'Name',
};

// ── KPI names that match the Metric field in KPI Targets ─────────────────────
export const KPI = {
  SALES:      'Sales',
  LABOR_PCT:  'Labor %',
  FOOD_COST:  'Food Cost %',
  WASTE:      'Waste %',
  SPLH:       'SPLH',
  AVG_CHECK:  'Avg Check',
};

// ── Theme (all colors via CSS variables set in index.css) ─────────────────────
export const COLORS = {
  green:       'var(--color-green)',
  yellow:      'var(--color-yellow)',
  red:         'var(--color-red)',
  gray:        'var(--color-gray)',
  purple:      'var(--color-purple)',
  bgBase:      'var(--bg-base)',
  bgCard:      'var(--bg-card)',
  bgCardLight: 'var(--bg-card-light)',
  border:      'var(--border)',
  textPrimary:   'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textDim:       'var(--text-dim)',
};

// Raw hex values (used where CSS vars can't go, e.g. SVG stroke)
export const HEX = {
  green:  '#22c55e',
  yellow: '#eab308',
  red:    '#ef4444',
  gray:   '#374151',
  purple: '#6366f1',
  bgCard: '#1a1a2e',
  border: '#1e2a4a',
};

// ── All Locations Scorecard ───────────────────────────────────────────────────

function colorHex(colorName) {
  return HEX[colorName] || HEX.gray;
}

function AllLocationsScorecard({ salesRecords, locations, targetsMap, period, selectedDate, locationFieldName }) {
  if (!locations || locations.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
        No location data available.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {locations.map(loc => {
        const locRecords = salesRecords.filter(r => {
          const locField = r.fields?.[locationFieldName];
          if (!locField) return false;
          if (Array.isArray(locField)) return locField.includes(loc.id);
          return locField === loc.id;
        });

        const rows = getPeriodRows(locRecords, period, selectedDate);
        const metrics = aggregateRows(rows);

        const salesColor = metrics
          ? getKpiColor(
              metrics.grossSales,
              metrics.salesBudget,
              metrics.salesBudget * 0.95,
              metrics.salesBudget * 0.90,
              true
            )
          : 'gray';

        const laborTarget = targetsMap[KPI.LABOR_PCT];
        const laborColor = metrics && laborTarget
          ? getKpiColor(
              metrics.laborPct,
              laborTarget.target,
              laborTarget.yellowThreshold,
              laborTarget.redThreshold,
              laborTarget.higherIsBetter
            )
          : 'gray';

        return (
          <div
            key={loc.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '14px 20px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ flex: '0 0 160px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
              {loc.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  backgroundColor: colorHex(salesColor), flexShrink: 0,
                }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginRight: '4px' }}>Sales</span>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                {metrics ? fmtVal(metrics.grossSales, KPI.SALES) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  backgroundColor: colorHex(laborColor), flexShrink: 0,
                }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginRight: '4px' }}>Labor %</span>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                {metrics ? fmtVal(metrics.laborPct, KPI.LABOR_PCT) : '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Error Banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ error, onRetry }) {
  return (
    <div style={{
      margin: '24px auto',
      maxWidth: '600px',
      padding: '16px 24px',
      backgroundColor: '#2d1a1a',
      border: '1px solid var(--color-red)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
    }}>
      <span style={{ color: 'var(--color-red)', fontSize: '14px' }}>{error}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid var(--color-red)',
            backgroundColor: 'transparent',
            color: 'var(--color-red)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [period, setPeriod] = useState(CONFIG.DEFAULT_PERIOD);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const { salesRecords, targetsMap, locations, loading, error, lastUpdated, refetch } =
    useAirtableData(selectedLocationId);

  const { invoiceRecords, invoiceLoading } = useInvoiceData();

  const { vendorRecords, vendorLoading } = useVendorData();

  // Auto-detect which field in Daily Sales & Labor holds the linked location record IDs.
  // Scans up to 20 records for a field whose value is an array containing a known location ID.
  // This is more reliable than relying on a hardcoded field name.
  const locationFieldName = useMemo(() => {
    if (!locations.length || !salesRecords.length) return FIELDS.location;
    const locationIds = new Set(locations.map(l => l.id));
    for (const rec of salesRecords.slice(0, 20)) {
      for (const [key, val] of Object.entries(rec.fields || {})) {
        if (Array.isArray(val) && val.some(v => typeof v === 'string' && locationIds.has(v))) {
          console.log('[SCG Ops] Auto-detected location link field:', JSON.stringify(key));
          return key;
        }
      }
    }
    console.warn('[SCG Ops] Could not auto-detect location field, falling back to:', FIELDS.location);
    return FIELDS.location;
  }, [salesRecords, locations]);

  // Filter records by selected location using the auto-detected field name
  const filteredRecords = useMemo(() => {
    if (!selectedLocationId) return salesRecords;
    return salesRecords.filter(r => {
      const locField = r.fields?.[locationFieldName];
      if (!locField) return false;
      if (Array.isArray(locField)) return locField.includes(selectedLocationId);
      return locField === selectedLocationId;
    });
  }, [salesRecords, selectedLocationId, locationFieldName]);

  // Available dates — unique, sorted newest-first
  const availableDates = useMemo(() => {
    const dates = [...new Set(
      filteredRecords
        .map(r => r.fields?.[FIELDS.date])
        .filter(Boolean)
    )].sort().reverse();
    return dates;
  }, [filteredRecords]);

  // Resolved anchor date
  const resolvedDate = (selectedDate && availableDates.includes(selectedDate))
    ? selectedDate
    : (availableDates[0] || null);

  // Metrics for single-location / combined view
  const metrics = useMemo(() => {
    const rows = getPeriodRows(filteredRecords, period, resolvedDate);
    return aggregateRows(rows);
  }, [filteredRecords, period, resolvedDate]);

  // KPI card definitions
  const kpiCards = [
    {
      kpiName: KPI.SALES,
      actual: metrics?.grossSales,
      target: metrics?.salesBudget,
      ly: metrics?.lyGrossSales,
      higherIsBetter: true,
      yellowThreshold: metrics?.salesBudget != null ? metrics.salesBudget * 0.95 : undefined,
      redThreshold:    metrics?.salesBudget != null ? metrics.salesBudget * 0.90 : undefined,
    },
    {
      kpiName: KPI.LABOR_PCT,
      actual: metrics?.laborPct,
      ly: metrics?.lyLaborPct,
      ...(targetsMap[KPI.LABOR_PCT] || {}),
    },
    {
      kpiName: KPI.FOOD_COST,
      actual: metrics?.foodCostPct,
      ly: null,
      ...(targetsMap[KPI.FOOD_COST] || {}),
    },
    {
      kpiName: KPI.WASTE,
      actual: metrics?.wastePct,
      ly: null,
      ...(targetsMap[KPI.WASTE] || {}),
    },
    {
      kpiName: KPI.SPLH,
      actual: metrics?.splh,
      ly: metrics?.lySplh,
      ...(targetsMap[KPI.SPLH] || {}),
    },
    {
      kpiName: KPI.AVG_CHECK,
      actual: metrics?.avgTicket,
      ly: metrics?.lyAvgTicket,
      ...(targetsMap[KPI.AVG_CHECK] || {}),
    },
  ];

  const showAllLocations = selectedLocationId === null && locations.length > 1;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', padding: '0 0 48px' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            SCG Ops OS
          </span>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <PeriodToggle value={period} onChange={p => { setPeriod(p); setSelectedDate(null); }} />
          <LocationSelector
            locations={locations}
            selected={selectedLocationId}
            onChange={id => { setSelectedLocationId(id); setSelectedDate(null); }}
          />
          <button
            onClick={refetch}
            disabled={loading}
            title="Refresh data"
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: loading ? 'var(--text-dim)' : 'var(--text-secondary)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {loading ? <span className="spin">↻</span> : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorBanner error={error} onRetry={refetch} />}

      {/* Summary Bar */}
      <SummaryBar
        metrics={showAllLocations ? null : metrics}
        loading={loading}
        period={period}
        availableDates={availableDates}
        selectedDate={resolvedDate}
        onDateSelect={setSelectedDate}
        showAllLocations={showAllLocations}
      />

      {/* Main Content */}
      <div style={{ padding: '0 24px' }}>
        {showAllLocations ? (
          <div>
            <h2 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '14px',
            }}>
              All Locations Overview
            </h2>
            <AllLocationsScorecard
              salesRecords={salesRecords}
              locations={locations}
              targetsMap={targetsMap}
              period={period}
              selectedDate={resolvedDate}
              locationFieldName={locationFieldName}
            />
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {kpiCards.map(card => (
              <KPICard
                key={card.kpiName}
                {...card}
                loading={loading}
                noTarget={card.target == null}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && availableDates.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
            color: 'var(--text-secondary)',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No data found</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              Make sure your Airtable base has records in the Daily Sales &amp; Labor table.
            </div>
          </div>
        )}
      </div>

      <InvoicePanels
        invoiceRecords={invoiceRecords}
        invoiceLoading={invoiceLoading}
        invoicePeriod={period}
        selectedLocationId={selectedLocationId}
      />

      <VendorSchedule
        vendorRecords={vendorRecords}
        vendorLoading={vendorLoading}
        selectedLocationId={selectedLocationId}
      />
    </div>
  );
}
