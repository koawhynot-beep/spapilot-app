import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ── Language ──────────────────────────────────────────────
// The shop floor reads Indonesian; the owner switches to English when she is
// going through figures. Both share one dictionary so a missing translation
// shows the English wording rather than a blank or a raw key.

const LANG_KEY = 'mitrasamadi_lang';
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'id', label: 'Bahasa Indonesia' },
];

const EN = {
  // Navigation
  'tab.sell': 'Sell',
  'tab.transfers': 'Transfers',
  'tab.stock': 'Stock',
  'tab.overview': 'Overview',
  'tab.sales': 'Sales',
  'tab.history': 'History',
  'tab.shops': 'Setup',
  'scope.shopOnly': 'this shop only',

  // Common
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.search': 'Search',
  'common.all': 'All',
  'common.allShops': 'All shops',
  'common.wholeYear': 'Whole year',
  'common.pieces': 'pieces',
  'common.qty': 'Qty',
  'common.shop': 'Shop',
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
  'sell.mode.transfer': 'Transfer',
  'sell.hint.sell': 'Each scan sells one',
  'sell.hint.in': 'Each scan adds one to this shop',
  'sell.hint.out': 'Leaves the shop without being sold',
  'sell.hint.transfer': 'Move stock to another shop',
  'sell.whoIsScanning': 'Who is scanning',
  'sell.pickName': 'Pick your name',
  'sell.atShop': 'At shop',
  'sell.stockingInto': 'Stocking into',
  'sell.movingFrom': 'Moving from',
  'sell.movingTo': 'Moving to',
  'sell.scanOrType': 'Scan the tag, or type the code',
  'sell.typeItIn': 'Type it in',
  'sell.scanBarcode': 'Scan barcode',
  'sell.printReceipt': 'Print receipt',
  'sell.reason': 'Reason',
  'sell.manageStaff': 'Who works here',

  // Transfers
  'transfers.title': 'Transfers',
  'transfers.incoming': 'Coming to you',
  'transfers.outgoing': 'Sent by you',
  'transfers.allTransfers': 'All transfers',
  'transfers.pending': 'Waiting to be checked',
  'transfers.approved': 'Approved',
  'transfers.rejected': 'Rejected',
  'transfers.approve': 'Approve',
  'transfers.reject': 'Reject',
  'transfers.checkFirst': 'Count the pieces before you approve. Stock only moves onto your shelf once you do.',
  'transfers.noneIncoming': 'Nothing on its way to you.',
  'transfers.noneOutgoing': 'You have not sent anything.',
  'transfers.sentBy': 'Sent by',
  'transfers.decidedBy': 'Checked by',
  'transfers.howManyArrived': 'How many actually arrived?',
  'transfers.of': 'of',
  'transfers.sent': 'sent',
  'transfers.received': 'received',
  'transfers.inTransit': 'In transit',
  'transfers.approveConfirm': 'Approve this delivery?',
  'transfers.rejectConfirm': 'Reject this delivery? The stock goes back to the sender.',
  'transfers.whoIsChecking': 'Who is checking this',

  // Settings
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.accessCode': 'Access code',
  'settings.enterCode': 'Enter a code to switch',
  'settings.switch': 'Switch',
  'settings.switched': 'Access changed',
  'settings.signOut': 'Sign out',
  'settings.exportBackup': 'Export a backup of all data',
  'settings.shopKeyNote': 'This code works for this shop only.',
  'settings.masterNote': 'This code opens every shop and the office.',

  // History
  'history.title': 'History',
  'history.staffAndCommission': 'Staff & commission',
  'history.everything': 'Everything that happened',
  'history.lastThreeYears': 'Last three years',
  'history.filterType': 'What happened',
  'history.filterStaff': 'Who did it',
  'history.type.sale': 'Sold',
  'history.type.in': 'Stocked in',
  'history.type.out': 'Taken out',
  'history.type.adjust': 'Adjusted',
  'history.type.transferIn': 'Received',
  'history.type.transferOut': 'Sent out',
  'history.nothing': 'Nothing recorded for these filters.',
  'history.showMore': 'Show more',
  'history.piecesSold': 'Pieces sold',
  'history.salesValue': 'Sales value',
  'history.commissionOwed': 'Commission owed',
  'history.movements': 'Stock movements',

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
  'tab.transfers': 'Transfer',
  'tab.stock': 'Stok',
  'tab.overview': 'Ringkasan',
  'tab.sales': 'Penjualan',
  'tab.history': 'Riwayat',
  'tab.shops': 'Pengaturan',
  'scope.shopOnly': 'toko ini saja',

  'common.cancel': 'Batal',
  'common.save': 'Simpan',
  'common.close': 'Tutup',
  'common.loading': 'Memuat…',
  'common.search': 'Cari',
  'common.all': 'Semua',
  'common.allShops': 'Semua toko',
  'common.wholeYear': 'Satu tahun',
  'common.pieces': 'potong',
  'common.qty': 'Jumlah',
  'common.shop': 'Toko',
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
  'sell.mode.transfer': 'Transfer',
  'sell.hint.sell': 'Setiap pindai menjual satu',
  'sell.hint.in': 'Setiap pindai menambah satu ke toko ini',
  'sell.hint.out': 'Keluar dari toko tanpa terjual',
  'sell.hint.transfer': 'Pindahkan stok ke toko lain',
  'sell.whoIsScanning': 'Siapa yang memindai',
  'sell.pickName': 'Pilih nama Anda',
  'sell.atShop': 'Di toko',
  'sell.stockingInto': 'Masuk ke',
  'sell.movingFrom': 'Dipindahkan dari',
  'sell.movingTo': 'Dipindahkan ke',
  'sell.scanOrType': 'Pindai label, atau ketik kodenya',
  'sell.typeItIn': 'Ketik manual',
  'sell.scanBarcode': 'Pindai barcode',
  'sell.printReceipt': 'Cetak struk',
  'sell.reason': 'Alasan',
  'sell.manageStaff': 'Daftar staf',

  'transfers.title': 'Transfer',
  'transfers.incoming': 'Menuju ke Anda',
  'transfers.outgoing': 'Anda kirim',
  'transfers.allTransfers': 'Semua transfer',
  'transfers.pending': 'Menunggu diperiksa',
  'transfers.approved': 'Disetujui',
  'transfers.rejected': 'Ditolak',
  'transfers.approve': 'Setujui',
  'transfers.reject': 'Tolak',
  'transfers.checkFirst': 'Hitung barangnya sebelum menyetujui. Stok baru masuk ke toko Anda setelah disetujui.',
  'transfers.noneIncoming': 'Tidak ada kiriman menuju ke Anda.',
  'transfers.noneOutgoing': 'Anda belum mengirim apa pun.',
  'transfers.sentBy': 'Dikirim oleh',
  'transfers.decidedBy': 'Diperiksa oleh',
  'transfers.howManyArrived': 'Berapa yang benar-benar sampai?',
  'transfers.of': 'dari',
  'transfers.sent': 'dikirim',
  'transfers.received': 'diterima',
  'transfers.inTransit': 'Dalam perjalanan',
  'transfers.approveConfirm': 'Setujui kiriman ini?',
  'transfers.rejectConfirm': 'Tolak kiriman ini? Stok akan kembali ke pengirim.',
  'transfers.whoIsChecking': 'Siapa yang memeriksa',

  'settings.title': 'Pengaturan',
  'settings.language': 'Bahasa',
  'settings.accessCode': 'Kode akses',
  'settings.enterCode': 'Masukkan kode untuk berganti',
  'settings.switch': 'Ganti',
  'settings.switched': 'Akses diganti',
  'settings.signOut': 'Keluar',
  'settings.exportBackup': 'Unduh cadangan semua data',
  'settings.shopKeyNote': 'Kode ini hanya berlaku untuk toko ini.',
  'settings.masterNote': 'Kode ini membuka semua toko dan kantor.',

  'history.title': 'Riwayat',
  'history.staffAndCommission': 'Staf & komisi',
  'history.everything': 'Semua yang terjadi',
  'history.lastThreeYears': 'Tiga tahun terakhir',
  'history.filterType': 'Jenis kegiatan',
  'history.filterStaff': 'Siapa pelakunya',
  'history.type.sale': 'Terjual',
  'history.type.in': 'Stok masuk',
  'history.type.out': 'Dikeluarkan',
  'history.type.adjust': 'Penyesuaian',
  'history.type.transferIn': 'Diterima',
  'history.type.transferOut': 'Dikirim',
  'history.nothing': 'Tidak ada catatan untuk filter ini.',
  'history.showMore': 'Tampilkan lagi',
  'history.piecesSold': 'Potong terjual',
  'history.salesValue': 'Nilai penjualan',
  'history.commissionOwed': 'Komisi terutang',
  'history.movements': 'Pergerakan stok',

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
