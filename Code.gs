/*************************************************************
 * IBI WHOLESALE PRICE GENERATOR — Google Apps Script backend
 *
 * Writes to TWO spreadsheets:
 *  A) IBI WHOLESALE PRICE GENERATOR sheet (primary store):
 *        "WSP_Generator"   -> append-only log of every entry
 *        "Wholesale Prices"-> master table (latest WSP per product/combo)
 *  B) IBI ERP sheet:
 *        "Wholesale Prices"-> same master, upserted (the ERP WSP section)
 *
 * SETUP
 * 1. Open your IBI WHOLESALE PRICE GENERATOR spreadsheet > Extensions > Apps Script.
 *    (Pasting it INSIDE that sheet lets you leave WSP_SHEET_ID blank.)
 * 2. Paste this whole file. Fill in WSP_SHEET_ID below if needed. Save.
 * 3. Deploy > New deployment > type "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 4. Copy the /exec URL into the app's Settings.
 * 5. First save auto-creates the tabs + headers in both sheets.
 *************************************************************/

/* ===== DESTINATION SPREADSHEETS ===== */

// A) The IBI WHOLESALE PRICE GENERATOR spreadsheet (primary, full detail).
//    Get the ID from its URL:  docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit
//    Leave as '' ONLY if you pasted this script INSIDE that spreadsheet.
const WSP_SHEET_ID = 'PASTE_WSP_GENERATOR_SHEET_ID_HERE';

// B) The IBI ERP spreadsheet — its "Wholesale Prices" section is also updated.
//    Set to '' to skip writing to the ERP.
const ERP_SHEET_ID = '1Iz5sl_-ZBgW4WmIp20vaBzkxqciZVshkedjKZxV_LaI';

const LOG_TAB    = 'WSP_Generator';
const MASTER_TAB = 'Wholesale Prices';   // <-- must match the tab your ERP reads
const TZ         = 'Asia/Kolkata';

const LOG_HEADERS = [
  'Entry Date & Time','Type','Description of Good','Combo Components','HSN Code','Total Quantity',
  'Landed Cost / Unit (incl. transport+packing)','Packing / Unit','Unit Price (rate)','GST %',
  'Taxable Value','Line Cost (incl GST)','Transport Share','Total Landed',
  'Margin %','Suggested Sell / Unit','Supplier','Invoice No','Invoice Date',
  'Transport Method','Transport Total','Batch ID','Source','Server Time'
];

// Master table the ERP reads. Keyed by Type + Description + HSN, upserted each save.
const MASTER_HEADERS = [
  'Description of Good','Type','Combo Components','HSN Code','WSP / Unit (Landed)','Packing / Unit',
  'Suggested Sell / Unit','Last Qty','Last GST %','Last Supplier','Last Invoice No','Last Updated','Source'
];

function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || 'save';

    if(action === 'ping'){
      const wsp = openWsp_();
      const erp = openErp_();
      return json({status:'success', message:'IBI WSP backend online.',
        wsp_sheet: wsp.getName(), erp_sheet: erp ? erp.getName() : '(not set)'});
    }

    if(action === 'save'){
      const rows = body.rows || [];
      if(!rows.length) return json({status:'error', message:'No rows received.'});

      const serverTime = Utilities.formatDate(new Date(), TZ, 'dd MMM yyyy, EEEE, hh:mm:ss a');
      const logRows = rows.map(r => ([
        r.entry_stamp, r.type, r.description, r.components, r.hsn, r.total_quantity,
        r.landed_cost_per_unit, r.packing_per_unit, r.unit_price, r.gst_percent,
        r.taxable_value, r.line_cost_incl_gst, r.transport_share, r.total_landed,
        r.margin_percent, r.suggested_sell_per_unit, r.supplier, r.invoice_no,
        r.invoice_date, r.transport_method, r.transport_total, r.batch_id, r.source, serverTime
      ]));

      // A) WSP Generator sheet: full log + master
      const wsp = openWsp_();
      const wLog    = getOrCreate(wsp, LOG_TAB, LOG_HEADERS);
      const wMaster = getOrCreate(wsp, MASTER_TAB, MASTER_HEADERS);
      wLog.getRange(wLog.getLastRow()+1, 1, logRows.length, LOG_HEADERS.length).setValues(logRows);
      rows.forEach(r => upsertMaster(wMaster, r, r.entry_stamp));

      // B) ERP sheet: Wholesale Prices master upsert (the WSP section)
      const erp = openErp_();
      let erpName = '(skipped)';
      if(erp){
        const eMaster = getOrCreate(erp, MASTER_TAB, MASTER_HEADERS);
        rows.forEach(r => upsertMaster(eMaster, r, r.entry_stamp));
        erpName = erp.getName();
      }

      return json({status:'success', count: rows.length,
        wsp_sheet: wsp.getName(), erp_sheet: erpName});
    }

    return json({status:'error', message:'Unknown action: ' + action});
  }catch(err){
    return json({status:'error', message: String(err)});
  }
}

function doGet(){
  return json({status:'success', message:'IBI WSP Generator backend is live. Use POST.'});
}

/* ---------- spreadsheet resolvers ---------- */
function wspId_(){ return (WSP_SHEET_ID && WSP_SHEET_ID.indexOf('PASTE') < 0) ? WSP_SHEET_ID : ''; }

function openWsp_(){
  const id = wspId_();
  if(id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if(!active) throw new Error('Set WSP_SHEET_ID at the top of the script to your IBI Wholesale Price Generator sheet ID (from its URL).');
  return active;
}

function openErp_(){
  if(!ERP_SHEET_ID) return null;
  if(ERP_SHEET_ID === wspId_()) return null;        // same sheet -> don't double-write
  return SpreadsheetApp.openById(ERP_SHEET_ID);
}

/* ---------- helpers ---------- */
function getOrCreate(ss, name, headers){
  let sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#000000').setFontColor('#00c5ff');
    sh.setFrozenRows(1);
  } else if(sh.getLastRow() === 0){
    sh.getRange(1,1,1,headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#000000').setFontColor('#00c5ff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function upsertMaster(sh, r, when){
  const key = norm(r.type) + '|' + norm(r.description) + '|' + norm(r.hsn);
  const last = sh.getLastRow();
  const rowVals = [
    r.description, r.type, r.components, r.hsn, r.landed_cost_per_unit, r.packing_per_unit,
    r.suggested_sell_per_unit, r.total_quantity, r.gst_percent, r.supplier, r.invoice_no, when, r.source
  ];
  if(last >= 2){
    const data = sh.getRange(2,1,last-1,4).getValues(); // desc, type, components, hsn
    for(let i=0;i<data.length;i++){
      if(norm(data[i][1]) + '|' + norm(data[i][0]) + '|' + norm(data[i][3]) === key){
        sh.getRange(i+2,1,1,MASTER_HEADERS.length).setValues([rowVals]);
        return;
      }
    }
  }
  sh.getRange(last+1,1,1,MASTER_HEADERS.length).setValues([rowVals]);
}

function norm(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,' '); }

function json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
