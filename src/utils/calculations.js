import { FIELDS, KPI } from '../App.jsx';

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Parse ISO date string to local date components, avoiding timezone shift. */
export function parseDate(iso) {
  if (!iso) return null;
  const parts = String(iso).split('-');
  if (parts.length !== 3) return null;
  return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10), d: parseInt(parts[2], 10) };
}

/** Returns 'YYYY-MM-DD' from a Date object using local date. */
export function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing d (Date object). Returns 'YYYY-MM-DD'. */
export function weekMonday(d) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay(); // 0=Sun, 1=Mon,...
  const diff = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + diff);
  return isoLocal(copy);
}

/** First day of month. Returns 'YYYY-MM-DD'. */
export function monthFirst(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ---------------------------------------------------------------------------
// Period filtering
// ---------------------------------------------------------------------------

/**
 * Filter records for the given period/selectedDate.
 * period: 'daily' | 'wtd' | 'mtd'
 * If no records in current real period, falls back to most recent period with data.
 */
export function getPeriodRows(records, period, selectedDate) {
  if (!records || records.length === 0) return [];

  // Get all unique dates from records, sorted newest-first
  const allDates = [...new Set(
    records
      .map(r => r.fields?.[FIELDS.date])
      .filter(Boolean)
  )].sort().reverse();

  if (allDates.length === 0) return [];

  // Resolve anchor date: use selectedDate if it exists in the data, else use most recent
  const anchorStr = (selectedDate && allDates.includes(selectedDate))
    ? selectedDate
    : allDates[0];

  const anchorParts = parseDate(anchorStr);
  if (!anchorParts) return [];

  const anchorDate = new Date(anchorParts.y, anchorParts.m - 1, anchorParts.d);

  let startStr;
  if (period === 'daily') {
    startStr = anchorStr;
    return records.filter(r => r.fields?.[FIELDS.date] === startStr);
  } else if (period === 'wtd') {
    startStr = weekMonday(anchorDate);
  } else if (period === 'mtd') {
    startStr = monthFirst(anchorDate);
  }

  // Filter records in [startStr, anchorStr]
  const rows = records.filter(r => {
    const d = r.fields?.[FIELDS.date];
    return d && d >= startStr && d <= anchorStr;
  });

  if (rows.length > 0) return rows;

  // Fallback: find most recent period with data
  // Try each date as anchor going back
  for (const dateStr of allDates) {
    const parts = parseDate(dateStr);
    if (!parts) continue;
    const d = new Date(parts.y, parts.m - 1, parts.d);
    let start;
    if (period === 'wtd') {
      start = weekMonday(d);
    } else {
      start = monthFirst(d);
    }
    const fallbackRows = records.filter(r => {
      const rd = r.fields?.[FIELDS.date];
      return rd && rd >= start && rd <= dateStr;
    });
    if (fallbackRows.length > 0) return fallbackRows;
  }

  return [];
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function safeNum(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
}

function sumField(rows, fieldName) {
  return rows.reduce((acc, r) => {
    const v = safeNum(r.fields?.[fieldName]);
    return v !== null ? acc + v : acc;
  }, 0);
}

function avgField(rows, fieldName) {
  const vals = rows.map(r => safeNum(r.fields?.[fieldName])).filter(v => v !== null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Aggregate TY and LY metrics from rows array.
 */
export function aggregateRows(rows) {
  if (!rows || rows.length === 0) return null;

  const grossSales   = sumField(rows, FIELDS.grossSales);
  const salesBudget  = sumField(rows, FIELDS.salesBudget);
  const laborCost    = sumField(rows, FIELDS.laborCost);
  const laborHours   = sumField(rows, FIELDS.laborHours);
  const transactions = sumField(rows, FIELDS.transactions);
  const lyGrossSales = sumField(rows, FIELDS.lyGrossSales);
  const lyLaborCost  = sumField(rows, FIELDS.lyLaborCost);
  const lyLaborHours = sumField(rows, FIELDS.lyLaborHours);

  // Try average from field first, fall back to computed
  let laborPct = avgField(rows, FIELDS.laborPct);
  if (laborPct === null && grossSales > 0) {
    laborPct = (laborCost / grossSales) * 100;
  }

  let splh = avgField(rows, FIELDS.splh);
  if (splh === null && laborHours > 0) {
    splh = grossSales / laborHours;
  }

  let avgTicket = avgField(rows, FIELDS.avgTicket);
  if (avgTicket === null && transactions > 0) {
    avgTicket = grossSales / transactions;
  }

  // Food cost — check if foodCostDollar field has data
  const foodCostDollarSum = sumField(rows, FIELDS.foodCostDollar);
  const foodCostPct = (foodCostDollarSum > 0 && grossSales > 0)
    ? (foodCostDollarSum / grossSales) * 100
    : null;

  const wastePct = avgField(rows, FIELDS.wastePct);

  // LY derived fields
  let lyLaborPct = avgField(rows, FIELDS.lyLaborPct);
  if (lyLaborPct === null && lyGrossSales > 0) {
    lyLaborPct = (lyLaborCost / lyGrossSales) * 100;
  }

  let lySplh = avgField(rows, FIELDS.lySplh);
  if (lySplh === null && lyLaborHours > 0) {
    lySplh = lyGrossSales / lyLaborHours;
  }

  let lyAvgTicket = avgField(rows, FIELDS.lyAvgTicket);

  // Build date label
  const dates = rows
    .map(r => r.fields?.[FIELDS.date])
    .filter(Boolean)
    .sort();
  let dateLabel = '';
  if (dates.length === 1) {
    dateLabel = dates[0];
  } else if (dates.length > 1) {
    dateLabel = `${dates[0]} – ${dates[dates.length - 1]}`;
  }

  return {
    grossSales,
    salesBudget,
    laborCost,
    laborHours,
    transactions,
    laborPct,
    splh,
    avgTicket,
    foodCostPct,
    wastePct,
    lyGrossSales,
    lyLaborCost,
    lyLaborHours,
    lyLaborPct,
    lySplh,
    lyAvgTicket,
    dateLabel,
  };
}

// ---------------------------------------------------------------------------
// KPI color
// ---------------------------------------------------------------------------

/**
 * Returns 'green' | 'yellow' | 'red' | 'gray'
 */
export function getKpiColor(actual, target, yellow, red, higherIsBetter) {
  if (actual == null || target == null) return 'gray';

  if (higherIsBetter) {
    if (actual >= target) return 'green';
    if (yellow != null && actual >= yellow) return 'yellow';
    if (red != null && actual < red) return 'red';
    return 'yellow';
  } else {
    // lower is better
    if (actual <= target) return 'green';
    if (yellow != null && actual <= yellow) return 'yellow';
    if (red != null && actual > red) return 'red';
    return 'yellow';
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format raw value for display */
export function fmtVal(v, kpiName) {
  if (v == null || !isFinite(v)) return '—';
  switch (kpiName) {
    case KPI.SALES: {
      if (v >= 1000) {
        return `$${(v / 1000).toFixed(1)}k`;
      }
      return `$${Math.round(v).toLocaleString()}`;
    }
    case KPI.LABOR_PCT:
    case KPI.FOOD_COST:
    case KPI.WASTE:
      return `${v.toFixed(1)}%`;
    case KPI.SPLH:
    case KPI.AVG_CHECK:
      return `$${v.toFixed(2)}`;
    case 'Labor Hours':
      return `${v.toFixed(1)} hrs`;
    default:
      return v.toFixed(2);
  }
}

/** Format absolute difference for variance badge */
export function fmtDiff(absDiff, kpiName) {
  if (absDiff == null || !isFinite(absDiff)) return '—';
  const abs = Math.abs(absDiff);
  switch (kpiName) {
    case KPI.SALES: {
      if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
      return `$${Math.round(abs).toLocaleString()}`;
    }
    case KPI.LABOR_PCT:
    case KPI.FOOD_COST:
    case KPI.WASTE:
      return `${abs.toFixed(1)}%`;
    case KPI.SPLH:
    case KPI.AVG_CHECK:
      return `$${abs.toFixed(2)}`;
    default:
      return abs.toFixed(2);
  }
}

/**
 * Compute variance badge: { label, isGood, color }
 * NEVER divides — simple subtraction only.
 */
export function varianceBadge(actual, target, higherIsBetter, kpiName) {
  if (actual == null || target == null || !isFinite(actual) || !isFinite(target)) {
    return { label: '—', isGood: null, color: 'gray' };
  }

  const diff = actual - target;
  const isGood = higherIsBetter ? diff > 0 : diff < 0;
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
  const color = isGood ? 'green' : diff === 0 ? 'gray' : 'red';
  const label = diff === 0
    ? 'On target'
    : `${arrow} ${fmtDiff(Math.abs(diff), kpiName)} vs target`;

  return { label, isGood, color };
}

/**
 * Build targetsMap from KPI Targets records.
 *
 * Two record formats exist in the same table:
 *   Dollar records (Avg Check, SPLH): fields "Target Value in $",
 *     "Yellow Threshold in $", "Red Alert in $", "Higher is Better"
 *   Percentage records (Labor %, Food Cost %, Waste %, Sales): fields
 *     "Target Value", "Yellow Threshold", "Red Alert", "Name"
 *     Values are decimals (0.25 = 25%) — multiply by 100 before use.
 *
 * Detection: if "Target Value in $" key exists on the record → dollar format.
 * Name lookup: try "Metric" first, then "Name".
 */
export function buildTargetsMap(targetRecords) {
  if (!targetRecords || targetRecords.length === 0) return {};

  const map = {};

  for (const rec of targetRecords) {
    const f = rec.fields || {};

    // Identify which record this is — try "Metric" then "Name"
    const metric = f['Metric'] ?? f['Name'];
    if (!metric || typeof metric !== 'string') continue;

    const isDollar = 'Target Value in $' in f;

    if (isDollar) {
      map[metric.trim()] = {
        target:          safeNum(f['Target Value in $']),
        yellowThreshold: safeNum(f['Yellow Threshold in $']),
        redThreshold:    safeNum(f['Red Alert in $']),
        higherIsBetter:  !!f['Higher is Better'],
      };
    } else {
      // Percentage records store decimals — scale ×100
      const scale = v => { const n = safeNum(v); return isNaN(n) ? NaN : n * 100; };
      map[metric.trim()] = {
        target:          scale(f['Target Value']),
        yellowThreshold: scale(f['Yellow Threshold']),
        redThreshold:    scale(f['Red Alert']),
        higherIsBetter:  !!f['Higher is Better'],
      };
    }
  }

  return map;
}
