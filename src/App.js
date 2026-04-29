import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import {
  Calendar, Users, Package, LayoutDashboard, AlertTriangle,
  CheckCircle, RefreshCw, Bell, User, ShieldCheck, Send, Home, Inbox,
  Plus, Trash2, Edit2, X, LogOut, Megaphone, Heart, PhoneCall, CalendarOff,
  Repeat, Leaf, Sparkles, Gem, Check, Lock, Flower2, Dumbbell, UtensilsCrossed,
  Scissors, Building2, Mail, Search, Download, Globe,
} from 'lucide-react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'opus_token';
const LANG_KEY = 'opus_lang';
const BRAND = 'Opus';

// ---------- i18n ----------
const TRANSLATIONS = {
  en: {
    welcomeBack: 'Welcome back.', createWorkspace: 'Create your workspace.',
    signIn: 'Sign in', createAccount: 'Create account', signOut: 'Sign out',
    email: 'Email', password: 'Password', confirmPassword: 'Confirm password',
    emailRequired: 'Email and password required', passwordsDontMatch: 'Passwords do not match',
    passwordTooShort: 'Password must be 6+ characters', pleaseWait: 'Please wait…',
    demoAccount: 'Demo account:', emailPlaceholder: 'you@example.com',
    pwSignup: 'At least 6 characters', pwLogin: 'Your password',
    pickBusiness: 'pick your business type.', soon: 'Soon',
    spaWellness: 'Spa & Wellness', spaSub: 'Massage, facials, treatment rooms',
    salon: 'Salon', gym: 'Gym & Fitness', restaurant: 'Restaurant', retail: 'Retail / Other',
    comingSoon: 'Coming soon',
    oneLast: 'One last step — who are you?',
    manager: 'Manager', staff: 'Staff', owner: 'Owner', managerSub: 'Run the day, manage the team',
    staffSub: 'Your shifts, your guests', whichMember: 'Which team member are you?',
    back: 'Back', continue: 'Continue', saving: 'Saving…',
    switch: 'Switch', loading: 'Loading…', retry: 'Retry',
    home: 'Home', schedule: 'Schedule', stock: 'Stock', alerts: 'Alerts',
    sop: 'SOP', send: 'Send', today: 'Today', inbox: 'Inbox', profile: 'Profile',
    add: 'Add', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel',
    approve: 'Approve', decline: 'Decline', remove: 'Remove', reload: 'Reload',
    todaysBookings: "Today's Bookings", activeStaff: 'Active Staff', lowStock: 'Low Stock',
    pendingRequest: 'pending request', pendingRequests: 'pending requests', review: 'Review',
    upcomingBookings: 'Upcoming Bookings', viewAll: 'View all',
    todaysChecklist: "Today's Checklist", latestAnnouncement: 'Latest Announcement',
    manage: 'Manage', noAnnouncements: 'No announcements yet.',
    recentSopNotes: 'Recent SOP Notes', sopViolation: 'SOP violation logged',
    todaysSchedule: "Today's Schedule", noBookings: 'No bookings today.', weekOverview: 'Week Overview',
    deleteBooking: 'Delete this booking?', bookingDeleted: 'Booking deleted',
    bookingAdded: 'Booking added', bookingUpdated: 'Booking updated',
    couldNotDeleteBooking: 'Could not delete booking',
    newBooking: 'New Booking', editBooking: 'Edit Booking',
    client: 'Client', treatment: 'Treatment', time: 'Time', durationMin: 'Duration (min)',
    therapist: 'Therapist', notes: 'Notes',
    teamMembers: 'Team Members', noTeamYet: 'No team members yet.',
    removeStaff: 'Remove this staff member?', staffRemoved: 'Staff removed',
    staffAdded: 'Staff added', staffUpdated: 'Staff updated',
    couldNotRemoveStaff: 'Could not remove staff',
    sopNotes: 'SOP notes', sopNote: 'SOP note',
    addTeamMember: 'Add Team Member', editTeamMember: 'Edit Team Member',
    name: 'Name', role: 'Role', birthday: 'Birthday', avatarColor: 'Avatar color',
    workingDays: 'Working days',
    inventory: 'Inventory', noItemsYet: 'No items yet.',
    removeItem: 'Remove this item?', itemRemoved: 'Item removed',
    itemAdded: 'Item added', itemUpdated: 'Item updated', markedOrdered: 'Marked as ordered',
    couldNotUpdateStock: 'Could not update stock',
    couldNotMarkOrdered: 'Could not mark ordered', couldNotRemoveItem: 'Could not remove item',
    decrease: 'decrease', increase: 'increase', ordered: 'Ordered',
    low: 'Low', addItem: 'Add Item', editItem: 'Edit Item',
    category: 'Category', stockLevel: 'Stock', threshold: 'Threshold', unit: 'Unit', supplier: 'Supplier',
    sopTitle: 'Standard Operating Procedures',
    logSopViolation: 'Log SOP Violation', log: 'Log',
    noViolations: 'No violations logged.', repeatOffenders: 'Repeat Offenders',
    notes_n: 'notes', notes_1: 'note',
    removeViolation: 'Remove this violation note?', noteRemoved: 'Note removed',
    couldNotRemoveNote: 'Could not remove note', violationLogged: 'Violation logged',
    logViolation: 'Log Violation', staffPerson: 'Staff', sopRule: 'SOP', noteText: 'Note',
    stockAlerts: 'Stock Alerts', allStockHealthy: 'All stock healthy',
    staffRequests: 'Staff Requests', noPendingReq: 'No pending requests',
    reorder: 'Reorder',
    sickCall: 'Sick Call', dayOff: 'Day Off', shiftSwap: 'Shift Swap',
    noReason: 'No reason given',
    bookingNeedReassign1: 'booking needs reassigning.',
    bookingNeedReassign: 'bookings need reassigning.',
    approveReassign: 'Approve & Reassign',
    requestApproved: 'Request approved', requestDeclined: 'Request declined',
    couldNotUpdateRequest: 'Could not update request',
    reassignBookings: 'Reassign Bookings', assignBookingsTo: "Assign this staffer's bookings on",
    to: 'to:',
    announcements: 'Announcements', nothingSent: 'Nothing sent yet.',
    deleteAnnouncement: 'Delete announcement?', deleted: 'Deleted',
    couldNotDeleteAnnouncement: 'Could not delete announcement',
    announcementSent: 'Announcement sent',
    newAnnouncement: 'New Announcement', title: 'Title', message: 'Message', from: 'From',
    sending: 'Sending…',
    goodMorning: 'Good morning', sessionsToday: 'sessions today',
    myWeek: 'My Week', on: 'On', off: 'Off', todaysSessions: "Today's Sessions",
    noSessionsToday: 'No sessions today.', noSessions: 'No sessions scheduled.',
    theTeam: 'The Team',
    quickActions: 'Quick Actions', sick: 'Sick', dayOffShort: 'Day off', swap: 'Swap',
    complaintsToLearn: 'Complaints to Learn From', myRequests: 'My Requests',
    noRequestsSubmitted: 'No requests submitted.',
    requestSubmitted: 'Request submitted', couldNotSubmitRequest: 'Could not submit request',
    callInSick: 'Call in Sick', requestDayOff: 'Request Day Off', requestSwap: 'Request Shift Swap',
    date: 'Date', swapWith: 'Swap with', selectColleague: 'Select colleague',
    theirDay: 'Their day', reason: 'Reason', noteOptional: 'Note (optional)', submit: 'Submit',
    daysWeek: 'Days / week', mySopNotes: 'My SOP Notes', cleanRecord: 'Clean record — well done.',
    selectStaff: 'Select team member',
    search: 'Search', sortBy: 'Sort by', filterCategory: 'Filter category', allCategories: 'All',
    timeAsc: 'Time ↑', timeDesc: 'Time ↓', exportCsv: 'Export CSV',
    language: 'Language', english: 'English', indonesian: 'Bahasa',
    failed: 'Failed', noResults: 'No results.',
    active: 'Active', leftLabel: 'left · threshold',
    todaySopReminder: "Today's SOP Reminder", yourSessions: 'Your Sessions',
    noteLabel: 'Note:', birthdayLabel: 'Birthday:',
    teamSize: 'Team Size', sopNotesStat: 'SOP Notes',
    snapshot: 'Snapshot', lowStockItems: 'Low stock items', flagged: 'flagged',
    pendingRequestsSnap: 'Pending requests', announcementsSent: 'Announcements sent',
    team: 'Team', sessionsTodayStat: 'Sessions today',
    loadingProfile: 'Loading profile…',
    checklistOpen: 'Unlock reception & diffuse oils',
    checklistBrief: 'Morning team briefing',
    checklistInventory: 'Check low-stock items',
    checklistWrapup: 'End-of-day reconciliation',
    quickActionsBar: 'Quick Actions', reorderAll: 'Reorder all low stock',
    reviewRequests: 'Review sick calls', broadcast: 'Broadcast message',
    reorderAllDone: 'Reorder placed for all low-stock items',
    noLowStock: 'Nothing to reorder',
    callOutSick: 'Call out sick today', sickCallToday: 'Sick call submitted for today',
    allergies: 'Allergies', clientPhone: 'Client phone',
    price: 'Price (IDR)', staffPhone: 'Staff phone', whatsapp: 'WhatsApp',
    undo: 'Undo', restored: 'Restored',
    thisWeek: 'This Week', revenue: 'Revenue', completed: 'Completed',
    avgPerDay: 'Avg / day', topTherapist: 'Top Therapist',
    commission: 'Commission', commissionRate: 'Commission rate (%)',
    estEarnings: 'Est. earnings', deferred: 'Coming soon',
    friction: 'Notes for your team:', waMsg: "Hi, it's the spa — quick check-in.",
    days: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
  },
  id: {
    welcomeBack: 'Selamat datang kembali.', createWorkspace: 'Buat ruang kerja Anda.',
    signIn: 'Masuk', createAccount: 'Daftar', signOut: 'Keluar',
    email: 'Email', password: 'Kata sandi', confirmPassword: 'Konfirmasi kata sandi',
    emailRequired: 'Email dan kata sandi wajib diisi', passwordsDontMatch: 'Kata sandi tidak cocok',
    passwordTooShort: 'Kata sandi minimal 6 karakter', pleaseWait: 'Mohon tunggu…',
    demoAccount: 'Akun demo:', emailPlaceholder: 'anda@contoh.com',
    pwSignup: 'Minimal 6 karakter', pwLogin: 'Kata sandi Anda',
    pickBusiness: 'pilih jenis bisnis Anda.', soon: 'Segera',
    spaWellness: 'Spa & Kebugaran', spaSub: 'Pijat, perawatan wajah, ruang terapi',
    salon: 'Salon', gym: 'Gym & Kebugaran', restaurant: 'Restoran', retail: 'Ritel / Lainnya',
    comingSoon: 'Segera hadir',
    oneLast: 'Satu langkah lagi — siapa Anda?',
    manager: 'Manajer', staff: 'Staf', owner: 'Pemilik', managerSub: 'Atur hari, kelola tim',
    staffSub: 'Shift Anda, tamu Anda', whichMember: 'Anggota tim mana Anda?',
    back: 'Kembali', continue: 'Lanjut', saving: 'Menyimpan…',
    switch: 'Tukar', loading: 'Memuat…', retry: 'Coba lagi',
    home: 'Beranda', schedule: 'Jadwal', stock: 'Stok', alerts: 'Peringatan',
    sop: 'SOP', send: 'Kirim', today: 'Hari ini', inbox: 'Kotak Masuk', profile: 'Profil',
    add: 'Tambah', edit: 'Ubah', delete: 'Hapus', save: 'Simpan', cancel: 'Batal',
    approve: 'Setujui', decline: 'Tolak', remove: 'Hapus', reload: 'Muat ulang',
    todaysBookings: 'Pemesanan Hari Ini', activeStaff: 'Staf Aktif', lowStock: 'Stok Menipis',
    pendingRequest: 'permintaan tertunda', pendingRequests: 'permintaan tertunda', review: 'Tinjau',
    upcomingBookings: 'Pemesanan Mendatang', viewAll: 'Lihat semua',
    todaysChecklist: 'Daftar Periksa Hari Ini', latestAnnouncement: 'Pengumuman Terbaru',
    manage: 'Kelola', noAnnouncements: 'Belum ada pengumuman.',
    recentSopNotes: 'Catatan SOP Terbaru', sopViolation: 'Pelanggaran SOP dicatat',
    todaysSchedule: 'Jadwal Hari Ini', noBookings: 'Tidak ada pemesanan hari ini.', weekOverview: 'Ringkasan Minggu',
    deleteBooking: 'Hapus pemesanan ini?', bookingDeleted: 'Pemesanan dihapus',
    bookingAdded: 'Pemesanan ditambahkan', bookingUpdated: 'Pemesanan diperbarui',
    couldNotDeleteBooking: 'Tidak dapat menghapus pemesanan',
    newBooking: 'Pemesanan Baru', editBooking: 'Ubah Pemesanan',
    client: 'Klien', treatment: 'Perawatan', time: 'Waktu', durationMin: 'Durasi (menit)',
    therapist: 'Terapis', notes: 'Catatan',
    teamMembers: 'Anggota Tim', noTeamYet: 'Belum ada anggota tim.',
    removeStaff: 'Hapus anggota staf ini?', staffRemoved: 'Staf dihapus',
    staffAdded: 'Staf ditambahkan', staffUpdated: 'Staf diperbarui',
    couldNotRemoveStaff: 'Tidak dapat menghapus staf',
    sopNotes: 'catatan SOP', sopNote: 'catatan SOP',
    addTeamMember: 'Tambah Anggota Tim', editTeamMember: 'Ubah Anggota Tim',
    name: 'Nama', role: 'Peran', birthday: 'Ulang Tahun', avatarColor: 'Warna avatar',
    workingDays: 'Hari kerja',
    inventory: 'Inventaris', noItemsYet: 'Belum ada item.',
    removeItem: 'Hapus item ini?', itemRemoved: 'Item dihapus',
    itemAdded: 'Item ditambahkan', itemUpdated: 'Item diperbarui', markedOrdered: 'Ditandai sebagai dipesan',
    couldNotUpdateStock: 'Tidak dapat memperbarui stok',
    couldNotMarkOrdered: 'Tidak dapat menandai dipesan', couldNotRemoveItem: 'Tidak dapat menghapus item',
    decrease: 'kurangi', increase: 'tambah', ordered: 'Dipesan',
    low: 'Rendah', addItem: 'Tambah Item', editItem: 'Ubah Item',
    category: 'Kategori', stockLevel: 'Stok', threshold: 'Batas', unit: 'Unit', supplier: 'Pemasok',
    sopTitle: 'Prosedur Operasi Standar',
    logSopViolation: 'Catat Pelanggaran SOP', log: 'Catat',
    noViolations: 'Tidak ada pelanggaran tercatat.', repeatOffenders: 'Pelanggar Berulang',
    notes_n: 'catatan', notes_1: 'catatan',
    removeViolation: 'Hapus catatan pelanggaran ini?', noteRemoved: 'Catatan dihapus',
    couldNotRemoveNote: 'Tidak dapat menghapus catatan', violationLogged: 'Pelanggaran dicatat',
    logViolation: 'Catat Pelanggaran', staffPerson: 'Staf', sopRule: 'SOP', noteText: 'Catatan',
    stockAlerts: 'Peringatan Stok', allStockHealthy: 'Semua stok sehat',
    staffRequests: 'Permintaan Staf', noPendingReq: 'Tidak ada permintaan tertunda',
    reorder: 'Pesan ulang',
    sickCall: 'Panggilan Sakit', dayOff: 'Hari Libur', shiftSwap: 'Tukar Shift',
    noReason: 'Tidak ada alasan',
    bookingNeedReassign1: 'pemesanan perlu dialihkan.',
    bookingNeedReassign: 'pemesanan perlu dialihkan.',
    approveReassign: 'Setujui & Alihkan',
    requestApproved: 'Permintaan disetujui', requestDeclined: 'Permintaan ditolak',
    couldNotUpdateRequest: 'Tidak dapat memperbarui permintaan',
    reassignBookings: 'Alihkan Pemesanan', assignBookingsTo: 'Alihkan pemesanan staf ini pada',
    to: 'kepada:',
    announcements: 'Pengumuman', nothingSent: 'Belum ada yang dikirim.',
    deleteAnnouncement: 'Hapus pengumuman?', deleted: 'Dihapus',
    couldNotDeleteAnnouncement: 'Tidak dapat menghapus pengumuman',
    announcementSent: 'Pengumuman terkirim',
    newAnnouncement: 'Pengumuman Baru', title: 'Judul', message: 'Pesan', from: 'Dari',
    sending: 'Mengirim…',
    goodMorning: 'Selamat pagi', sessionsToday: 'sesi hari ini',
    myWeek: 'Minggu Saya', on: 'Aktif', off: 'Libur', todaysSessions: 'Sesi Hari Ini',
    noSessionsToday: 'Tidak ada sesi hari ini.', noSessions: 'Tidak ada sesi terjadwal.',
    theTeam: 'Tim',
    quickActions: 'Aksi Cepat', sick: 'Sakit', dayOffShort: 'Libur', swap: 'Tukar',
    complaintsToLearn: 'Keluhan untuk Dipelajari', myRequests: 'Permintaan Saya',
    noRequestsSubmitted: 'Tidak ada permintaan diajukan.',
    requestSubmitted: 'Permintaan diajukan', couldNotSubmitRequest: 'Tidak dapat mengajukan permintaan',
    callInSick: 'Lapor Sakit', requestDayOff: 'Minta Libur', requestSwap: 'Minta Tukar Shift',
    date: 'Tanggal', swapWith: 'Tukar dengan', selectColleague: 'Pilih rekan',
    theirDay: 'Hari mereka', reason: 'Alasan', noteOptional: 'Catatan (opsional)', submit: 'Kirim',
    daysWeek: 'Hari / minggu', mySopNotes: 'Catatan SOP Saya', cleanRecord: 'Catatan bersih — kerja bagus.',
    selectStaff: 'Pilih anggota tim',
    search: 'Cari', sortBy: 'Urutkan', filterCategory: 'Filter kategori', allCategories: 'Semua',
    timeAsc: 'Waktu ↑', timeDesc: 'Waktu ↓', exportCsv: 'Ekspor CSV',
    language: 'Bahasa', english: 'English', indonesian: 'Bahasa',
    failed: 'Gagal', noResults: 'Tidak ada hasil.',
    active: 'Aktif', leftLabel: 'tersisa · batas',
    todaySopReminder: 'Pengingat SOP Hari Ini', yourSessions: 'Sesi Anda',
    noteLabel: 'Catatan:', birthdayLabel: 'Ulang Tahun:',
    teamSize: 'Jumlah Tim', sopNotesStat: 'Catatan SOP',
    snapshot: 'Ringkasan', lowStockItems: 'Item stok rendah', flagged: 'ditandai',
    pendingRequestsSnap: 'Permintaan tertunda', announcementsSent: 'Pengumuman terkirim',
    team: 'Tim', sessionsTodayStat: 'Sesi hari ini',
    loadingProfile: 'Memuat profil…',
    checklistOpen: 'Buka resepsi & nyalakan diffuser',
    checklistBrief: 'Briefing tim pagi',
    checklistInventory: 'Periksa item stok rendah',
    checklistWrapup: 'Rekonsiliasi akhir hari',
    quickActionsBar: 'Aksi Cepat', reorderAll: 'Pesan ulang semua stok menipis',
    reviewRequests: 'Tinjau panggilan sakit', broadcast: 'Kirim pengumuman',
    reorderAllDone: 'Pesanan ulang dibuat untuk semua item menipis',
    noLowStock: 'Tidak ada yang perlu dipesan',
    callOutSick: 'Lapor sakit hari ini', sickCallToday: 'Laporan sakit hari ini dikirim',
    allergies: 'Alergi', clientPhone: 'Telp klien',
    price: 'Harga (IDR)', staffPhone: 'Telp staf', whatsapp: 'WhatsApp',
    undo: 'Batalkan', restored: 'Dipulihkan',
    thisWeek: 'Minggu Ini', revenue: 'Pendapatan', completed: 'Selesai',
    avgPerDay: 'Rata-rata / hari', topTherapist: 'Terapis Terbaik',
    commission: 'Komisi', commissionRate: 'Tingkat komisi (%)',
    estEarnings: 'Perkiraan pendapatan', deferred: 'Segera hadir',
    friction: 'Catatan untuk tim Anda:', waMsg: 'Halo, ini dari spa — pemberitahuan singkat.',
    days: { Mon: 'Sen', Tue: 'Sel', Wed: 'Rab', Thu: 'Kam', Fri: 'Jum', Sat: 'Sab', Sun: 'Min' },
  },
};

