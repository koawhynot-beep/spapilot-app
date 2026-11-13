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
- A header that names a `FABRIC` column (any position after the first ten) brings the material with the sheet.
  Without one, fabric is filled from the master list in `fabrics.js`.
- A code another shop already stocks keeps that shop's name, style, fabric and colour on import (Quick check
  groups by style, fabric and colour, so a different spelling splits one garment across two cards). The sheet
  still decides quantity and price.
- To rebuild one shop from its sheet: Settings → Clear all stock data → pick the shop, then import.
- The screen defaults to **Rose Gold**. Always choose the correct shop (Office) before confirming.
- The backend endpoint is `POST /api/admin/import-stock`. It matches on code, so it adds and updates but
  **never deletes**. Codes missing from the sheet keep their old quantity.
- Check the preview totals against the sheet before confirming.
- Never put real stock or sales data into this public repository.

## The live app
- Live address: https://spapilot-app.onrender.com (hosted on Render; the server is the `spapilot-backend` repository).
- Shops: Goldust, Office, Rose Gold.
- Admin tools (including Import) are behind the settings (gear) icon at the top right, once logged in as admin.
- The owner logs in to the live app in Chrome. Claude cannot type passwords or access codes, so ask the owner to log in first.
- Never write the admin code or any password in this repository. It is public.
- Both repositories are on GitHub under koawhynot-beep. Pushing normally redeploys to Render; check the Render dashboard if it does not.
- Office stock comes from the workbook's ALL STOCK sheet. When asked to import, find the file in ~/Downloads (name contains "MITRA SAMADI") and verify the preview totals before confirming.
