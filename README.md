# SCG Ops OS — Real-Time Operations Dashboard

A single-file React dashboard that pulls live data from Airtable and displays six KPI cards with color-coded status rings, a period toggle (Daily / WTD / MTD), and a summary bar.

---

## Quick Start

### 1 — Add your Airtable token

Open `index.html` and find the `CONFIG` block near the top. Replace:

```js
AIRTABLE_TOKEN: 'YOUR_AIRTABLE_PERSONAL_ACCESS_TOKEN_HERE',
```

with your actual Personal Access Token from [airtable.com/create/tokens](https://airtable.com/create/tokens).

**Token scopes needed:** `data.records:read` on your Airtable base

> ⚠️ **Security note:** Use a scoped, read-only token limited to this one base.  
> The token will be visible in the page source. Do not use your account-level API key.

---

### 2 — Airtable table setup

#### Table 1: `Daily Sales & Labor`

One row per day. Expected column names (edit the `F` constants in `index.html` if yours differ):

| Column name        | Type               | Notes                             |
|--------------------|--------------------|-----------------------------------|
| `Date`             | Date               | YYYY-MM-DD                        |
| `Gross Sales`      | Currency / Number  | Daily revenue                     |
| `Labor Cost`       | Currency / Number  | Total labor dollars               |
| `Labor Hours`      | Number             | Total scheduled hours             |
| `Labor %`          | Number             | e.g. `24.5` = 24.5%               |
| `Food Cost %`      | Number             | e.g. `25.0` = 25.0%               |
| `Waste %`          | Number             | e.g. `1.8` = 1.8%                 |
| `SPLH`             | Number             | Sales per labor hour               |
| `Avg Check`        | Number             | Average ticket value              |
| `Transaction Count`| Number (Integer)   | Guest count / ticket count        |

> If `Labor %`, `SPLH`, or `Avg Check` are blank, the dashboard computes them from raw totals.

---

#### Table 2: `KPI Targets`

One row per KPI metric. Expected column names:

| Column name        | Type      | Notes                                                  |
|--------------------|-----------|--------------------------------------------------------|
| `Name`             | Text      | Must exactly match values below ↓                     |
| `Target`           | Number    | The performance goal                                   |
| `Yellow Threshold` | Number    | Boundary between yellow and red                        |
| `Higher is Better` | Checkbox  | ✅ for Sales, SPLH, Avg Check · unchecked for % costs  |

**Required `Name` values** (case-sensitive):

| Name          | Target example | Yellow Threshold example | Higher is Better |
|---------------|---------------|--------------------------|-----------------|
| `Sales`       | `3000`        | `2850` (95% of budget)   | ✅              |
| `Labor %`     | `25`          | `30`                     | ☐               |
| `Food Cost %` | `26`          | `30`                     | ☐               |
| `Waste %`     | `2`           | `5`                      | ☐               |
| `SPLH`        | `65`          | `60`                     | ✅              |
| `Avg Check`   | `13`          | `11.50`                  | ✅              |

**Color logic:**
- **Higher is Better:** Green ≥ Target · Yellow ≥ Yellow Threshold · Red < Yellow Threshold  
- **Lower is Better:** Green ≤ Target · Yellow ≤ Yellow Threshold · Red > Yellow Threshold

---

### 3 — Update the header (optional)

In the `CONFIG` block:

```js
BUSINESS_NAME: 'SCG',        // Left side of header
LOCATION_NAME: 'Main Location', // Center of header
```

---

### 4 — Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Under **Source**, choose your branch (e.g. `main`) and set folder to **`/ (root)`**
4. Click **Save** — your dashboard will be live at `https://<your-username>.github.io/<repo-name>/`

No build step required. The page loads React & Babel directly from CDN.

---

## Period Logic

| Period | Data range                          | Aggregation                                      |
|--------|-------------------------------------|--------------------------------------------------|
| Daily  | Most recent date with data          | Single day's values                              |
| WTD    | Monday of current week → today      | Sales & Labor Cost **summed** · rates **averaged** |
| MTD    | 1st of current month → today        | Sales & Labor Cost **summed** · rates **averaged** |

---

## Auto-Refresh

Data refreshes automatically every **5 minutes**. Click the ↻ button in the header to refresh manually.

---

## Customising Field Names

All Airtable column names are defined as constants at the top of `index.html`:

```js
const F = {
  date:         'Date',
  grossSales:   'Gross Sales',
  // ...
};

const TF = {
  name:            'Name',
  target:          'Target',
  yellowThreshold: 'Yellow Threshold',
  higherIsBetter:  'Higher is Better',
};
```

Change these strings to match your actual Airtable column names.