const LangContext = createContext({ lang: 'en', t: (k) => k, setLang: () => {} });
const useT = () => useContext(LangContext);

function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || 'en');
  const setLang = useCallback((l) => { localStorage.setItem(LANG_KEY, l); setLangState(l); }, []);
  const t = useCallback((k) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return dict[k] !== undefined ? dict[k] : (TRANSLATIONS.en[k] || k);
  }, [lang]);
  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

// ---------- CSV export ----------
function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- API helpers ----------
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

async function api(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('opus:unauth'));
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const d = await res.json(); msg = d.error || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

function useCollection(path, enabled = true) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const reload = useCallback(() => {
    if (!enabled) return;
    setRefreshing(true);
    setError(null);
    api(path)
      .then(d => {
        setData(Array.isArray(d) ? d : []);
        setLoading(false); setRefreshing(false); setHasLoaded(true);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false); setRefreshing(false);
      });
  }, [path, enabled]);

  useEffect(() => { if (enabled) reload(); }, [reload, enabled]);
  // Expose `loading` true only for initial fetch; subsequent refreshes don't blank the UI.
  return { data, loading: loading && !hasLoaded, refreshing, error, reload, setData };
}

// ---------- Constants ----------
const COLOR_OPTIONS = ['#2d5a4a', '#b8956a', '#8ba888', '#d4b896', '#6b8e7f', '#a17c52', '#c9a97a'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const QUOTES = [
  { text: 'The cure for anything is salt water: sweat, tears, or the sea.', src: '— Isak Dinesen' },
  { text: 'Wherever you go, go with all your heart.', src: '— Confucius' },
  { text: 'Peace begins with a smile.', src: '— Mother Teresa' },
  { text: 'Rest when you are weary. Refresh and renew yourself.', src: '— Ralph Marston' },
  { text: 'Take care of your body. It is the only place you have to live.', src: '— Jim Rohn' },
];

// ---------- Shared UI ----------
function Avatar({ initial, color, size = 36 }) {
  return (
    <div className="avatar" style={{
      width: size, height: size,
      background: color, fontSize: size * 0.4,
    }}>{initial}</div>
  );
}

function Badge({ label, type = 'info' }) {
  return <span className={`badge badge-${type}`}>{label}</span>;
}

function Skeleton({ height = 48, count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, borderRadius: 10 }} />
      ))}
    </div>
  );
}

