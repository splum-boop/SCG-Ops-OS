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

      setSalesRecords(salesRecs);
      setTargetsMap(buildTargetsMap(targetRecs));
      setLocations(
        locationRecs.map(r => ({
          id:   r.id,
          name: r.fields?.[FIELDS.locName] || r.id,
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
