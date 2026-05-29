# IBI Wholesale Price Generator

A single-file web app to scan supplier tax invoices / handwritten notes, apportion transport cost, and compute the **Wholesale (Landed) Price per unit** — saved to your IBI ERP Google Sheet.

**Brand:** cyan `#00c5ff` on black, Roboto, IBI dot-grid logo, light/dark toggle.
**Version:** `v1.0` (shown top-left). Use `v2.1` for patches, `v3` for big features.

---

## Files
- `index.html` — the whole app. Host this on GitHub Pages.
- `Code.gs` — Google Apps Script backend that writes into the ERP sheet.

---

## 1. Set up the Google Sheet backend (`Code.gs`)
1. Open your IBI ERP spreadsheet → **Extensions → Apps Script**.
2. Paste all of `Code.gs`. Save.
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the `…/exec` URL.

It auto-creates two tabs on first save:
- **WSP_Generator** — full append-only log of every entry.
- **Wholesale Prices** — master table the ERP reads (latest WSP per product, upserted by Description + HSN). If your ERP's Wholesale Price section reads a differently-named tab, change `MASTER_TAB` at the top of `Code.gs`.

The sheet ID is already set to your ERP: `1Iz5sl_-ZBgW4WmIp20vaBzkxqciZVshkedjKZxV_LaI`.

## 2. Get a Gemini API key (for invoice reading)
Free key from **https://aistudio.google.com/apikey**. The app calls Gemini directly from your browser; the key is stored only on your device.

## 3. Host on GitHub Pages
Push `index.html` to your repo → **Settings → Pages** → deploy from branch.

## 4. First run
Open the app → **Settings**: paste the Gemini key and the Apps Script `/exec` URL → **Save Settings** → **Test Sheet Connection**.

---

## How to use
1. **Scan / Upload** an invoice → crop → **Extract with AI**.
2. **Review & correct** the line items (description is saved exactly as typed).
3. Enter **Total Transportation Charges**, pick a split method, optional margin → **Calculate WSP per Unit**.
4. **Save to Google Sheet & ERP**. Every save also stores up to **24 items** in local memory (with a **Clear All** button).

### Landed cost logic
- Line cost is computed **including GST**, handling both invoice styles (amount already incl. GST, or amount = taxable value with GST added separately — toggle per row).
- Transport is apportioned **by value** (default), **by quantity**, or **equally**.
- `WSP / unit = (line cost incl GST + transport share) ÷ quantity`.

### Saved columns
Entry Date & Time (e.g. `28 May 2026, Thursday, 01:38:00 PM`), Description, HSN, Total Quantity, Landed Cost/Unit, plus Unit Price, GST %, Taxable Value, Line Cost, Transport Share, Total Landed, Margin %, Suggested Sell/Unit, Supplier, Invoice No/Date, Transport Method/Total, Batch ID, Source, Server Time.