function LoadState({ loading, error, reload, children }) {
  const { t } = useT();
  if (loading) return <Skeleton count={4} />;
  if (error) return (
    <div className="error-banner">
      <AlertTriangle size={16} /> {error}
      {reload && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={reload}>{t('retry')}</button>}
    </div>
  );
  return children;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="card-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ payload, onDone }) {
  const msg = typeof payload === 'string' ? payload : payload?.message;
  const action = typeof payload === 'object' && payload ? payload : null;
  useEffect(() => {
    if (!msg) return;
    const ttl = action?.undo ? 10000 : 2400;
    const t = setTimeout(onDone, ttl);
    return () => clearTimeout(t);
  }, [msg, action, onDone]);
  if (!msg) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{msg}</span>
      {action?.undo && (
        <button
          className="toast-btn"
          onClick={() => { action.undo(); onDone(); }}
          aria-label="undo"
        >{action.undoLabel || 'Undo'}</button>
      )}
    </div>
  );
}

// ---------- Brand mark ----------
function BrandMark({ sub }) {
  return (
    <>
      <div className="brand">{BRAND}<span className="dot">·</span></div>
      {sub && <div className="tagline">{sub}</div>}
    </>
  );
}

// ---------- Language toggle ----------
function LangToggle({ floating = false }) {
  const { lang, setLang } = useT();
  const className = floating ? 'lang-toggle-float' : 'switch';
  return (
    <button
      className={className}
      onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
      aria-label="toggle language"
      title={lang === 'en' ? 'Bahasa Indonesia' : 'English'}
    >
      <Globe size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
      {lang === 'en' ? 'EN' : 'ID'}
    </button>
  );
}

// ---------- Auth screen: login + signup ----------
function AuthScreen({ onAuthed }) {
  const { t } = useT();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!email || !password) { setErr(t('emailRequired')); return; }
    if (mode === 'signup' && password !== confirm) { setErr(t('passwordsDontMatch')); return; }
    if (mode === 'signup' && password.length < 6) { setErr(t('passwordTooShort')); return; }
    setBusy(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const { token, user } = await api(path, {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
      });
      setToken(token);
      onAuthed(user);
    } catch (e) {
      setErr(e.message || t('failed')); setBusy(false);
    }
  };

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card">
        <BrandMark sub={mode === 'login' ? t('welcomeBack') : t('createWorkspace')} />
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setErr(null); }}>{t('signIn')}</button>
          <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setErr(null); }}>{t('createAccount')}</button>
        </div>

        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <div className="field">
            <label>{t('email')}</label>
            <div className="input-wrap">
              <Mail size={14} className="input-icon" />
              <input
                className="input input-with-icon"
                type="email"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={e => { setErr(null); setEmail(e.target.value); }}
              />
            </div>
          </div>
          <div className="field">
            <label>{t('password')}</label>
            <div className="input-wrap">
              <Lock size={14} className="input-icon" />
              <input
                className="input input-with-icon"
                type="password"
                placeholder={mode === 'signup' ? t('pwSignup') : t('pwLogin')}
                value={password}
                onChange={e => { setErr(null); setPassword(e.target.value); }}
              />
            </div>
          </div>
          {mode === 'signup' && (
            <div className="field">
              <label>{t('confirmPassword')}</label>
              <div className="input-wrap">
                <Lock size={14} className="input-icon" />
                <input
                  className="input input-with-icon"
                  type="password"
                  placeholder={t('confirmPassword')}
                  value={confirm}
                  onChange={e => { setErr(null); setConfirm(e.target.value); }}
                />
              </div>
            </div>
          )}
          {err && (
            <div className="error-banner" style={{ marginTop: 4 }}>
              <AlertTriangle size={14} /> {err}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            {busy ? t('pleaseWait') : mode === 'login' ? t('signIn') : t('createAccount')}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          <Sparkles size={11} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--gold)' }} />
          {t('demoAccount')} <strong>demo@opus.app</strong> / <strong>demo1234</strong>
        </div>
      </div>
    </div>
  );
}

