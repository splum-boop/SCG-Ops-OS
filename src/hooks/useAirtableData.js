import { useState, useEffect, useCallback, useRef } from 'react';
import { TABLE_NAMES, FIELDS, CONFIG } from '../App.jsx';
import { buildTargetsMap } from '../utils/calculations.js';

const TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;

const BASE_URL = 'https://api.airtable.com/v0';

/** Fetches all pages from a table */
async function fetchAll(tableName) {
  if (!TOKEN || !BASE_ID) {
    throw new Error('Authentication error — please set VITE_AIRTABLE_TOKEN');
  }

  const encodedTable = encodeURIComponent(tableName);
  let records = [];
  let offset = null;

  do {
    const url = new URL(`${BASE_URL}/${BASE_ID}/${encodedTable}`);
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication error — please check your Airtable token');
    }

    if (!response.ok) {
      throw new Error(`Airtable fetch failed for "${tableName}": ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    records = records.concat(data.records || []);
    offset = data.offset || null;
  } while (offset);

  return records;
}

/**
 * Resolve a human-readable name from a Store Locations record.
 * Tries the configured FIELDS.locName first, then common Airtable naming
 * conventions, then falls back to the first plain-string field value found.
 */
function resolveLocationName(r) {
  const fields = r.fields || {};

  // Try configured field name first
  const configured = fields[FIELDS.locName];
  if (configured && typeof configured === 'string') return configured;

  // Try common variations used in Airtable
  const candidates = [
    'Name', 'Location Name', 'Store Name', 'Location', 'Title',
    'Store', 'Site Name', 'Site', 'Branch', 'Branch Name',
  ];
  for (const key of candidates) {
    const val = fields[key];
    if (val && typeof val === 'string') return val;
  }

  // Fall back to first non-empty plain-string field
  for (const val of Object.values(fields)) {
    if (val && typeof val === 'string') return val;
  }

  return r.id;
}

export function useAirtableData(selectedLocationId) {
  const [salesRecords, setSalesRecords]   = useState([]);
  const [targetsMap, setTargetsMap]       = useState({});
  const [locations, setLocations]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [lastUpdated, setLastUpdated]     = useState(null);
  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!TOKEN) {
      setError('Authentication error — please set VITE_AIRTABLE_TOKEN');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [salesRecs, targetRecs, locationRecs] = await Promise.all([
        fetchAll(TABLE_NAMES.dailySalesLabor),
        fetchAll(TABLE_NAMES.kpiTargets),
        fetchAll(TABLE_NAMES.storeLocations),
      ]);

      // ── Diagnostic logs — open browser DevTools Console (F12) to read ──────
      if (locationRecs.length > 0) {
        console.log('[SCG Ops] Store Locations — record id:', locationRecs[0].id);
        console.log('[SCG Ops] Store Locations — field names:', Object.keys(locationRecs[0].fields || {}));
        console.log('[SCG Ops] Store Locations — first record fields:', locationRecs[0].fields);
      }
      if (salesRecs.length > 0) {
        console.log('[SCG Ops] Daily Sales & Labor — first record fields:', salesRecs[0].fields);
        console.log('[SCG Ops] Daily Sales & Labor — "Location" field raw value:', salesRecs[0].fields?.[FIELDS.location]);
        console.log('[SCG Ops] Daily Sales & Labor — "Store #" field raw value:', salesRecs[0].fields?.[FIELDS.storeNum]);
      }
      // ────────────────────────────────────────────────────────────────────────

      setSalesRecords(salesRecs);
      setTargetsMap(buildTargetsMap(targetRecs));
      setLocations(
        locationRecs.map(r => ({
          id:   r.id,
          name: resolveLocationName(r),
        }))
      );
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load data from Airtable');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData();

    timerRef.current = setInterval(fetchData, CONFIG.REFRESH_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  return {
    salesRecords,
    targetsMap,
    locations,
    loading,
    error,
    lastUpdated,
    refetch: fetchData,
  };
}
