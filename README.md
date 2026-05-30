# IBI Wholesale Price Generator

A single-file web app to scan supplier tax invoices / handwritten notes, apportion transport + packing cost, and compute the **Wholesale (Landed) Price per unit** — saved to your IBI ERP Google Sheet.

**Brand:** cyan `#00c5ff` on black, Roboto, IBI dot-grid logo, light/dark toggle.
**Version:** `v2.3` (shown top-left). Use `v2.x` for patches, `v3` for big features.

## What's new
- **v2.3 — Pick what gets saved.** In the results, each individual product has an **Include in save** checkbox, with **Include all / Exclude all** shortcuts. Unticked products are excluded from the summary save (and the Sheet/ERP) but still remain available as combo components — so you can keep just the combo, or the combo plus a few chosen products.
- **v2.2 — Manual-only combos.** Clicking "Create Combo" starts a completely **empty** combo with nothing pre-selected. A combo is counted only once you've selected at least two products.
- **v2.1 — PDF upload.** Upload an image **or a PDF** (single or multi-page). Images can be cropped first; PDFs are sent directly to the AI for the most accurate reading of clean digital invoices. A page-1 preview is shown.
- **v2.0 — Packing cost absorption.** Mark any line as **Packing** (the AI auto-flags boxes/cartons). Its full landed cost (incl. GST + its transport share) is spread across the actual product units and folded into every WSP/unit. Choose *equally per unit* or *equally per product line*.
- **v2.0 — Product clubbing (combos).** Combine two or more products sold together (e.g. **Uruli 17 + SUPLATE lid**) into one SKU. The combined WSP/unit = sum of each component's per-unit landed cost (already including packing + transport) × units-per-combo. Shows how many combos you can make.

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
1. **Scan / Upload** an invoice — photo, image, or **PDF** (multi-page OK). Crop images if needed; PDFs are read directly. Then **Extract with AI**.
2. **Review & correct** the line items. Set each row's **Role** to *Product* or *Packing* (description is saved exactly as typed).
3. *(Optional)* **Combine** products into a single SKU under "Create Combo" — you pick each component manually (nothing is preset).
4. Enter **Total Transportation Charges**, pick the transport split + packing-distribution methods, optional margin → **Calculate WSP per Unit**.
5. In the results, **tick which individual products to keep** (or use Include all / Exclude all). Combos are always saved; excluded products are skipped.
6. **Save to Google Sheet & ERP**. Every save also stores up to **24 items** in local memory (with a **Clear All** button).

### Landed cost logic
- Line cost is computed **including GST**, handling both invoice styles (amount already incl. GST, or amount = taxable value with GST added separately — toggle per row).
- Transport is apportioned across **all lines** (incl. packing) by value (default), quantity, or equally.
- Lines marked **Packing** are not sold standalone; their full landed cost is redistributed across product units.
- `Product WSP/unit = (line cost incl GST + transport share)/qty + packing share/unit`.
- `Combo WSP/unit = Σ component WSP/unit × units-per-combo`.

### Saved columns
Entry Date & Time (e.g. `28 May 2026, Thursday, 01:38:00 PM`), Type (Product/Combo), Description, Combo Components, HSN, Total Quantity, Landed Cost/Unit, Packing/Unit, plus Unit Price, GST %, Taxable Value, Line Cost, Transport Share, Total Landed, Margin %, Suggested Sell/Unit, Supplier, Invoice No/Date, Transport Method/Total, Batch ID, Source, Server Time.

> **Upgrading from v1.0:** the sheet column layout changed (added Type, Combo Components, Packing/Unit). If you already created the `WSP_Generator` / `Wholesale Prices` tabs with the old layout, delete those two tabs once (they'll be re-created with the new headers on the next save), then re-deploy the script.
