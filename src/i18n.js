import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ── Language ──────────────────────────────────────────────
// The shop floor reads Indonesian; the owner switches to English when she is
// going through figures. Both share one dictionary so a missing translation
// falls back to the English wording rather than a blank or a raw key.

const LANG_KEY = 'mitrasamadi_lang';
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'id', label: 'Bahasa Indonesia' },
];

const EN = {
  // Navigation
  'tab.sell': 'Sell',
  'tab.stock': 'Stock',
  'tab.today': 'Today',
  'tab.overview': 'Overview',
  'tab.history': 'History',
  'scope.staff': 'staff',
  'shop.allShops': 'All shops',
  'shop.pick': 'Which shop',

  // Common
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.refresh': 'Refresh',
  'common.search': 'Search',
  'common.all': 'All',
  'common.pieces': 'pieces',
  'common.qty': 'Qty',
  'common.item': 'Item',
  'common.staff': 'Staff',
  'common.date': 'Date',
  'common.value': 'Value',
  'common.note': 'Note',
  'common.none': 'None',
  'common.showing': 'Showing',
  'common.period': 'Period',

  // Sell
  'sell.mode.sell': 'Sell',
  'sell.mode.in': 'Stock In',
  'sell.mode.out': 'Stock Out',
  'sell.mode.return': 'Return',
  'sell.hint.sell': 'Each scan sells one',
  'sell.hint.in': 'Each scan adds one to the shop',
  'sell.hint.out': 'Leaves the shop without being sold',
  'sell.hint.return': 'Customer brought it back — goes back on the rail',
  'sell.whoIsScanning': 'Who is scanning',
  'sell.pickName': 'Pick your name',
  'sell.atShop': 'At shop',
  'sell.stockingInto': 'Stocking into',
  'sell.scanOrType': 'Scan the tag, or type the code',
  'sell.typeItIn': 'Type it in',
  'sell.scanBarcode': 'Scan barcode',
  'sell.printReceipt': 'Print receipt',
  'sell.reason': 'Reason',
  'sell.manageStaff': 'Who works here',

  // Today
  'today.title': 'Sales today',
  'today.piecesSold': 'Pieces sold',
  'today.revenue': 'Taken today',
  'today.transactions': 'Transactions',
  'today.margin': 'Margin',
  'today.nothingYet': 'Nothing sold yet today',
  'today.nothingYetHint': 'Sales appear here the moment they are rung up.',

  // History
  'history.title': 'History',
  'history.window': 'Last two years',
  'history.anyStaff': 'Anyone',
  'history.searchPlaceholder': 'Search item, code, colour or staff…',
  'history.pane.log': 'Every sale',
  'history.pane.sellers': 'Best & worst',
  'history.pane.commission': 'Commission',
  'history.netPieces': 'Pieces (net)',
  'history.netRevenue': 'Revenue (net)',
  'history.transactions': 'Transactions',
  'history.exportSales': 'Export to CSV',
  'history.bestByUnits': 'Best sellers — by pieces',
  'history.bestByRevenue': 'Best sellers — by value',
  'history.worstSellers': 'Slowest sellers',
  'history.trend': 'Month by month',
  'history.nothing': 'Nothing recorded for these filters.',
  'history.showMore': 'Show more',
  'range.30d': 'Last 30 days',
  'range.90d': 'Last 90 days',
  'range.ytd': 'This year',
  'range.12m': 'Last 12 months',
  'range.all': 'Everything (2 years)',

  // Commission
  'commission.gross': 'Sold',
  'commission.returned': 'Returned',
  'commission.net': 'Net sales',
  'commission.owed': 'Commission owed',
  'commission.noRate': 'no rate set',
  'commission.sold': 'sold',
  'commission.returnedShort': 'returned',
  'commission.export': 'Export commission to CSV',
  'commission.rule':
    'Commission is a percentage of what each person sold, less anything returned. Damaged or lost stock is not deducted — no commission was earned on it.',

  // Settings
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.accessCode': 'Access code',
  'settings.enterCode': 'Enter a code to switch',
  'settings.switch': 'Switch',
  'settings.switched': 'Access changed',
  'settings.signOut': 'Sign out',
  'settings.exportBackup': 'Download a full backup',
  'settings.exportStock': 'Export stock to CSV',
  'settings.adminNote': 'Admin code — full access to stock, staff and every report.',
  'settings.staffNote': 'Staff code — sell, stock, and today at the till. Reports are not available.',
  'settings.auditLog': 'Who changed what',
  'settings.auditEmpty': 'Nothing has been changed yet.',

  // Access gate
  'gate.prompt': 'Enter the access code to continue.',
  'gate.placeholder': 'Access code',
  'gate.enter': 'Enter',
  'gate.entering': 'Entering…',
  'gate.wrong': 'That code is not right.',
  'gate.failed': 'Could not sign in.',
};

