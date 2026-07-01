# IBI Wholesale Price Generator

A single-file web app to scan supplier tax invoices / handwritten notes, apportion transport + packing cost, and compute the **Wholesale (Landed) Price per unit** — saved to your IBI ERP Google Sheet.

**Brand:** cyan `#00c5ff` on black, Roboto, IBI dot-grid logo, light/dark toggle.
**Version:** `v2.10` (shown top-left). Use `v2.x` for patches, `v3` for big features.

## What's new
- **v2.10 — View the Google Sheet in-app.** A new **📊 Google Sheet** card shows **Open Wholesale Sheet** / **Open ERP Sheet** buttons and an optional inline read-only preview. The link auto-detects from **Test Sheet Connection** (the backend now returns the sheet URLs), or paste it manually under Settings → *Google Sheet link*. Auto-detect needs the updated `Code.gs` redeployed; the manual link works immediately.
- **v2.9 — GST / Input Tax Credit (ITC) mode.** Landed cost now **excludes GST by default**, treating the tax as recoverable Input Tax Credit (the correct basis for a GST-registered business) — so a bucket billed at ₹290 + 5% lands at its **net** cost, not ₹290 × 1.05. Switch to **Include GST in landed cost** (Settings → default, or per-calculation in step 3) if you don't reclaim purchase GST. The totals strip shows the **GST reclaimed (ITC)** so it reconciles against the invoice's tax. The per-row **Incl. GST?** toggle now only states whether the printed *Amount* already includes tax (so GST is stripped/added correctly), independent of the cost basis.
- **v2.8 — Calendar date picker.** The Invoice / Purchase Date is now chosen from a calendar (no manual typing). AI-extracted dates auto-fill the picker; the sheet still stores DD-MM-YYYY.
- **v2.7 — Delete memory items individually.** Each stored item in Local Memory has a **×** to remove just that one, in addition to **Clear All**.
- **v2.5 — Rename individual products.** Each individual product in the results has an optional **Rename** field; the custom name is used in the summary/Sheet/ERP while the invoice description stays untouched in the items table.
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
The script writes to **two** spreadsheets:
- **IBI Wholesale Price Generator** sheet (primary) — full log (`WSP_Generator`) + master (`Wholesale Prices`).
- **IBI ERP** sheet — the `Wholesale Prices` section is upserted (kept in sync).

Steps:
1. Open your **IBI Wholesale Price Generator** spreadsheet → **Extensions → Apps Script**.
2. Paste all of `Code.gs`.
3. At the top, set `WSP_SHEET_ID` to that spreadsheet's ID (from its URL `…/spreadsheets/d/<ID>/edit`). *If you pasted the script inside that same sheet, you may leave `WSP_SHEET_ID` blank and it will use the current sheet.* `ERP_SHEET_ID` is already set to your ERP.
4. Save → **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the `…/exec` URL.

Tabs auto-create on first save. Use **Test Sheet Connection** in the app's Settings — it now reports both target sheet names so you can confirm the WSP Generator sheet is wired up.

## 2. Get a Gemini API key (for invoice reading)
Free key from **https://aistudio.google.com/apikey**. The app calls Gemini directly from your browser; the key is stored only on your device.

## 3. Host on GitHub Pages
Push `index.html` to your repo → **Settings → Pages** → deploy from branch.

## 4. First run
Open the app → **Settings**: paste the Gemini key and the Apps Script `/exec` URL → **Save Settings** → **Test Sheet Connection**.

---

## How to use
1. **Scan / Upload** an invoice — photo, image, or **PDF** (multi-page OK) — then **Extract with AI**. Or click **Enter Manually (No Bill)** to fill the grid yourself for local purchases.
2. **Review & correct** the line items. Set each row's **Role** to *Product* or *Packing* (description is saved exactly as typed).
3. *(Optional)* **Combine** products into a single SKU under "Create Combo" — you pick each component manually (nothing is preset).
4. Enter **Total Transportation Charges**, pick the transport split + packing-distribution methods, optional margin → **Calculate WSP per Unit**.
5. In the results, **tick which individual products to keep** (or use Include all / Exclude all). Combos are always saved; excluded products are skipped.
6. **Save to Google Sheet & ERP**. Every save also stores up to **24 items** in local memory (with a **Clear All** button).

### Landed cost logic
- **GST treatment (v2.9):** the cost basis is **GST-excluded by default** — the tax is treated as recoverable **Input Tax Credit (ITC)**. Set **Include GST in landed cost** (Settings default, or per-calculation in step 3) if you do not reclaim purchase GST.
- The per-row **Incl. GST?** toggle only states whether the printed *Amount* already includes tax, so GST is **stripped** (when excluding) or **added** (when including) correctly. It handles both invoice styles (amount already incl. GST, or amount = taxable value with GST in a separate summary).
- Transport is apportioned across **all lines** (incl. packing) by value (default), quantity, or equally.
- Lines marked **Packing** are not sold standalone; their full landed cost is redistributed across product units.
- `Product WSP/unit = (line cost + transport share)/qty + packing share/unit`, where *line cost* = the net (ITC) value or the GST-inclusive value per the chosen mode.
- `Combo WSP/unit = Σ component WSP/unit × units-per-combo`.

### Saved columns
Entry Date & Time (e.g. `28 May 2026, Thursday, 01:38:00 PM`), Type (Product/Combo), Description, Combo Components, HSN, Total Quantity, Landed Cost/Unit, Packing/Unit, plus Unit Price, GST %, Taxable Value, Line Cost, Transport Share, Total Landed, Margin %, Suggested Sell/Unit, Supplier, Invoice No/Date, Transport Method/Total, Batch ID, Source, Server Time.

> **Upgrading from v1.0:** the sheet column layout changed (added Type, Combo Components, Packing/Unit). If you already created the `WSP_Generator` / `Wholesale Prices` tabs with the old layout, delete those two tabs once (they'll be re-created with the new headers on the next save), then re-deploy the script.
