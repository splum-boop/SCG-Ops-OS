import { useState, useEffect, useCallback, useRef } from 'react';
import { CONFIG } from '../App.jsx';

const TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;

const BASE_URL = 'https://api.airtable.com/v0';

export const INVOICES_TABLE_ID = 'tblfrLtcI2LLGkdQn';

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

export function useInvoiceData() {
  const [invoiceRecords, setInvoiceRecords] = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [invoiceError, setInvoiceError]     = useState(null);
  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!TOKEN) {
      setInvoiceError('Authentication error — please set VITE_AIRTABLE_TOKEN');
      setInvoiceLoading(false);
      return;
    }

    try {
      setInvoiceLoading(true);
      setInvoiceError(null);

      const records = await fetchAll(INVOICES_TABLE_ID);
      setInvoiceRecords(records);
    } catch (err) {
      setInvoiceError(err.message || 'Failed to load invoice data from Airtable');
    } finally {
      setInvoiceLoading(false);
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
    invoiceRecords,
    invoiceLoading,
    invoiceError,
    refetch: fetchData,
  };
}