// ---------- Business type selector ----------
function BusinessSelector({ user, onSelected, onLogout }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const options = [
    { id: 'spa',        label: t('spaWellness'), sub: t('spaSub'),     icon: <Flower2 size={22} />, enabled: true },
    { id: 'salon',      label: t('salon'),       sub: t('comingSoon'), icon: <Scissors size={22} />, enabled: false },
    { id: 'gym',        label: t('gym'),         sub: t('comingSoon'), icon: <Dumbbell size={22} />, enabled: false },
    { id: 'restaurant', label: t('restaurant'),  sub: t('comingSoon'), icon: <UtensilsCrossed size={22} />, enabled: false },
    { id: 'retail',     label: t('retail'),      sub: t('comingSoon'), icon: <Building2 size={22} />, enabled: false },
  ];

  const pick = async (businessType) => {
    setBusy(true); setErr(null);
    try {
      const { token, user: u } = await api('/api/auth/business', {
        method: 'POST', body: { businessType },
      });
      setToken(token);
      onSelected(u);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card">
        <BrandMark sub={`${(user.email || '').split('@')[0]} — ${t('pickBusiness')}`} />
        {err && <div className="error-banner" style={{ marginTop: 14 }}><AlertTriangle size={14} /> {err}</div>}
        <div style={{ marginTop: 18 }}>
          {options.map(o => (
            <button
              key={o.id}
              className={`role-btn ${!o.enabled ? 'role-btn-disabled' : ''}`}
              onClick={() => o.enabled && !busy && pick(o.id)}
              disabled={!o.enabled || busy}
            >
              <div className="icon-wrap">{o.icon}</div>
              <div>
                <div className="label">{o.label}</div>
                <div className="sub">{o.sub}</div>
              </div>
              {!o.enabled && <span className="badge badge-info" style={{ marginLeft: 'auto' }}>{t('soon')}</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onLogout}>
          <LogOut size={14} /> {t('signOut')}
        </button>
      </div>
    </div>
  );
}

// ---------- Role selector ----------
function RoleSelector({ user, staff, onSelected, onLogout }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [staffId, setStaffId] = useState(staff[0]?.id || null);
  const [picking, setPicking] = useState(null);

  useEffect(() => {
    if (!staffId && staff[0]?.id) setStaffId(staff[0].id);
  }, [staff, staffId]);

  const pick = async (role) => {
    if (role === 'staff' && !staffId) {
      setPicking('staff'); return;
    }
    setBusy(true); setErr(null);
    try {
      const { token, user: u } = await api('/api/auth/role', {
        method: 'POST', body: { role, staffId: role === 'staff' ? staffId : null },
      });
      setToken(token);
      onSelected(u);
    } catch (e) { setErr(e.message); setBusy(false); setPicking(null); }
  };

  const roles = [
    { id: 'manager', label: t('manager'), sub: t('managerSub'), icon: <LayoutDashboard size={22} /> },
    { id: 'staff',   label: t('staff'),   sub: t('staffSub'),   icon: <Leaf size={22} /> },
  ];

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card">
        <BrandMark sub={t('oneLast')} />
        {err && <div className="error-banner" style={{ marginTop: 14 }}><AlertTriangle size={14} /> {err}</div>}

        {picking === 'staff' ? (
          <div style={{ marginTop: 18 }}>
            <div className="field">
              <label>{t('whichMember')}</label>
              <select className="select" value={staffId || ''} onChange={e => setStaffId(Number(e.target.value))}>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPicking(null)} disabled={busy}>{t('back')}</button>
              <button className="btn btn-primary" onClick={() => pick('staff')} disabled={busy || !staffId}>
                {busy ? t('saving') : t('continue')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            {roles.map(r => (
              <button key={r.id} className="role-btn" onClick={() => pick(r.id)} disabled={busy}>
                <div className="icon-wrap">{r.icon}</div>
                <div>
                  <div className="label">{r.label}</div>
                  <div className="sub">{r.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onLogout}>
          <LogOut size={14} /> {t('signOut')}
        </button>
      </div>
    </div>
  );
}

// ================= MANAGER VIEWS =================

function ManagerDashboard({ staff, bookings, inventory, requests, announcements, violations, onGoto, onReload, toast }) {
  const { t } = useT();
  const lowStock = inventory.filter(i => i.stock <= i.threshold);
  const pending  = requests.filter(r => r.status === 'pending');
  const [busy, setBusy] = useState(false);

  const reorderAll = async () => {
    if (!lowStock.length) { toast && toast(t('noLowStock')); return; }
    setBusy(true);
    try {
      await Promise.all(lowStock.map(i => api(`/api/inventory/${i.id}/order`, { method: 'POST', body: {} })));
      toast && toast(t('reorderAllDone'));
      onReload && onReload();
    } catch (e) { toast && toast(e.message || t('couldNotMarkOrdered')); }
    finally { setBusy(false); }
  };

  const stats = [
    { v: bookings.length, l: t('todaysBookings'), i: <Calendar size={16} /> },
    { v: staff.length,    l: t('activeStaff'),    i: <Users size={16} /> },
    { v: lowStock.length, l: t('lowStock'),       i: <Package size={16} /> },
  ];

  const checklist = [
    { id: 'open',      label: t('checklistOpen') },
    { id: 'brief',     label: t('checklistBrief') },
    { id: 'inventory', label: t('checklistInventory') },
    { id: 'wrapup',    label: t('checklistWrapup') },
  ];
  const [done, setDone] = useState({});

  return (
    <div>
      <div className="stats">
        {stats.map(s => (
          <div className="stat" key={s.l}>
            <div className="icon-mini">{s.i}</div>
            <div className="v">{s.v}</div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h3>{t('quickActionsBar')}</h3></div>
        <div className="qa-grid">
          <button className="qa-btn" onClick={reorderAll} disabled={busy || lowStock.length === 0} aria-label={t('reorderAll')}>
            <Package size={18} />
            <span>{t('reorderAll')}{lowStock.length > 0 ? ` (${lowStock.length})` : ''}</span>
          </button>
          <button className="qa-btn" onClick={() => onGoto('alerts')} aria-label={t('reviewRequests')}>
            <Bell size={18} />
            <span>{t('reviewRequests')}{pending.length > 0 ? ` (${pending.length})` : ''}</span>
          </button>
          <button className="qa-btn" onClick={() => onGoto('announcements')} aria-label={t('broadcast')}>
            <Megaphone size={18} />
            <span>{t('broadcast')}</span>
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="card-head">
            <h3><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {pending.length} {pending.length === 1 ? t('pendingRequest') : t('pendingRequests')}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onGoto('alerts')}>{t('review')}</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3>{t('upcomingBookings')}</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoto('schedule')}>{t('viewAll')}</button>
        </div>
        {bookings.slice(0, 5).map(b => {
          const m = staff.find(s => s.id === b.staffId);
          return (
            <div key={b.id} className="row">
              <div style={{ color: 'var(--gold)', fontWeight: 700, minWidth: 48, fontFamily: 'Fraunces, serif' }}>
                {b.time}
              </div>
              <div className="grow">
                <div className="title">{b.client}</div>
                <div className="meta">{b.treatment} · {b.duration}min</div>
              </div>
              {m && <Avatar initial={m.avatar} color={m.color} size={28} />}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>{t('todaysChecklist')}</h3>
        {checklist.map(c => (
          <label key={c.id} className="row" style={{ cursor: 'pointer' }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              border: '2px solid ' + (done[c.id] ? 'var(--emerald)' : 'var(--line)'),
              background: done[c.id] ? 'var(--emerald)' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {done[c.id] && <Check size={14} color="#fff" />}
            </div>
            <div className="grow" style={{ textDecoration: done[c.id] ? 'line-through' : 'none', color: done[c.id] ? 'var(--muted)' : 'var(--ink)' }}>
              {c.label}
            </div>
            <input
              type="checkbox"
              checked={!!done[c.id]}
              onChange={() => setDone({ ...done, [c.id]: !done[c.id] })}
              style={{ display: 'none' }}
            />
          </label>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h3>{t('latestAnnouncement')}</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoto('announcements')}>{t('manage')}</button>
        </div>
        {announcements[0] ? (
          <div>
            <div className="title" style={{ fontFamily: 'Fraunces, serif', fontSize: 16 }}>{announcements[0].title}</div>
            <div className="meta" style={{ marginTop: 6 }}>{announcements[0].body}</div>
            <div className="meta" style={{ marginTop: 8, fontStyle: 'italic' }}>— {announcements[0].from}</div>
          </div>
        ) : <div className="center-muted">{t('noAnnouncements')}</div>}
      </div>

      {violations.length > 0 && (
        <div className="card">
          <h3>{t('recentSopNotes')}</h3>
          {violations.slice(-3).reverse().map(v => {
            const s = staff.find(st => st.id === v.staffId);
            return (
              <div key={v.id} className="row">
                {s && <Avatar initial={s.avatar} color={s.color} size={28} />}
                <div className="grow">
                  <div className="title">{s ? s.name : `Staff #${v.staffId}`}</div>
                  <div className="meta">{v.note || t('sopViolation')}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScheduleTab({ bookings, staff, onReload, toast }) {
  const { t, lang } = useT();
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const dayCounts = useMemo(() => DAYS.map(d => ({ d, c: Math.floor(Math.random() * 8) + 2 })), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q ? bookings.filter(b =>
      (b.client || '').toLowerCase().includes(q) ||
      (b.treatment || '').toLowerCase().includes(q) ||
      (b.notes || '').toLowerCase().includes(q)
    ) : bookings;
    out = [...out].sort((a, b) => sortDir === 'asc' ? a.time.localeCompare(b.time) : b.time.localeCompare(a.time));
    return out;
  }, [bookings, query, sortDir]);

  const del = async (id) => {
    if (!window.confirm(t('deleteBooking'))) return;
    const backup = bookings.find(b => b.id === id);
    try {
      await api(`/api/bookings/${id}`, { method: 'DELETE' });
      onReload();
      toast({
        message: t('bookingDeleted'),
        undoLabel: t('undo'),
        undo: async () => {
          try {
            const { id: _drop, ...rest } = backup || {};
            await api('/api/bookings', { method: 'POST', body: rest });
            toast(t('restored')); onReload();
          } catch (e) { toast(e.message || t('failed')); }
        },
      });
    } catch (e) { toast(e.message || t('couldNotDeleteBooking')); }
  };

  const exportCsv = () => {
    const rows = filtered.map(b => {
      const m = staff.find(s => s.id === b.staffId);
      return { time: b.time, client: b.client, treatment: b.treatment, duration: b.duration, therapist: m?.name || '', notes: b.notes || '' };
    });
    downloadCSV(`bookings-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h3>{t('todaysSchedule')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
            <Plus size={14} /> {t('add')}
          </button>
        </div>

        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input className="search-input" placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="toolbar">
          <select className="select" value={sortDir} onChange={e => setSortDir(e.target.value)} aria-label={t('sortBy')}>
            <option value="asc">{t('timeAsc')}</option>
            <option value="desc">{t('timeDesc')}</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={12} /> {t('exportCsv')}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="center-muted">{query ? t('noResults') : t('noBookings')}</div>
        ) : filtered.map(b => {
          const m = staff.find(s => s.id === b.staffId);
          return (
            <div key={b.id} className="sched-block">
              <div className="time">{b.time}</div>
              <div className="grow">
                <div className="title">{b.client}</div>
                <div className="meta">{b.treatment} · {b.duration}min</div>
                {m && <div className="meta" style={{ marginTop: 4 }}>{lang === 'id' ? 'dengan' : 'with'} <strong>{m.name}</strong></div>}
                {b.allergies && <div className="note-chip" style={{ background: '#fbecec', color: 'var(--danger)' }}><AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{t('allergies')}: {b.allergies}</div>}
                {b.notes && <div className="note-chip">{t('notes')}: {b.notes}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn-icon" onClick={() => setModal(b)} aria-label={t('edit')}><Edit2 size={14} /></button>
                <button className="btn-icon" onClick={() => del(b.id)} aria-label={t('delete')}><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>{t('weekOverview')}</h3>
        <div className="week-grid">
          {dayCounts.map(x => (
            <div className="week-cell" key={x.d}>
              <div className="d">{t('days')[x.d]}</div>
              <div className="c">{x.c}</div>
              <div>{t('todaysBookings').toLowerCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <BookingModal
          booking={modal === 'new' ? null : modal}
          staff={staff}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onReload(); toast(modal === 'new' ? t('bookingAdded') : t('bookingUpdated')); }}
        />
      )}
    </div>
  );
}

function BookingModal({ booking, staff, onClose, onSaved }) {
  const { t } = useT();
  const [f, setF] = useState(booking || {
    time: '10:00', client: '', treatment: '', duration: 60,
    staffId: staff[0]?.id || 1, notes: '', allergies: '',
    clientPhone: '', price: 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      if (booking) await api(`/api/bookings/${booking.id}`, { method: 'PUT', body: f });
      else         await api('/api/bookings', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={booking ? t('editBooking') : t('newBooking')} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={14} />{err}</div>}
        <div className="field"><label>{t('client')}</label>
          <input className="input" required value={f.client} onChange={e => setF({ ...f, client: e.target.value })} /></div>
        <div className="field"><label>{t('treatment')}</label>
          <input className="input" required value={f.treatment} onChange={e => setF({ ...f, treatment: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>{t('time')}</label>
            <input className="input" type="time" required value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>{t('durationMin')}</label>
            <input className="input" type="number" value={f.duration} onChange={e => setF({ ...f, duration: Number(e.target.value) })} /></div>
        </div>
        <div className="field"><label>{t('therapist')}</label>
          <select className="select" value={f.staffId} onChange={e => setF({ ...f, staffId: Number(e.target.value) })}>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>{t('clientPhone')}</label>
            <input className="input" type="tel" placeholder="+62…" value={f.clientPhone || ''} onChange={e => setF({ ...f, clientPhone: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>{t('price')}</label>
            <input className="input" type="number" min="0" value={f.price || 0} onChange={e => setF({ ...f, price: Number(e.target.value) })} /></div>
        </div>
        <div className="field"><label>{t('allergies')}</label>
          <input className="input" placeholder="e.g. lavender, nuts" value={f.allergies || ''} onChange={e => setF({ ...f, allergies: e.target.value })} /></div>
        <div className="field"><label>{t('notes')}</label>
          <textarea className="textarea" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StaffTab({ staff, violations, onReload, toast }) {
  const { t } = useT();
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q)
    );
  }, [staff, query]);

  const exportCsv = () => {
    const rows = staff.map(s => ({
      id: s.id, name: s.name, role: s.role,
      birthday: s.birthday || '', schedule: (s.schedule || []).join('|'),
      violations: violations.filter(v => v.staffId === s.id).length,
    }));
    downloadCSV(`staff-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  const del = async (id) => {
    if (!window.confirm(t('removeStaff'))) return;
    const backup = staff.find(s => s.id === id);
    try {
      await api(`/api/staff/${id}`, { method: 'DELETE' });
      onReload();
      toast({
        message: t('staffRemoved'),
        undoLabel: t('undo'),
        undo: async () => {
          try {
            const { id: _drop, ...rest } = backup || {};
            await api('/api/staff', { method: 'POST', body: rest });
            toast(t('restored')); onReload();
          } catch (e) { toast(e.message || t('failed')); }
        },
      });
    } catch (e) { toast(e.message || t('couldNotRemoveStaff')); return; }
  };

  const waLink = (phone) => {
    const num = (phone || '').replace(/\D/g, '');
    if (!num) return null;
    return `https://wa.me/${num}?text=${encodeURIComponent(t('waMsg'))}`;
  };

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h3>{t('teamMembers')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}><Plus size={14} /> {t('add')}</button>
        </div>
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input className="search-input" placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="toolbar">
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={staff.length === 0}>
            <Download size={12} /> {t('exportCsv')}
          </button>
        </div>
        {filtered.length === 0 ? <div className="center-muted">{query ? t('noResults') : t('noTeamYet')}</div> : filtered.map(s => {
          const vCount = violations.filter(v => v.staffId === s.id).length;
          return (
            <div key={s.id} className="row">
              <Avatar initial={s.avatar} color={s.color} size={44} />
              <div className="grow">
                <div className="title">{s.name}</div>
                <div className="meta">{s.role}{s.birthday ? ` · ${t('birthday').toLowerCase()} ${new Date(s.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</div>
                <div style={{ marginTop: 4 }}>
                  {vCount > 0 && <Badge label={`${vCount} ${vCount === 1 ? t('sopNote') : t('sopNotes')}`} type="warn" />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {waLink(s.phone) && (
                  <a className="btn-icon" href={waLink(s.phone)} target="_blank" rel="noreferrer" aria-label={t('whatsapp')} title={t('whatsapp')}>
                    <PhoneCall size={14} />
                  </a>
                )}
                <button className="btn-icon" onClick={() => setModal(s)} aria-label={t('edit')}><Edit2 size={14} /></button>
                <button className="btn-icon" onClick={() => del(s.id)} aria-label={t('delete')}><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <StaffModal
          member={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onReload(); toast(modal === 'new' ? t('staffAdded') : t('staffUpdated')); }}
        />
      )}
    </div>
  );
}

function StaffModal({ member, onClose, onSaved }) {
  const { t } = useT();
  const [f, setF] = useState(member || {
    name: '', role: 'Therapist', avatar: '', color: COLOR_OPTIONS[0],
    birthday: '', schedule: ['Mon','Tue','Wed','Thu','Fri'], phone: '',
    commissionRate: 30,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const toggleDay = (d) => {
    const has = f.schedule.includes(d);
    setF({ ...f, schedule: has ? f.schedule.filter(x => x !== d) : [...f.schedule, d] });
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const body = { ...f, avatar: (f.avatar || f.name[0] || '?').toUpperCase() };
      if (member) await api(`/api/staff/${member.id}`, { method: 'PUT', body });
      else         await api('/api/staff', { method: 'POST', body });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={member ? t('editTeamMember') : t('addTeamMember')} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={14} />{err}</div>}
        <div className="field"><label>{t('name')}</label>
          <input className="input" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label>{t('role')}</label>
          <select className="select" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
            <option>Therapist</option><option>Receptionist</option><option>Manager</option><option>Housekeeping</option>
          </select></div>
        <div className="field"><label>{t('birthday')}</label>
          <input className="input" type="date" value={f.birthday || ''} onChange={e => setF({ ...f, birthday: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>{t('staffPhone')}</label>
            <input className="input" type="tel" placeholder="+62…" value={f.phone || ''} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>{t('commissionRate')}</label>
            <input className="input" type="number" min="0" max="100" value={f.commissionRate ?? 30} onChange={e => setF({ ...f, commissionRate: Number(e.target.value) })} /></div>
        </div>
        <div className="field"><label>{t('avatarColor')}</label>
          <div className="color-swatches">
            {COLOR_OPTIONS.map(c => (
              <div key={c} className={`swatch ${f.color === c ? 'active' : ''}`}
                style={{ background: c }} onClick={() => setF({ ...f, color: c })} />
            ))}
          </div>
        </div>
        <div className="field"><label>{t('workingDays')}</label>
          <div className="chip-row">
            {DAYS.map(d => (
              <div key={d} className={`chip ${f.schedule.includes(d) ? 'active' : ''}`} onClick={() => toggleDay(d)}>{t('days')[d]}</div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}

function InventoryTab({ inventory, onReload, toast }) {
  const { t } = useT();
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('');

  const categories = useMemo(() => {
    const set = new Set(inventory.map(i => i.category).filter(Boolean));
    return Array.from(set).sort();
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inventory.filter(i => {
      if (cat && i.category !== cat) return false;
      if (!q) return true;
      return (i.name || '').toLowerCase().includes(q) || (i.supplier || '').toLowerCase().includes(q);
    });
  }, [inventory, query, cat]);

  const exportCsv = () => {
    const rows = filtered.map(i => ({
      id: i.id, name: i.name, category: i.category, stock: i.stock,
      threshold: i.threshold, unit: i.unit, supplier: i.supplier, lastOrder: i.lastOrder || '',
    }));
    downloadCSV(`inventory-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  const adjust = async (id, delta) => {
    try {
      await api(`/api/inventory/${id}/stock`, { method: 'PATCH', body: { delta } });
      onReload();
    } catch (e) { toast(e.message || t('couldNotUpdateStock')); }
  };
  const markOrdered = async (id) => {
    try {
      await api(`/api/inventory/${id}/order`, { method: 'POST', body: {} });
      toast(t('markedOrdered')); onReload();
    } catch (e) { toast(e.message || t('couldNotMarkOrdered')); }
  };
  const del = async (id) => {
    if (!window.confirm(t('removeItem'))) return;
    const backup = inventory.find(i => i.id === id);
    try {
      await api(`/api/inventory/${id}`, { method: 'DELETE' });
      onReload();
      toast({
        message: t('itemRemoved'),
        undoLabel: t('undo'),
        undo: async () => {
          try {
            const { id: _drop, ...rest } = backup || {};
            await api('/api/inventory', { method: 'POST', body: rest });
            toast(t('restored')); onReload();
          } catch (e) { toast(e.message || t('failed')); }
        },
      });
    } catch (e) { toast(e.message || t('couldNotRemoveItem')); }
  };

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h3>{t('inventory')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}><Plus size={14} /> {t('add')}</button>
        </div>
        <div className="search-wrap">
          <Search size={14} className="search-icon" />
          <input className="search-input" placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="toolbar">
          <select className="select" value={cat} onChange={e => setCat(e.target.value)} aria-label={t('filterCategory')}>
            <option value="">{t('allCategories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={12} /> {t('exportCsv')}
          </button>
        </div>
        {filtered.length === 0 ? <div className="center-muted">{(query || cat) ? t('noResults') : t('noItemsYet')}</div> : filtered.map(i => {
          const low = i.stock <= i.threshold;
          return (
            <div key={i.id} className="row">
              <div className="grow">
                <div className="title">{i.name}</div>
                <div className="meta">{i.category} · {i.supplier}</div>
                <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge label={`${i.stock} ${i.unit}`} type={low ? 'danger' : 'success'} />
                  {low && <Badge label={t('low')} type="warn" />}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon" onClick={() => adjust(i.id, -1)} aria-label={t('decrease')}>−</button>
                  <button className="btn-icon" onClick={() => adjust(i.id, +1)} aria-label={t('increase')}>+</button>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => markOrdered(i.id)}>{t('ordered')}</button>
                  <button className="btn-icon" onClick={() => setModal(i)} aria-label={t('edit')}><Edit2 size={14} /></button>
                  <button className="btn-icon" onClick={() => del(i.id)} aria-label={t('delete')}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {modal && (
        <InventoryModal
          item={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onReload(); toast(modal === 'new' ? t('itemAdded') : t('itemUpdated')); }}
        />
      )}
    </div>
  );
}

function InventoryModal({ item, onClose, onSaved }) {
  const { t } = useT();
  const [f, setF] = useState(item || {
    name: '', category: 'Oils', stock: 0, threshold: 5, unit: 'pcs', supplier: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      if (item) await api(`/api/inventory/${item.id}`, { method: 'PUT', body: f });
      else       await api('/api/inventory', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={item ? t('editItem') : t('addItem')} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={14} />{err}</div>}
        <div className="field"><label>{t('name')}</label>
          <input className="input" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>{t('category')}</label>
            <input className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>{t('unit')}</label>
            <input className="input" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>{t('stockLevel')}</label>
            <input className="input" type="number" value={f.stock} onChange={e => setF({ ...f, stock: Number(e.target.value) })} /></div>
          <div className="field" style={{ flex: 1 }}><label>{t('threshold')}</label>
            <input className="input" type="number" value={f.threshold} onChange={e => setF({ ...f, threshold: Number(e.target.value) })} /></div>
        </div>
        <div className="field"><label>{t('supplier')}</label>
          <input className="input" value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}

function SOPTab({ sops, staff, violations, onReload, toast }) {
  const { t } = useT();
  const [modal, setModal] = useState(false);
  const counts = staff.map(s => ({
    ...s, count: violations.filter(v => v.staffId === s.id).length,
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  const del = async (id) => {
    if (!window.confirm(t('removeViolation'))) return;
    try {
      await api(`/api/violations/${id}`, { method: 'DELETE' });
      toast(t('noteRemoved')); onReload();
    } catch (e) { toast(e.message || t('couldNotRemoveNote')); }
  };

  return (
    <div>
      <div className="card">
        <div className="card-head"><h3>{t('sopTitle')}</h3></div>
        {sops.map(s => (
          <div key={s.id} className="row">
            <ShieldCheck size={20} color="var(--gold)" />
            <div className="grow">
              <div className="title">{s.title}</div>
              <div className="meta">{s.category} · {s.description}</div>
            </div>
            <Badge label={t('active')} type="success" />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>{t('logSopViolation')}</h3>
          <button className="btn btn-gold btn-sm" onClick={() => setModal(true)}><Plus size={14} /> {t('log')}</button>
        </div>
        {violations.length === 0 ? (
          <div className="center-muted">{t('noViolations')}</div>
        ) : violations.slice().reverse().map(v => {
          const s = staff.find(st => st.id === v.staffId);
          const sop = sops.find(x => x.id === v.sopId);
          return (
            <div key={v.id} className="row">
              {s && <Avatar initial={s.avatar} color={s.color} size={32} />}
              <div className="grow">
                <div className="title">{s ? s.name : '—'}</div>
                <div className="meta">{sop ? sop.title : `SOP #${v.sopId}`}{v.note ? ` · ${v.note}` : ''}</div>
                <div className="meta" style={{ fontSize: 11 }}>{new Date(v.createdAt).toLocaleString()}</div>
              </div>
              <button className="btn-icon" onClick={() => del(v.id)} aria-label={t('delete')}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>

      {counts.length > 0 && (
        <div className="card">
          <h3>{t('repeatOffenders')}</h3>
          {counts.map(s => (
            <div key={s.id} className="row">
              <Avatar initial={s.avatar} color={s.color} size={32} />
              <div className="grow"><div className="title">{s.name}</div></div>
              <Badge label={`${s.count} ${t('notes_n')}`} type={s.count >= 3 ? 'danger' : 'warn'} />
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ViolationModal
          staff={staff} sops={sops}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); onReload(); toast(t('violationLogged')); }}
        />
      )}
    </div>
  );
}

function ViolationModal({ staff, sops, onClose, onSaved }) {
  const { t } = useT();
  const [f, setF] = useState({ staffId: staff[0]?.id || 1, sopId: sops[0]?.id || 1, note: '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await api('/api/violations', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={t('logSopViolation')} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={14} />{err}</div>}
        <div className="field"><label>{t('staffPerson')}</label>
          <select className="select" value={f.staffId} onChange={e => setF({ ...f, staffId: Number(e.target.value) })}>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div className="field"><label>{t('sopRule')}</label>
          <select className="select" value={f.sopId} onChange={e => setF({ ...f, sopId: Number(e.target.value) })}>
            {sops.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select></div>
        <div className="field"><label>{t('noteText')}</label>
          <textarea className="textarea" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? t('saving') : t('log')}</button>
        </div>
      </form>
    </Modal>
  );
}

function AlertsTab({ inventory, requests, staff, bookings, onReload, toast }) {
  const { t } = useT();
  const lowStock = inventory.filter(i => i.stock <= i.threshold);
  const pending  = requests.filter(r => r.status === 'pending');
  const [reassign, setReassign] = useState(null);

  const decide = async (req, status, reassignToStaffId) => {
    try {
      await api(`/api/requests/${req.id}`, { method: 'PUT', body: { status, reassignToStaffId } });
      toast(status === 'approved' ? t('requestApproved') : t('requestDeclined'));
      onReload();
      setReassign(null);
    } catch (e) { toast(e.message || t('couldNotUpdateRequest')); }
  };

  const formatType = (k) => k === 'sick' ? t('sickCall') : k === 'dayoff' ? t('dayOff') : t('shiftSwap');

  return (
    <div>
      <div className="card">
        <h3>{t('stockAlerts')} ({lowStock.length})</h3>
        {lowStock.length === 0
          ? <div className="success-banner"><CheckCircle size={14} /> {t('allStockHealthy')}</div>
          : lowStock.map(i => (
            <div key={i.id} className="row">
              <Package size={18} color="var(--warn)" />
              <div className="grow">
                <div className="title">{i.name}</div>
                <div className="meta">{i.stock} {i.unit} {t('leftLabel')} {i.threshold}</div>
              </div>
              <Badge label={t('reorder')} type="warn" />
            </div>
          ))}
      </div>

      <div className="card">
        <h3>{t('staffRequests')} ({pending.length})</h3>
        {pending.length === 0
          ? <div className="success-banner"><CheckCircle size={14} /> {t('noPendingReq')}</div>
          : pending.map(req => {
            const s = staff.find(st => st.id === req.staffId);
            const affected = req.type === 'sick'
              ? bookings.filter(b => b.staffId === req.staffId && b.date === req.date)
              : [];
            return (
              <div key={req.id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {s && <Avatar initial={s.avatar} color={s.color} size={32} />}
                  <div className="grow">
                    <div className="title">{formatType(req.type)} · {s ? s.name : `${t('staffPerson')} #${req.staffId}`}</div>
                    <div className="meta">{req.date} · {req.reason || t('noReason')}</div>
                  </div>
                  <Badge label={req.type} type="pending" />
                </div>
                {req.type === 'sick' && affected.length > 0 && (
                  <div style={{ background: '#fbecec', padding: '8px 10px', borderRadius: 8, fontSize: 12, color: 'var(--danger)' }}>
                    {affected.length} {affected.length === 1 ? t('bookingNeedReassign1') : t('bookingNeedReassign')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {req.type === 'sick' && affected.length > 0 ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setReassign(req)}>{t('approveReassign')}</button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => decide(req, 'approved')}>{t('approve')}</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => decide(req, 'declined')}>{t('decline')}</button>
                </div>
              </div>
            );
          })}
      </div>

      {reassign && (
        <ReassignModal
          request={reassign}
          staff={staff.filter(s => s.id !== reassign.staffId)}
          onClose={() => setReassign(null)}
          onSubmit={(toId) => decide(reassign, 'approved', toId)}
        />
      )}
    </div>
  );
}

function ReassignModal({ request, staff, onClose, onSubmit }) {
  const { t } = useT();
  const [to, setTo] = useState(staff[0]?.id || 1);
  return (
    <Modal title={t('reassignBookings')} onClose={onClose}>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        {t('assignBookingsTo')} <strong>{request.date}</strong> {t('to')}
      </p>
      <div className="field">
        <select className="select" value={to} onChange={e => setTo(Number(e.target.value))}>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
        </select>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" onClick={() => onSubmit(to)}>{t('approveReassign')}</button>
      </div>
    </Modal>
  );
}

function AnnouncementsTab({ announcements, onReload, toast, user }) {
  const { t } = useT();
  const [modal, setModal] = useState(false);
  const del = async (id) => {
    if (!window.confirm(t('deleteAnnouncement'))) return;
    const backup = announcements.find(a => a.id === id);
    try {
      await api(`/api/announcements/${id}`, { method: 'DELETE' });
      onReload();
      toast({
        message: t('deleted'),
        undoLabel: t('undo'),
        undo: async () => {
          try {
            const { id: _drop, createdAt, ...rest } = backup || {};
            await api('/api/announcements', { method: 'POST', body: rest });
            toast(t('restored')); onReload();
          } catch (e) { toast(e.message || t('failed')); }
        },
      });
    } catch (e) { toast(e.message || t('couldNotDeleteAnnouncement')); }
  };
  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h3>{t('announcements')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Megaphone size={14} /> {t('send')}</button>
        </div>
        {announcements.length === 0
          ? <div className="center-muted">{t('nothingSent')}</div>
          : announcements.map(a => (
            <div key={a.id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="grow">
                  <div className="title" style={{ fontFamily: 'Fraunces, serif', fontSize: 16 }}>{a.title}</div>
                  <div className="meta">{new Date(a.createdAt).toLocaleString()} · {a.from}</div>
                </div>
                <button className="btn-icon" onClick={() => del(a.id)} aria-label={t('delete')}><Trash2 size={14} /></button>
              </div>
              <div style={{ marginTop: 6, fontSize: 14 }}>{a.body}</div>
            </div>
          ))}
      </div>
      {modal && (
        <AnnouncementModal
          defaultFrom={user?.name || 'Management'}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); onReload(); toast(t('announcementSent')); }}
        />
      )}
    </div>
  );
}

function AnnouncementModal({ defaultFrom, onClose, onSaved }) {
  const { t } = useT();
  const [f, setF] = useState({ title: '', body: '', from: defaultFrom || 'Management' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);
  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await api('/api/announcements', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };
  return (
    <Modal title={t('newAnnouncement')} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={14} />{err}</div>}
        <div className="field"><label>{t('title')}</label>
          <input className="input" required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></div>
        <div className="field"><label>{t('message')}</label>
          <textarea className="textarea" required value={f.body} onChange={e => setF({ ...f, body: e.target.value })} /></div>
        <div className="field"><label>{t('from')}</label>
          <input className="input" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} /></div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Send size={14} /> {saving ? t('sending') : t('send')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ================= STAFF VIEWS =================

function StaffTodayView({ staff, bookings, staffId, sops, onSubmitRequest, toast }) {
  const { t } = useT();
  const me = staff.find(s => s.id === staffId);
  const myBookings = bookings.filter(b => b.staffId === staffId);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [sop] = useState(() => sops[Math.floor(Math.random() * sops.length)] || null);
  const [sickBusy, setSickBusy] = useState(false);

  if (!me) return <div className="center-muted">{t('loadingProfile')}</div>;

  const todayISO = new Date().toISOString().slice(0, 10);
  const callSick = async () => {
    if (!window.confirm(t('callOutSick') + ' ?')) return;
    setSickBusy(true);
    try {
      await onSubmitRequest({ type: 'sick', staffId, date: todayISO, reason: '' });
      toast && toast(t('sickCallToday'));
    } catch (e) { toast && toast(e.message || t('couldNotSubmitRequest')); }
    finally { setSickBusy(false); }
  };

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar initial={me.avatar} color={me.color} size={54} />
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: 'var(--emerald)' }}>
            {t('goodMorning')}, {me.name.split(' ')[0]}
          </div>
          <div className="meta">{me.role} · {myBookings.length} {t('sessionsToday')}</div>
        </div>
      </div>

      {onSubmitRequest && (
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--danger)', color: 'var(--danger)' }}
          onClick={callSick} disabled={sickBusy}
          aria-label={t('callOutSick')}
        >
          <PhoneCall size={14} /> {sickBusy ? t('saving') : t('callOutSick')}
        </button>
      )}

      <div className="quote">
        "{quote.text}"
        <span className="src">{quote.src}</span>
      </div>

      {sop && (
        <div className="card" style={{ borderLeft: '3px solid var(--gold)' }}>
          <div className="card-head"><h3><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('todaySopReminder')}</h3></div>
          <div className="title">{sop.title}</div>
          <div className="meta" style={{ marginTop: 4 }}>{sop.description}</div>
        </div>
      )}

      <div className="card">
        <h3>{t('yourSessions')}</h3>
        {myBookings.length === 0
          ? <div className="center-muted">{t('noSessions')}</div>
          : myBookings.map(b => (
            <div key={b.id} className="sched-block">
              <div className="time">{b.time}</div>
              <div className="grow">
                <div className="title">{b.client}</div>
                <div className="meta">{b.treatment} · {b.duration}min</div>
                {b.allergies && (
                  <div className="note-chip" style={{ background: '#fbecec', color: 'var(--danger)' }}>
                    <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {t('allergies')}: {b.allergies}
                  </div>
                )}
                {b.notes && <div className="note-chip">{t('noteLabel')} {b.notes}</div>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function StaffScheduleView({ staff, bookings, staffId }) {
  const { t, lang } = useT();
  const mine = bookings.filter(b => b.staffId === staffId);
  const me = staff.find(s => s.id === staffId);
  const others = staff.filter(s => s.id !== staffId);
  const workDays = me?.schedule || [];
  const dayDict = TRANSLATIONS[lang]?.days || TRANSLATIONS.en.days;

  return (
    <div>
      <div className="card">
        <h3>{t('myWeek')}</h3>
        <div className="week-grid">
          {DAYS.map(d => (
            <div className="week-cell" key={d} style={{
              background: workDays.includes(d) ? 'var(--emerald-soft)' : '#fff',
            }}>
              <div className="d">{dayDict[d] || d}</div>
              <div className="c">{workDays.includes(d) ? t('on') : t('off')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>{t('todaysSessions')}</h3>
        {mine.length === 0 ? <div className="center-muted">{t('noSessionsToday')}</div> : mine.map(b => (
          <div key={b.id} className="sched-block">
            <div className="time">{b.time}</div>
            <div className="grow">
              <div className="title">{b.client}</div>
              <div className="meta">{b.treatment} · {b.duration}min</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>{t('theTeam')}</h3>
        {others.map(s => (
          <div key={s.id} className="row">
            <Avatar initial={s.avatar} color={s.color} size={32} />
            <div className="grow">
              <div className="title">{s.name}</div>
              <div className="meta">{s.role} · {s.schedule?.map(d => dayDict[d] || d).join(', ') || '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffInboxView({ announcements, staffId, staff, requests, onSubmitRequest, toast }) {
  const { t } = useT();
  const [mode, setMode] = useState(null);
  const mine = requests.filter(r => r.staffId === staffId);
  const complaints = [
    { id: 1, text: 'Guest felt rushed during transition — slow handoffs are noticed.' },
    { id: 2, text: 'Towels warm next time — even a thermos helps.' },
  ];

  return (
    <div>
      <div className="card">
        <div className="card-head"><h3>{t('quickActions')}</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setMode('sick')}><PhoneCall size={14} /> {t('sick')}</button>
          <button className="btn btn-ghost" onClick={() => setMode('dayoff')}><CalendarOff size={14} /> {t('dayOffShort')}</button>
          <button className="btn btn-ghost" onClick={() => setMode('swap')}><Repeat size={14} /> {t('swap')}</button>
        </div>
      </div>

      <div className="card">
        <h3>{t('announcements')}</h3>
        {announcements.length === 0 ? <div className="center-muted">{t('noAnnouncements')}</div> : announcements.map(a => (
          <div key={a.id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="title" style={{ fontFamily: 'Fraunces, serif', fontSize: 16 }}>{a.title}</div>
            <div className="meta">{new Date(a.createdAt).toLocaleString()} · {a.from}</div>
            <div style={{ marginTop: 4, fontSize: 14 }}>{a.body}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>{t('complaintsToLearn')}</h3>
        {complaints.map(c => (
          <div key={c.id} className="row">
            <Heart size={16} color="var(--gold)" />
            <div className="grow meta">{c.text}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>{t('myRequests')}</h3>
        {mine.length === 0 ? <div className="center-muted">{t('noRequestsSubmitted')}</div> : mine.map(r => (
          <div key={r.id} className="row">
            <div className="grow">
              <div className="title">{r.type === 'sick' ? t('sickCall') : r.type === 'dayoff' ? t('dayOff') : t('shiftSwap')}</div>
              <div className="meta">{r.date} · {r.reason || '—'}</div>
            </div>
            <Badge label={r.status} type={r.status === 'approved' ? 'success' : r.status === 'declined' ? 'danger' : 'pending'} />
          </div>
        ))}
      </div>

      {mode && (
        <RequestModal
          type={mode}
          staffId={staffId}
          staff={staff}
          onClose={() => setMode(null)}
          onSubmit={async (data) => {
            try {
              await onSubmitRequest(data);
              setMode(null); toast(t('requestSubmitted'));
            } catch (e) { toast(e.message || t('couldNotSubmitRequest')); }
          }}
        />
      )}
    </div>
  );
}

function RequestModal({ type, staffId, staff, onClose, onSubmit }) {
  const { t } = useT();
  const [f, setF] = useState({
    type, staffId, date: '', reason: '', swapWith: '', swapDay: '',
  });
  const titleMap = { sick: t('callInSick'), dayoff: t('requestDayOff'), swap: t('requestSwap') };
  const others = staff.filter(s => s.id !== staffId);

  return (
    <Modal title={titleMap[type]} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
        <div className="field"><label>{t('date')}</label>
          <input className="input" type="date" required value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
        {type === 'swap' && (
          <>
            <div className="field"><label>{t('swapWith')}</label>
              <select className="select" value={f.swapWith} onChange={e => setF({ ...f, swapWith: e.target.value })}>
                <option value="">{t('selectColleague')}</option>
                {others.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div className="field"><label>{t('theirDay')}</label>
              <input className="input" type="date" value={f.swapDay} onChange={e => setF({ ...f, swapDay: e.target.value })} /></div>
          </>
        )}
        <div className="field"><label>{type === 'sick' ? t('reason') : t('noteOptional')}</label>
          <textarea className="textarea" value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary"><Send size={14} /> {t('submit')}</button>
        </div>
      </form>
    </Modal>
  );
}

function StaffProfileView({ staff, staffId, violations, sops, bookings, onLogout }) {
  const { t, lang } = useT();
  const me = staff.find(s => s.id === staffId);
  if (!me) return null;
  const myV = violations.filter(v => v.staffId === staffId);
  const sessionsThisWeek = bookings.filter(b => b.staffId === staffId).length;
  const locale = lang === 'id' ? 'id-ID' : 'en-US';

  return (
    <div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <Avatar initial={me.avatar} color={me.color} size={84} />
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, color: 'var(--emerald)' }}>{me.name}</div>
        <div className="meta">{me.role}</div>
        {me.birthday && <div className="meta" style={{ marginTop: 4 }}>{t('birthdayLabel')} {new Date(me.birthday).toLocaleDateString(locale, { month: 'long', day: 'numeric' })}</div>}
      </div>

      <div className="stats">
        <div className="stat"><div className="v">{sessionsThisWeek}</div><div className="l">{t('sessionsTodayStat')}</div></div>
        <div className="stat"><div className="v">{me.schedule?.length || 0}</div><div className="l">{t('daysWeek')}</div></div>
        <div className="stat"><div className="v">{myV.length}</div><div className="l">{t('sopNotes')}</div></div>
      </div>

      <div className="card">
        <h3>{t('mySopNotes')}</h3>
        {myV.length === 0
          ? <div className="success-banner"><CheckCircle size={14} /> {t('cleanRecord')}</div>
          : myV.map(v => {
            const sop = sops.find(s => s.id === v.sopId);
            return (
              <div key={v.id} className="row">
                <AlertTriangle size={16} color="var(--warn)" />
                <div className="grow">
                  <div className="title">{sop ? sop.title : '—'}</div>
                  <div className="meta">{v.note || '—'} · {new Date(v.createdAt).toLocaleDateString(locale)}</div>
                </div>
              </div>
            );
          })}
      </div>

      {onLogout && (
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={onLogout}>
          <LogOut size={14} /> {t('signOut')}
        </button>
      )}
    </div>
  );
}

// ================= OWNER VIEW =================
function OwnerView({ staff, bookings, inventory, requests, violations, announcements }) {
  const { t, lang } = useT();
  const lowStock = inventory.filter(i => i.stock <= i.threshold);
  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  const avgPerDay = Math.round(totalRevenue / 7);
  const fmt = (n) => new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US').format(n);

  // Per-therapist totals + commission.
  const perStaff = staff.map(s => {
    const mine = bookings.filter(b => b.staffId === s.id);
    const rev = mine.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
    const rate = Number(s.commissionRate ?? 30) / 100;
    return { ...s, sessions: mine.length, revenue: rev, commission: Math.round(rev * rate) };
  }).sort((a, b) => b.revenue - a.revenue);
  const top = perStaff[0];

  return (
    <div>
      <div className="stats">
        <div className="stat"><div className="v">{bookings.length}</div><div className="l">{t('todaysBookings')}</div></div>
        <div className="stat"><div className="v">{staff.length}</div><div className="l">{t('teamSize')}</div></div>
        <div className="stat"><div className="v">{violations.length}</div><div className="l">{t('sopNotesStat')}</div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>{t('thisWeek')}</h3></div>
        <div className="row"><Calendar size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('revenue')}</div><div className="meta">IDR {fmt(totalRevenue)}</div></div></div>
        <div className="row"><Calendar size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('avgPerDay')}</div><div className="meta">IDR {fmt(avgPerDay)}</div></div></div>
        <div className="row"><CheckCircle size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('completed')}</div><div className="meta">{bookings.length} {t('sessionsToday').toLowerCase()}</div></div></div>
        {top && top.revenue > 0 && (
          <div className="row">
            <Avatar initial={top.avatar} color={top.color} size={32} />
            <div className="grow"><div className="title">{t('topTherapist')}</div><div className="meta">{top.name} · IDR {fmt(top.revenue)}</div></div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t('snapshot')}</h3>
        <div className="row"><Package size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('lowStockItems')}</div><div className="meta">{lowStock.length} {t('flagged')}</div></div></div>
        <div className="row"><Bell size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('pendingRequestsSnap')}</div><div className="meta">{requests.filter(r => r.status === 'pending').length}</div></div></div>
        <div className="row"><Megaphone size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('announcementsSent')}</div><div className="meta">{announcements.length}</div></div></div>
      </div>

      <div className="card">
        <h3>{t('team')} · {t('commission')}</h3>
        {perStaff.map(s => (
          <div key={s.id} className="row">
            <Avatar initial={s.avatar} color={s.color} size={32} />
            <div className="grow">
              <div className="title">{s.name}</div>
              <div className="meta">{s.sessions} {t('sessionsToday').toLowerCase()} · IDR {fmt(s.revenue)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--emerald)' }}>IDR {fmt(s.commission)}</div>
              <div className="meta" style={{ fontSize: 11 }}>{t('estEarnings')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= NAV =================
const MANAGER_NAV = [
  { id: 'dashboard',     labelKey: 'home',          icon: LayoutDashboard },
  { id: 'schedule',      labelKey: 'schedule',      icon: Calendar },
  { id: 'staff',         labelKey: 'staff',         icon: Users },
  { id: 'inventory',     labelKey: 'stock',         icon: Package },
  { id: 'alerts',        labelKey: 'alerts',        icon: Bell },
  { id: 'sop',           labelKey: 'sop',           icon: ShieldCheck },
  { id: 'announcements', labelKey: 'send',          icon: Megaphone },
];
const STAFF_NAV = [
  { id: 'today',    labelKey: 'today',    icon: Home },
  { id: 'schedule', labelKey: 'schedule', icon: Calendar },
  { id: 'inbox',    labelKey: 'inbox',    icon: Inbox },
  { id: 'profile',  labelKey: 'profile',  icon: User },
];
const OWNER_NAV = [
  { id: 'overview', labelKey: 'home', icon: Gem },
];

// ================= APP =================
function AppInner() {
  const { t } = useT();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => setToastMsg(m);

  const authed = !!user;
  const onboarded = !!(user?.role && user?.businessType);

  const staff         = useCollection('/api/staff',         authed);
  const bookings      = useCollection('/api/bookings',      onboarded);
  const inventory     = useCollection('/api/inventory',     onboarded);
  const requests      = useCollection('/api/requests',      onboarded);
  const announcements = useCollection('/api/announcements', onboarded);
  const violations    = useCollection('/api/violations',    onboarded);
  const sops          = useCollection('/api/sop',           onboarded);

  const reloadAll = () => {
    staff.reload(); bookings.reload(); inventory.reload();
    requests.reload(); announcements.reload(); violations.reload();
  };

  const submitRequest = async (data) => {
    await api('/api/requests', { method: 'POST', body: data });
    requests.reload();
  };

  // On mount: restore session if token present.
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthChecking(false); return; }
    api('/api/auth/me')
      .then(u => { setUser(u); setAuthChecking(false); })
      .catch(() => { setToken(null); setAuthChecking(false); });
  }, []);

  // Listen for 401s from other requests.
  useEffect(() => {
    const handler = () => { setUser(null); setRole(null); };
    window.addEventListener('opus:unauth', handler);
    return () => window.removeEventListener('opus:unauth', handler);
  }, []);

  // When user logs in: managers pick a role; non-managers go straight to staff view.
  useEffect(() => {
    if (!user) { setRole(null); return; }
    if (user.role === 'staff') setRole('staff');
    else if (user.role === 'manager') setRole('manager');
  }, [user]);

  // Tab reset when role changes.
  useEffect(() => {
    if (role === 'manager') setTab('dashboard');
    if (role === 'staff')   setTab('today');
    if (role === 'owner')   setTab('overview');
  }, [role]);

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch {}
    setToken(null);
    setUser(null);
    setRole(null);
  };

  if (authChecking) {
    return (
      <div className="role-screen">
        <div className="center-muted">
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuthed={setUser} />;
  if (!user.businessType) return <BusinessSelector user={user} onSelected={setUser} onLogout={logout} />;
  if (!role) return <RoleSelector user={user} staff={staff.data} onSelected={(u) => { setUser(u); setRole(u.role || 'manager'); }} onLogout={logout} />;

  const currentStaffId = user.id;

  const nav = role === 'manager' ? MANAGER_NAV : role === 'staff' ? STAFF_NAV : OWNER_NAV;
  const lowStockCount = inventory.data.filter(i => i.stock <= i.threshold).length;
  const pendingCount  = requests.data.filter(r => r.status === 'pending').length;
  const alertBadge    = lowStockCount + pendingCount;

  const anyLoading = staff.loading || bookings.loading || inventory.loading
    || requests.loading || announcements.loading || violations.loading || sops.loading;
  const anyError = staff.error || bookings.error || inventory.error
    || requests.error || announcements.error || violations.error || sops.error;

  const navItem = nav.find(n => n.id === tab);
  const pageTitle = navItem ? t(navItem.labelKey) : tab;

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="brand">Spa<span className="dot">·</span>Pilot</div>
          <div className="sub">{t(role)} · {(user.email || '').split('@')[0]}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LangToggle />
          {user.role === 'manager' && (
            <button className="switch" onClick={() => setRole(null)} aria-label="switch role">
              {t('switch')}
            </button>
          )}
          <button className="switch" onClick={logout} aria-label="sign out">
            <LogOut size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {t('signOut')}
          </button>
        </div>
      </header>

      <main className="page fade" key={tab}>
        <div className="page-title">{pageTitle}</div>

        <LoadState loading={anyLoading} error={anyError} reload={reloadAll}>
          {role === 'manager' && (
            <>
              {tab === 'dashboard' && (
                <ManagerDashboard
                  staff={staff.data} bookings={bookings.data} inventory={inventory.data}
                  requests={requests.data} announcements={announcements.data} violations={violations.data}
                  onGoto={setTab} onReload={inventory.reload} toast={toast}
                />
              )}
              {tab === 'schedule' && (
                <ScheduleTab bookings={bookings.data} staff={staff.data} onReload={bookings.reload} toast={toast} />
              )}
              {tab === 'staff' && (
                <StaffTab staff={staff.data} violations={violations.data} onReload={staff.reload} toast={toast} />
              )}
              {tab === 'inventory' && (
                <InventoryTab inventory={inventory.data} onReload={inventory.reload} toast={toast} />
              )}
              {tab === 'alerts' && (
                <AlertsTab
                  inventory={inventory.data} requests={requests.data} staff={staff.data} bookings={bookings.data}
                  onReload={() => { requests.reload(); bookings.reload(); }} toast={toast}
                />
              )}
              {tab === 'sop' && (
                <SOPTab sops={sops.data} staff={staff.data} violations={violations.data}
                  onReload={violations.reload} toast={toast} />
              )}
              {tab === 'announcements' && (
                <AnnouncementsTab announcements={announcements.data} onReload={announcements.reload} toast={toast} user={user} />
              )}
            </>
          )}

          {role === 'staff' && (
            <>
              {tab === 'today' && (
                <StaffTodayView staff={staff.data} bookings={bookings.data} staffId={currentStaffId} sops={sops.data}
                  onSubmitRequest={submitRequest} toast={toast} />
              )}
              {tab === 'schedule' && (
                <StaffScheduleView staff={staff.data} bookings={bookings.data} staffId={currentStaffId} />
              )}
              {tab === 'inbox' && (
                <StaffInboxView
                  announcements={announcements.data} staffId={currentStaffId} staff={staff.data}
                  requests={requests.data} onSubmitRequest={submitRequest} toast={toast}
                />
              )}
              {tab === 'profile' && (
                <StaffProfileView staff={staff.data} staffId={currentStaffId}
                  violations={violations.data} sops={sops.data} bookings={bookings.data}
                  onLogout={logout} />
              )}
            </>
          )}

          {role === 'owner' && (
            <OwnerView
              staff={staff.data} bookings={bookings.data} inventory={inventory.data}
              requests={requests.data} violations={violations.data} announcements={announcements.data}
            />
          )}
        </LoadState>
      </main>

      <nav className="bottom-nav">
        {nav.map(item => {
          const Icon = item.icon;
          const active = tab === item.id;
          const badge = item.id === 'alerts' ? alertBadge : 0;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{t(item.labelKey)}</span>
              {active && <span className="dot" />}
              {badge > 0 && <span className="badge-dot">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <Toast payload={toastMsg} onDone={() => setToastMsg(null)} />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
