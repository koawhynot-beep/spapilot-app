# Spa Pilot (Mitra Samadi) — notes for Claude

Two repositories: this one (`spapilot-app`, React front end) and `spapilot-backend` (Node/Express server, deployed on Render).

## Importing stock
- "Import stock" means loading **current quantities** from the shop's workbook, not sales history.
- Use the **ALL STOCK** sheet only. Columns: KODE, KODE LAMA, STYLE, FABRIC, COLOUR, SIZE, PRICE, STOCK OFFICE.
- For Office, the quantity is the STOCK OFFICE column. Treat "-" and blank as 0.
- Skip header rows, single-letter section rows (A, B, ...) and the TOTAL row.
- The Import screen (admin only) parses tab-separated text through `src/sheetparse.js`, with columns:
  kode, name, style, colour, size, price, saldo awal, brg masuk, brg keluar, saldo akhir.
  Quantity is read from saldo akhir. Name is "STYLE COLOUR SIZE". Put the stock quantity in saldo awal and
  saldo akhir, and 0 in masuk and keluar so the balance check passes.
- The screen defaults to **Rose Gold**. Always choose the correct shop (Office) before confirming.
- The backend endpoint is `POST /api/admin/import-stock`. It matches on code, so it adds and updates but
  **never deletes**. Codes missing from the sheet keep their old quantity.
- Check the preview totals against the sheet before confirming.
- Never put real stock or sales data into this public repository.
