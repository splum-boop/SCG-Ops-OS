import React, { useMemo } from 'react';
import { isoLocal, weekMonday, monthFirst } from '../utils/calculations.js';

const FIELDS = {
  status:           'Status',
  totalAmount:      'Total Amount',
  storeLocation:    'Store Location',
  receivedDate:     'Received Date',
  paymentTriggered: 'Payment Triggered',
};

const STORES = [
  { id: 'rec5IYj1Mt8jqmX5Y', name: 'Riverside Convenience & Gas' },
  { id: 'rec4RPWrtrNQKSGcX', name: 'Midtown Grille' },
  { id: 'recCDNFEHS1bgH8lU', name: 'Miller Catering' },
];

function fmtDollar(v) {
  return `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function filterByPeriod(records, period) {
  const now = new Date();
  const todayStr = isoLocal(now);

  let startStr;
  if (period === 'wtd') startStr = weekMonday(now);
  else if (period === 'mtd') startStr = monthFirst(now);
  else startStr = todayStr; // 'daily'

  return records.filter(r => {
    const d = r.fields?.[FIELDS.receivedDate];
    return d && d >= startStr && d <= todayStr;
  });
}

function recordMatchesStore(record, storeId) {
  const val = record.fields?.[FIELDS.storeLocation];
  if (!val) return false;
  if (Array.isArray(val)) return val.includes(storeId);
  return val === storeId;
}

function computeStoreMetrics(records, storeId) {
  const rows = records.filter(r => recordMatchesStore(r, storeId));

  const processedRows = rows.filter(r => ['CLEAN', 'PAID'].includes(r.fields?.[FIELDS.status]));
  const pendingRows = rows.filter(r =>
    r.fields?.[FIELDS.status] === 'CLEAN' && !r.fields?.[FIELDS.paymentTriggered]
  );
  const exceptionRows = rows.filter(r => ['ANNOTATED', 'Pending Credit Memo'].includes(r.fields?.[FIELDS.status]));
  const unreadableRows = rows.filter(r => r.fields?.[FIELDS.status] === 'UNREADABLE');

  const sumAmount = arr => arr.reduce((acc, r) => acc + (parseFloat(r.fields?.[FIELDS.totalAmount]) || 0), 0);

  return {
    processed:  { count: processedRows.length, sum: sumAmount(processedRows) },
    pending:    { count: pendingRows.length, sum: sumAmount(pendingRows) },
    exceptions: { count: exceptionRows.length, sum: sumAmount(exceptionRows) },
    unreadable: { count: unreadableRows.length },
  };
}

function MetricRow({ label, value, color, pulsing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: color || 'var(--text-primary)' }}>
        {pulsing && <span className="invoice-pulse-dot" style={{ backgroundColor: color }} />}
        {value}
      </span>
    </div>
  );
}

function StoreCard({ store, metrics, loading }) {
  const { processed, pending, exceptions, unreadable } = metrics;

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      flex: '1 1 0',
      minWidth: 0,
    }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {store.name}
      </div>

      {loading ? (
        <div className="skeleton" style={{ width: '100%', height: '90px', borderRadius: '6px' }} />
      ) : (
        <>
          <MetricRow
            label="Processed"
            value={`${processed.count} · ${fmtDollar(processed.sum)}`}
            color="var(--color-green)"
          />
          <MetricRow
            label="Pending Approval"
            value={`${pending.count} · ${fmtDollar(pending.sum)}`}
            color="var(--color-yellow)"
            pulsing={pending.count > 0}
          />
          <MetricRow
            label="Exceptions"
            value={`${exceptions.count} · ${fmtDollar(exceptions.sum)}`}
            color={exceptions.count > 0 ? 'var(--color-red)' : 'var(--text-primary)'}
          />
          <MetricRow
            label="Unreadable"
            value={`${unreadable.count}`}
            color={unreadable.count > 0 ? 'var(--color-red)' : 'var(--text-primary)'}
          />
        </>
      )}
    </div>
  );
}

export default function InvoicePanels({ invoiceRecords, invoiceLoading, invoicePeriod, selectedLocationId }) {
  const filteredRecords = useMemo(
    () => filterByPeriod(invoiceRecords || [], invoicePeriod),
    [invoiceRecords, invoicePeriod]
  );

  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
      <style>{`
        @keyframes invoice-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .invoice-pulse-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: invoice-pulse 1.2s ease-in-out infinite;
        }
        .invoice-cards-row {
          display: flex;
          gap: 16px;
          flex-direction: row;
        }
        @media (max-width: 768px) {
          .invoice-cards-row {
            flex-direction: column;
          }
        }
      `}</style>

      <h2 style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '14px',
      }}>
        Invoice Overview
      </h2>

      <div className="invoice-cards-row">
        {STORES.map(store => (
          <StoreCard
            key={store.id}
            store={store}
            metrics={computeStoreMetrics(filteredRecords, store.id)}
            loading={invoiceLoading}
          />
        ))}
      </div>
    </div>
  );
}