const ID = {
  'tab.sell': 'Jual',
  'tab.stock': 'Stok',
  'tab.today': 'Hari ini',
  'tab.overview': 'Ringkasan',
  'tab.history': 'Riwayat',
  'scope.staff': 'staf',
  'shop.allShops': 'Semua toko',
  'shop.pick': 'Toko mana',

  'common.cancel': 'Batal',
  'common.save': 'Simpan',
  'common.close': 'Tutup',
  'common.loading': 'Memuat…',
  'common.refresh': 'Muat ulang',
  'common.search': 'Cari',
  'common.all': 'Semua',
  'common.pieces': 'potong',
  'common.qty': 'Jumlah',
  'common.item': 'Barang',
  'common.staff': 'Staf',
  'common.date': 'Tanggal',
  'common.value': 'Nilai',
  'common.note': 'Catatan',
  'common.none': 'Tidak ada',
  'common.showing': 'Menampilkan',
  'common.period': 'Periode',

  'sell.mode.sell': 'Jual',
  'sell.mode.in': 'Stok Masuk',
  'sell.mode.out': 'Stok Keluar',
  'sell.mode.return': 'Retur',
  'sell.hint.sell': 'Setiap pindai menjual satu',
  'sell.hint.in': 'Setiap pindai menambah satu ke toko',
  'sell.hint.out': 'Keluar dari toko tanpa terjual',
  'sell.hint.return': 'Pelanggan mengembalikan — kembali ke rak',
  'sell.whoIsScanning': 'Siapa yang memindai',
  'sell.pickName': 'Pilih nama Anda',
  'sell.atShop': 'Di toko',
  'sell.stockingInto': 'Masuk ke',
  'sell.scanOrType': 'Pindai label, atau ketik kodenya',
  'sell.typeItIn': 'Ketik manual',
  'sell.scanBarcode': 'Pindai barcode',
  'sell.printReceipt': 'Cetak struk',
  'sell.reason': 'Alasan',
  'sell.manageStaff': 'Daftar staf',

  'today.title': 'Penjualan hari ini',
  'today.piecesSold': 'Potong terjual',
  'today.revenue': 'Pemasukan hari ini',
  'today.transactions': 'Transaksi',
  'today.margin': 'Margin',
  'today.nothingYet': 'Belum ada penjualan hari ini',
  'today.nothingYetHint': 'Penjualan muncul di sini begitu dicatat.',

  'history.title': 'Riwayat',
  'history.window': 'Dua tahun terakhir',
  'history.anyStaff': 'Siapa saja',
  'history.searchPlaceholder': 'Cari barang, kode, warna, atau staf…',
  'history.pane.log': 'Semua penjualan',
  'history.pane.sellers': 'Terlaris & terlambat',
  'history.pane.commission': 'Komisi',
  'history.netPieces': 'Potong (bersih)',
  'history.netRevenue': 'Pendapatan (bersih)',
  'history.transactions': 'Transaksi',
  'history.exportSales': 'Unduh CSV',
  'history.bestByUnits': 'Terlaris — per potong',
  'history.bestByRevenue': 'Terlaris — per nilai',
  'history.worstSellers': 'Paling lambat terjual',
  'history.trend': 'Per bulan',
  'history.nothing': 'Tidak ada catatan untuk filter ini.',
  'history.showMore': 'Tampilkan lagi',
  'range.30d': '30 hari terakhir',
  'range.90d': '90 hari terakhir',
  'range.ytd': 'Tahun ini',
  'range.12m': '12 bulan terakhir',
  'range.all': 'Semua (2 tahun)',

  'commission.gross': 'Terjual',
  'commission.returned': 'Dikembalikan',
  'commission.net': 'Penjualan bersih',
  'commission.owed': 'Komisi terutang',
  'commission.noRate': 'belum ada persentase',
  'commission.sold': 'terjual',
  'commission.returnedShort': 'dikembalikan',
  'commission.export': 'Unduh komisi (CSV)',
  'commission.rule':
    'Komisi adalah persentase dari penjualan setiap orang, dikurangi barang yang dikembalikan. Barang rusak atau hilang tidak dikurangi — tidak ada komisi yang diperoleh darinya.',

  'settings.title': 'Pengaturan',
  'settings.language': 'Bahasa',
  'settings.accessCode': 'Kode akses',
  'settings.enterCode': 'Masukkan kode untuk berganti',
  'settings.switch': 'Ganti',
  'settings.switched': 'Akses diganti',
  'settings.signOut': 'Keluar',
  'settings.exportBackup': 'Unduh cadangan lengkap',
  'settings.exportStock': 'Unduh stok (CSV)',
  'settings.adminNote': 'Kode admin — akses penuh ke stok, staf, dan semua laporan.',
  'settings.staffNote': 'Kode staf — jual, stok, dan kasir hari ini. Laporan tidak tersedia.',
  'settings.auditLog': 'Siapa mengubah apa',
  'settings.auditEmpty': 'Belum ada perubahan.',

  'gate.prompt': 'Masukkan kode akses untuk melanjutkan.',
  'gate.placeholder': 'Kode akses',
  'gate.enter': 'Masuk',
  'gate.entering': 'Memasuki…',
  'gate.wrong': 'Kode tersebut salah.',
  'gate.failed': 'Tidak dapat masuk.',
};

const DICTS = { en: EN, id: ID };

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return DICTS[saved] ? saved : 'en';
  });

  const setLang = useCallback((next) => {
    if (!DICTS[next]) return;
    localStorage.setItem(LANG_KEY, next);
    setLangState(next);
  }, []);

  // Falls back to English, then to the key itself, so a gap in the Indonesian
  // dictionary degrades to readable English instead of showing 'tab.sell'.
  const t = useCallback(
    (key) => DICTS[lang][key] ?? EN[key] ?? key,
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;
