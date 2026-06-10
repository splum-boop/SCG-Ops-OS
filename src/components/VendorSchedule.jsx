import React, { useMemo } from 'react';

const FIELDS = {
  vendorName:     'Vendor Name',
  orderDay:       'Order Day',
  deliveryDay:    'Delivery Day',
  storeLocations: 'Store Locations',
  active:         'Active',
};

const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long' });
const TODAY_LABEL = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const sectionLabelStyle = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '14px',
};

function recordMatchesLocation(record, selectedLocationId) {
  if (!selectedLocationId) return true;
  const val = record.fields?.[FIELDS.storeLocations];
  if (!val) return false;
  if (Array.isArray(val)) return val.includes(selectedLocationId);
  return val === selectedLocationId;
}

function VendorList({ vendors, loading }) {
  if (loading) {
    return <div className="skeleton" style={{ width: '100%', height: '60px', borderRadius: '6px' }} />;
  }

  if (vendors.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>None scheduled</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {vendors.map(v => (
        <div key={v.id} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {v.fields?.[FIELDS.vendorName]}
        </div>
      ))}
    </div>
  );
}

export default function VendorSchedule({ vendorRecords, vendorLoading, selectedLocationId }) {
  const { ordersToday, deliveriesToday } = useMemo(() => {
    const activeVendors = (vendorRecords || []).filter(r =>
      r.fields?.[FIELDS.active] && recordMatchesLocation(r, selectedLocationId)
    );

    return {
      ordersToday: activeVendors.filter(r => (r.fields?.[FIELDS.orderDay] || []).includes(TODAY)),
      deliveriesToday: activeVendors.filter(r => (r.fields?.[FIELDS.deliveryDay] || []).includes(TODAY)),
    };
  }, [vendorRecords, selectedLocationId]);

  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
      <style>{`
        .vendor-cards-row {
          display: flex;
          gap: 16px;
          flex-direction: row;
        }
        @media (max-width: 768px) {
          .vendor-cards-row {
            flex-direction: column;
          }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <h2 style={sectionLabelStyle}>Today's Vendor Schedule</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{TODAY_LABEL}</span>
      </div>

      <div className="vendor-cards-row">
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
          <h3 style={sectionLabelStyle}>📋 Orders Due Today</h3>
          <VendorList vendors={ordersToday} loading={vendorLoading} />
        </div>

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
          <h3 style={sectionLabelStyle}>🚚 Deliveries Expected Today</h3>
          <VendorList vendors={deliveriesToday} loading={vendorLoading} />
        </div>
      </div>
    </div>
  );
}
