import { useState, useEffect, useCallback, createContext, useContext, useMemo, useRef } from 'react';
import {
  Calendar, Users, Package, LayoutDashboard, AlertTriangle,
  CheckCircle, RefreshCw, Bell, User, ShieldCheck, Send, Home, Inbox,
  Plus, Trash2, Edit2, X, LogOut, Megaphone, PhoneCall, CalendarOff,
  Repeat, Leaf, Sparkles, Gem, Check, Lock,
  Building2, Mail, Search, Download, Globe,
} from 'lucide-react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'opus_token';
const LANG_KEY = 'opus_lang';
const BRAND = 'Opus';
const TOUR_DONE_KEY = 'spapilot-tutorial-done-v2';
const DEMO_KEY = 'spapilot-demo-mode';
const ONBOARD_PREFS_KEY = 'spapilot-onboarding-prefs';
const ONBOARD_DONE_KEY = 'spapilot-onboarding-done';

// ---------- Onboarding quiz prefs ----------
// Quiz answers customize the app: solo owners hide Staff tab, "scheduling chaos"
// users land on Schedule first, etc. Stored client-side; backend not required.
const getOnboardPrefs = () => {
  try { return JSON.parse(localStorage.getItem(ONBOARD_PREFS_KEY)) || {}; }
  catch { return {}; }
};
const setOnboardPrefs = (p) => localStorage.setItem(ONBOARD_PREFS_KEY, JSON.stringify(p));
const isOnboardDone = () => localStorage.getItem(ONBOARD_DONE_KEY) === 'true';
const markOnboardDone = () => localStorage.setItem(ONBOARD_DONE_KEY, 'true');

// Derive customizations from quiz answers.
// Solo owner has no team to manage — drop the Staff tab.
function deriveExtraHiddenTabs(prefs) {
  const extra = [];
  if (prefs.teamSize === 'solo') extra.push('staff');
  return extra;
}
// Land user on whichever tab maps to their #1 struggle.
function deriveDefaultTab(prefs) {
  const map = {
    scheduling:    'schedule',
    noshows:       'alerts',
    inventory:     'inventory',
    revenue:       'dashboard',
    compliance:    'sop',
    communication: 'announcements',
  };
  return map[prefs.mainStruggle] || 'dashboard';
}

// ---------- Demo mode ----------
// Lets visitors try the full app without signing up. All "API calls" are
// intercepted client-side and read/write to localStorage. Refresh keeps data.
// Sign-up is the only path that hits the real backend.
const isDemo = () => typeof window !== 'undefined' && localStorage.getItem(DEMO_KEY) === 'true';
const setDemo = (v) => v ? localStorage.setItem(DEMO_KEY, 'true') : localStorage.removeItem(DEMO_KEY);
const DEMO_COLL_KEY = (path) => `spapilot-demo${path}`;
const getDemoColl = (path) => {
  try { return JSON.parse(localStorage.getItem(DEMO_COLL_KEY(path))) ?? null; }
  catch { return null; }
};
const setDemoColl = (path, data) => localStorage.setItem(DEMO_COLL_KEY(path), JSON.stringify(data));

const DEMO_TYPE_KEY = 'spapilot-demo-type'; // remembers which biz-type demo
const getDemoType = () => (typeof window !== 'undefined' && localStorage.getItem(DEMO_TYPE_KEY)) || 'spa';

// Demo seed data per business type — visitor sees realistic data for their industry
const DEMO_SEEDS = {
  spa: {
    business: { id: 999, name: 'Sunset Wellness Spa', type: 'spa', code: 'DEMO00' },
    staff: [
      { id: 1, name: 'Sarah Kim',    role: 'Senior Therapist',  avatar: 'S', color: '#5b8a72', schedule: ['Mon','Tue','Wed','Thu','Fri'], commissionRate: 35, phone: '+15551234567', birthday: '1990-04-12' },
      { id: 2, name: 'Mike Chen',    role: 'Massage Therapist', avatar: 'M', color: '#b8956a', schedule: ['Tue','Wed','Thu','Fri','Sat'], commissionRate: 30, phone: '+15552345678', birthday: '1988-09-03' },
      { id: 3, name: 'Aisha Patel',  role: 'Esthetician',       avatar: 'A', color: '#c66956', schedule: ['Mon','Wed','Thu','Fri','Sat'], commissionRate: 30, phone: '+15553456789', birthday: '1992-11-22' },
    ],
    bookings: [
      { id: 1, time: '09:00', client: 'Emma Wilson',  clientPhone: '+15558881111', treatment: '60min Swedish Massage', duration: 60, staffId: 1, price: 80,  notes: '', allergies: '' },
      { id: 2, time: '10:30', client: 'James Lee',    clientPhone: '+15558882222', treatment: 'Hot Stone Therapy',     duration: 90, staffId: 2, price: 120, notes: '', allergies: '' },
      { id: 3, time: '13:00', client: 'Maria Garcia', clientPhone: '+15558883333', treatment: 'Deep Cleansing Facial', duration: 60, staffId: 3, price: 75,  notes: '', allergies: 'lavender' },
      { id: 4, time: '15:00', client: 'David Brown',  clientPhone: '+15558884444', treatment: 'Aromatherapy',          duration: 75, staffId: 1, price: 95,  notes: '', allergies: '' },
    ],
    inventory: [
      { id: 1, name: 'Lavender Massage Oil', category: 'Oils',     stock: 3,  threshold: 5,  unit: 'bottles', supplier: 'Aroma Co' },
      { id: 2, name: 'Bath Towels',          category: 'Linens',   stock: 25, threshold: 10, unit: 'pcs',     supplier: 'Linen Co' },
      { id: 3, name: 'Face Masks',           category: 'Skincare', stock: 12, threshold: 8,  unit: 'boxes',   supplier: 'Glow Lab' },
      { id: 4, name: 'Cotton Pads',          category: 'Skincare', stock: 2,  threshold: 10, unit: 'packs',   supplier: 'Glow Lab' },
    ],
    sops: [
      { id: 1, title: 'Sanitize work surfaces', category: 'Hygiene', description: 'Clean all tables and equipment between clients with disinfectant.', body: 'Clean all tables and equipment between clients with disinfectant.' },
      { id: 2, title: 'Wash hands before sessions', category: 'Hygiene', description: 'Always wash hands with soap for 20+ seconds.', body: 'Always wash hands with soap for 20+ seconds.' },
    ],
  },
  gym: {
    business: { id: 999, name: 'Iron Pulse Fitness', type: 'gym', code: 'DEMO00' },
    staff: [
      { id: 1, name: 'Marcus Rivera', role: 'Head Trainer',         avatar: 'M', color: '#5b8a72', schedule: ['Mon','Tue','Wed','Thu','Fri'], commissionRate: 25, phone: '+15551111111', birthday: '1985-06-15' },
      { id: 2, name: 'Lila Park',     role: 'Yoga Instructor',      avatar: 'L', color: '#b8956a', schedule: ['Mon','Wed','Fri','Sat','Sun'], commissionRate: 25, phone: '+15552222222', birthday: '1991-03-08' },
      { id: 3, name: 'Tom Mueller',   role: 'Personal Trainer',     avatar: 'T', color: '#c66956', schedule: ['Tue','Wed','Thu','Fri','Sat'], commissionRate: 25, phone: '+15553333333', birthday: '1989-11-30' },
    ],
    bookings: [
      { id: 1, time: '07:00', client: 'Group of 8',     clientPhone: '',             treatment: 'HIIT Bootcamp',     duration: 45, staffId: 1, price: 25, notes: '8 members', allergies: '' },
      { id: 2, time: '09:00', client: 'Alex Johnson',   clientPhone: '+15558881111', treatment: '1-on-1 Strength',   duration: 60, staffId: 3, price: 70, notes: 'Member #145', allergies: '' },
      { id: 3, time: '12:00', client: 'Group of 12',    clientPhone: '',             treatment: 'Vinyasa Flow Yoga', duration: 60, staffId: 2, price: 20, notes: '12 members', allergies: '' },
      { id: 4, time: '17:30', client: 'Kim Davis',      clientPhone: '+15558882222', treatment: '1-on-1 PT',         duration: 60, staffId: 3, price: 70, notes: 'Member #210', allergies: '' },
    ],
    inventory: [
      { id: 1, name: 'Resistance Bands', category: 'Equipment', stock: 18, threshold: 10, unit: 'pcs', supplier: 'Fit Supply' },
      { id: 2, name: 'Yoga Mats',        category: 'Equipment', stock: 6,  threshold: 12, unit: 'pcs', supplier: 'Fit Supply' },
      { id: 3, name: 'Towels',           category: 'Linens',    stock: 40, threshold: 20, unit: 'pcs', supplier: 'Linen Co' },
      { id: 4, name: 'Disinfectant Spray', category: 'Cleaning', stock: 3, threshold: 5, unit: 'bottles', supplier: 'Clean Co' },
    ],
    sops: [
      { id: 1, title: 'Wipe down equipment after each set', category: 'Hygiene', description: 'Members must wipe equipment with disinfectant after every use.', body: 'Members must wipe equipment with disinfectant after every use.' },
      { id: 2, title: 'Check member ID at entry', category: 'Security', description: 'Scan or visually check member ID before letting anyone in.', body: 'Scan or visually check member ID before letting anyone in.' },
    ],
  },
  clinic: {
    business: { id: 999, name: 'Greenwood Family Clinic', type: 'clinic', code: 'DEMO00' },
    staff: [
      { id: 1, name: 'Dr. Anna Lewis', role: 'Family Physician',  avatar: 'A', color: '#5b8a72', schedule: ['Mon','Tue','Wed','Thu','Fri'], commissionRate: 0, phone: '+15551111111', birthday: '1978-04-03' },
      { id: 2, name: 'Nurse Beth',     role: 'Registered Nurse',  avatar: 'B', color: '#b8956a', schedule: ['Mon','Tue','Wed','Thu','Fri'], commissionRate: 0, phone: '+15552222222', birthday: '1985-07-19' },
      { id: 3, name: 'Dr. Raj Mehta',  role: 'Pediatrician',      avatar: 'R', color: '#c66956', schedule: ['Tue','Wed','Thu','Fri'],       commissionRate: 0, phone: '+15553333333', birthday: '1982-11-12' },
    ],
    bookings: [
      { id: 1, time: '09:00', client: 'John Carter',   clientPhone: '+15558881111', treatment: 'Annual physical',     duration: 30, staffId: 1, price: 150, notes: 'Patient #1042', allergies: 'penicillin' },
      { id: 2, time: '10:00', client: 'Lisa Tran',     clientPhone: '+15558882222', treatment: 'Vaccine consultation', duration: 20, staffId: 2, price: 60,  notes: 'Patient #2389', allergies: '' },
      { id: 3, time: '11:30', client: 'Tommy Park',    clientPhone: '+15558883333', treatment: 'Pediatric checkup',    duration: 30, staffId: 3, price: 120, notes: 'Patient #3104, age 7', allergies: '' },
      { id: 4, time: '14:00', client: 'Sandra White',  clientPhone: '+15558884444', treatment: 'Follow-up',           duration: 20, staffId: 1, price: 90,  notes: 'Patient #1067', allergies: '' },
    ],
    inventory: [
      { id: 1, name: 'Disposable Gloves', category: 'PPE',       stock: 8,   threshold: 20, unit: 'boxes', supplier: 'MedSupply' },
      { id: 2, name: 'Bandages',          category: 'First Aid', stock: 50,  threshold: 25, unit: 'pcs',   supplier: 'MedSupply' },
      { id: 3, name: 'Syringes',          category: 'Medical',   stock: 120, threshold: 50, unit: 'pcs',   supplier: 'MedSupply' },
      { id: 4, name: 'Hand Sanitizer',    category: 'Cleaning',  stock: 4,   threshold: 6,  unit: 'bottles', supplier: 'Clean Co' },
    ],
    sops: [
      { id: 1, title: 'Verify patient ID before treatment', category: 'Safety', description: 'Always verify name, DOB, and patient ID before any procedure.', body: 'Always verify name, DOB, and patient ID before any procedure.' },
      { id: 2, title: 'Document all medication administered', category: 'Compliance', description: 'Record dose, time, and patient response in chart immediately.', body: 'Record dose, time, and patient response in chart immediately.' },
    ],
  },
  hotel: {
    business: { id: 999, name: 'Cedar Bay Inn', type: 'hotel', code: 'DEMO00' },
    staff: [
      { id: 1, name: 'Diana Foster', role: 'Front Desk Manager', avatar: 'D', color: '#5b8a72', schedule: ['Mon','Tue','Wed','Thu','Fri'], commissionRate: 0, phone: '+15551111111', birthday: '1986-08-22' },
      { id: 2, name: 'Carlos Rey',   role: 'Concierge',          avatar: 'C', color: '#b8956a', schedule: ['Wed','Thu','Fri','Sat','Sun'], commissionRate: 0, phone: '+15552222222', birthday: '1990-02-14' },
      { id: 3, name: 'Mei Tanaka',   role: 'Housekeeping Lead',  avatar: 'M', color: '#c66956', schedule: ['Mon','Tue','Wed','Thu','Fri'], commissionRate: 0, phone: '+15553333333', birthday: '1984-12-01' },
    ],
    bookings: [
      { id: 1, time: '14:00', client: 'Robinson Family', clientPhone: '+15558881111', treatment: 'Suite 12 · 3 nights', duration: 0, staffId: 1, price: 540, notes: 'Late check-in expected', allergies: '' },
      { id: 2, time: '15:30', client: 'Luca Bianchi',    clientPhone: '+15558882222', treatment: 'Room 7 · 1 night',    duration: 0, staffId: 1, price: 180, notes: '', allergies: '' },
      { id: 3, time: '16:00', client: 'Chen Group',      clientPhone: '+15558883333', treatment: 'Rooms 21–23 · 2 nights', duration: 0, staffId: 1, price: 720, notes: '3 rooms booked together', allergies: '' },
    ],
    inventory: [
      { id: 1, name: 'Bath Towels',     category: 'Linens',    stock: 120, threshold: 60,  unit: 'pcs',    supplier: 'Linen Co' },
      { id: 2, name: 'Bed Sheets',      category: 'Linens',    stock: 45,  threshold: 30,  unit: 'sets',   supplier: 'Linen Co' },
      { id: 3, name: 'Shampoo Bottles', category: 'Toiletries', stock: 18, threshold: 30,  unit: 'pcs',    supplier: 'Hotel Supply' },
      { id: 4, name: 'Toilet Paper',    category: 'Supplies',   stock: 80, threshold: 50,  unit: 'rolls',  supplier: 'Hotel Supply' },
    ],
    sops: [
      { id: 1, title: 'Greet every guest by name at check-in', category: 'Service', description: 'Use guest name at least twice during check-in interaction.', body: 'Use guest name at least twice during check-in interaction.' },
      { id: 2, title: 'Inspect rooms after housekeeping', category: 'Quality', description: 'Front desk must verify each room post-cleaning before re-listing.', body: 'Front desk must verify each room post-cleaning before re-listing.' },
    ],
  },
};

const DEMO_USER = {
  id: 999, email: 'demo@example.com', role: 'manager', onboardingRole: 'owner',
  businessType: 'spa', businessId: 999,
  subscriptionStatus: 'trial', trialEndsAt: '2099-12-31T00:00:00Z',
};

// Resolve current demo business (varies by selected demo type)
const getDemoBusiness = () => DEMO_SEEDS[getDemoType()]?.business || DEMO_SEEDS.spa.business;

// Build the seed for current demo type. Each call returns a fresh object (don't mutate).
function buildDemoSeed() {
  const seed = DEMO_SEEDS[getDemoType()] || DEMO_SEEDS.spa;
  const today = new Date().toISOString().slice(0,10);
  return {
    '/api/staff':    seed.staff.map(s => ({ ...s, permissions: { canViewSchedule: true, canRequestTimeOff: true, canSwapShifts: true, canRequestStock: true, canRequestNewProducts: false, canMarkViolations: false, canPostAnnouncements: false } })),
    '/api/bookings': seed.bookings,
    '/api/inventory': seed.inventory,
    '/api/requests': [
      { id: 1, staffId: 2, type: 'sick',   date: today,         status: 'pending', reason: 'Flu symptoms — fever started this morning' },
      { id: 2, staffId: 3, type: 'dayoff', date: '2026-05-15',  status: 'pending', reason: 'Family event' },
    ],
    '/api/violations': [],
    '/api/announcements': [
      { id: 1, title: 'Welcome to your demo!', body: 'Click around — try the schedule, add a booking, check inventory. Everything you do is saved locally. Ready to use this for your business? Sign up free.', from: 'Demo', createdAt: new Date().toISOString() },
    ],
    '/api/sop': seed.sops,
  };
}

function initDemoData(type) {
  // If type provided, set it (entry point) and reset seed for fresh demo
  if (type) {
    localStorage.setItem(DEMO_TYPE_KEY, type);
    // Clear previous demo collections so new type's seed loads
    Object.keys(buildDemoSeed()).forEach(p => localStorage.removeItem(DEMO_COLL_KEY(p)));
  }
  const seed = buildDemoSeed();
  // Only seed if data not already present (preserve user changes across refresh).
  Object.entries(seed).forEach(([path, data]) => {
    if (getDemoColl(path) === null) setDemoColl(path, data);
  });
}
function clearDemoData() {
  setDemo(false);
  const seed = buildDemoSeed();
  Object.keys(seed).forEach((path) => localStorage.removeItem(DEMO_COLL_KEY(path)));
  localStorage.removeItem(DEMO_TYPE_KEY);
  // If demo planted a fake auth token, clear it so subsequent real API calls don't 401.
  if (localStorage.getItem(TOKEN_KEY) === 'demo-token') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Mock API for demo mode. Returns same shapes as real backend.
async function demoApi(path, opts = {}) {
  const method = opts.method || 'GET';
  // Simulate small network delay so loading states actually render briefly.
  await new Promise(r => setTimeout(r, 80));

  // Auth endpoints — adapt user.businessType to current demo type
  const demoUser = { ...DEMO_USER, businessType: getDemoType() };
  if (path === '/api/auth/me') return demoUser;
  if (path === '/api/auth/logout') { clearDemoData(); return {}; }
  if (path === '/api/auth/role') {
    // Reflect the role the user picked (manager or staff) so the demo actually switches views
    const requested = opts.body?.role || 'manager';
    const staffId = opts.body?.staffId;
    return { token: 'demo-token', user: { ...demoUser, role: requested, staffId: staffId || demoUser.staffId } };
  }
  if (path === '/api/auth/complete-tutorial') return {};
  if (path === '/api/auth/switch-onboarding') return { token: 'demo-token', user: demoUser };
  if (path === '/api/businesses/me') return getDemoBusiness();

  // Billing
  if (path === '/api/billing/subscribe' || path === '/api/billing/mock-activate') {
    return { user: demoUser };
  }

  // Collection list / create
  const collMatch = path.match(/^\/api\/(staff|bookings|inventory|requests|announcements|violations|sop)$/);
  if (collMatch) {
    const collPath = path;
    if (method === 'GET') return getDemoColl(collPath) || [];
    if (method === 'POST') {
      const coll = getDemoColl(collPath) || [];
      const item = { ...opts.body, id: Date.now(), createdAt: new Date().toISOString() };
      coll.push(item); setDemoColl(collPath, coll);
      return item;
    }
  }

  // Item update / delete
  const itemMatch = path.match(/^\/api\/(staff|bookings|inventory|requests|sop|violations|announcements)\/(\d+)$/);
  if (itemMatch) {
    const collPath = `/api/${itemMatch[1]}`;
    const id = Number(itemMatch[2]);
    const coll = getDemoColl(collPath) || [];
    if (method === 'PUT') {
      const idx = coll.findIndex(x => x.id === id);
      if (idx >= 0) { coll[idx] = { ...coll[idx], ...opts.body }; setDemoColl(collPath, coll); return coll[idx]; }
      return {};
    }
    if (method === 'DELETE') {
      setDemoColl(collPath, coll.filter(x => x.id !== id));
      return null;
    }
  }

  // Stock adjust
  const stockMatch = path.match(/^\/api\/inventory\/(\d+)\/stock$/);
  if (stockMatch && method === 'PATCH') {
    const id = Number(stockMatch[1]);
    const coll = getDemoColl('/api/inventory') || [];
    const item = coll.find(x => x.id === id);
    if (item) { item.stock = Math.max(0, item.stock + (opts.body?.delta || 0)); setDemoColl('/api/inventory', coll); }
    return item || {};
  }

  // Stock reorder mark
  const orderMatch = path.match(/^\/api\/inventory\/(\d+)\/order$/);
  if (orderMatch && method === 'POST') {
    const id = Number(orderMatch[1]);
    const coll = getDemoColl('/api/inventory') || [];
    const item = coll.find(x => x.id === id);
    if (item) { item.lastOrder = new Date().toISOString(); item.stock = item.threshold * 2; setDemoColl('/api/inventory', coll); }
    return item || {};
  }

  // Default: silently succeed
  return {};
}

const TOUR_STEPS = [
  { targetId: 'tab-dashboard',  message: "Your dashboard — today's overview is here",     position: 'top' },
  { targetId: 'tab-schedule',   message: 'Tap Schedule to manage all your bookings',      position: 'top' },
  { targetId: 'tab-staff',      message: 'Manage your team and their schedules here',     position: 'top' },
  { targetId: 'tab-inventory',  message: 'Track products and get low-stock alerts here',  position: 'top' },
  { targetId: 'tab-alerts',     message: 'Staff requests and notifications land here',    position: 'top' },
  { targetId: 'tab-sop',        message: 'View SOPs and log any violations here',        position: 'top' },
];

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
    client: 'Client', treatment: 'Service', time: 'Time', durationMin: 'Duration (min)',
    therapist: 'Provider', notes: 'Notes', rolePlaceholder: 'e.g. Manager, Stylist, Trainer',
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
    category: 'Category', stockLevel: 'Stock', threshold: 'Low Stock Alert', unit: 'Unit', supplier: 'Supplier',
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
    sickReasonRequired: 'Please explain why you are calling in sick.',
    sickCallNotice: 'Policy: call in sick at least 3 hours before your shift starts.',
    daysWeek: 'Days / week', mySopNotes: 'My SOP Notes', cleanRecord: 'Clean record — well done.',
    selectStaff: 'Select team member',
    search: 'Search', sortBy: 'Sort by', filterCategory: 'Filter category', allCategories: 'All',
    timeAsc: 'Time ↑', timeDesc: 'Time ↓', exportCsv: '⬇ Download Spreadsheet',
    language: 'Language', english: 'English', indonesian: 'Bahasa',
    failed: 'Failed', noResults: 'No results.',
    active: 'Active', leftLabel: 'left · quota',
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
    price: 'Price', staffPhone: 'Staff phone', whatsapp: 'WhatsApp',
    undo: 'Undo', restored: 'Restored',
    thisWeek: 'This Week', revenue: 'Revenue', completed: 'Completed',
    avgPerDay: 'Avg / day', topTherapist: 'Top Performer',
    commission: 'Commission', commissionRate: 'Commission rate (%)',
    estEarnings: 'Est. earnings', deferred: 'Coming soon',
    friction: 'Notes for your team:', waMsg: 'Hi, quick check-in from the team.',
    days: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
    forgotPassword: 'Forgot password?', sendResetLink: 'Send Reset Link',
    resetPassword: 'Reset Password', backToLogin: 'Back to login',
    resetLinkSent: 'If that email is registered, a reset link has been sent.',
    newPassword: 'New Password', passwordResetSuccess: 'Password reset. You can now log in.',
    requestStock: 'Request Stock', stockRequest: 'Stock Request',
    product: 'Product', quantityLabel: 'Quantity',
    stockRequestSubmitted: 'Stock request submitted',
    permissionsLabel: 'Permissions',
    permCanViewSchedule: 'Can view schedules',
    permCanRequestTimeOff: 'Can request time off',
    permCanSwapShifts: 'Can swap shifts',
    permCanRequestStock: 'Can request product stock',
    permCanRequestNewProducts: 'Can request new products',
    permCanMarkViolations: 'Can mark SOP violations',
    permCanPostAnnouncements: 'Can post announcements',
    emptyBookingsTitle: 'No bookings yet',
    emptyBookingsBody: 'Add your first appointment to see it on the schedule.',
    emptyInventoryTitle: 'No products yet',
    emptyInventoryBody: 'Track supplies, ingredients, or anything that runs out.',
    emptyStaffTitle: 'No team members yet',
    emptyStaffBody: 'Add the people who work with you so you can assign bookings.',
    emptySopTitle: 'No procedures yet',
    emptySopBody: 'Document the rules and routines your team should follow.',
    addFirstBooking: 'Add your first booking',
    addFirstProduct: 'Add your first product',
    addFirstTeamMember: 'Add your first team member',
    addFirstSop: 'Add your first procedure',
    addSopRule: 'Add Rule', sopRuleAdded: 'Rule added', sopRuleRemoved: 'Rule removed',
    removeSopRule: 'Remove this rule?', sopRuleTitle: 'Rule title', sopRuleDesc: 'Description (optional)',
    noSopsYetViolation: 'Add SOP rules first before logging a violation.',
    landingHero: 'Service business management made simple.',
    landingSub: 'Schedule staff, track inventory, manage operations, reduce chaos.',
    featSchedTitle: 'Scheduling',
    featSchedBody: 'Bookings, shifts, swaps, and reassignments — all in one calendar.',
    featOpsTitle: 'Operations',
    featOpsBody: 'Inventory tracking, low-stock alerts, daily checklists, SOPs.',
    featTeamTitle: 'Team Management',
    featTeamBody: 'Roles, permissions, time-off requests, sick calls, swap shifts.',
    startFreeTrial: 'No credit card, start free trial',
    haveAccount: 'Already have an account?',
    trialFinePrint: '7-day free trial',
    trialFinePrintSub: 'Then $19/month. Cancel anytime.',
    whatYouCanDo: 'What you can do',
    trialActiveBanner: 'Trial active — {n} days left',
    trialEndingSoon: 'Trial ends in {n} days',
    trialEnded: 'Trial ended',
    trialActiveUntil: 'Trial active until',
    chooseYourPath: 'How will you use this app?',
    iOwnBusiness: 'Set up my business',
    iOwnBusinessSub: 'Create your workspace and invite your team.',
    iWorkAsStaff: 'Join my team',
    iWorkAsStaffSub: 'Use a code to join your business.',
    setupBusiness: 'Set up your business',
    setupBusinessSub: 'A few details so we can build your workspace.',
    businessName: 'Business name',
    businessNamePh: 'e.g. Your Business Name',
    businessTypeLabel: 'Business type',
    bizTypeSpa: 'Spa', bizTypeSalon: 'Salon', bizTypeBarbershop: 'Barbershop',
    bizTypeGym: 'Gym', bizTypeHotel: 'Hotel', bizTypeClinic: 'Clinic', bizTypeOther: 'Other',
    numberOfStaff: 'Number of staff',
    createBusiness: 'Create business',
    joinBusiness: 'Join your business',
    joinBusinessSub: 'Enter the code your owner shared with you.',
    businessCode: 'Business code',
    businessCodePh: 'e.g. AB12CD',
    join: 'Join',
    invalidBusinessCode: 'Invalid business code',
    noCodeYet: "Don't have a code? Ask the business owner to share it.",
    paymentRequiredTitle: 'Trial ended',
    paymentRequiredSub: 'Subscribe to keep using your workspace.',
    subscribeMonthly: 'Subscribe — $19/month',
    subscribeNote: 'Secure checkout via Stripe. Cancel anytime.',
    settings: 'Settings',
    manageSubscription: 'Manage subscription',
    switchAccountType: 'Switch account type',
    confirmSwitchAccountType: 'Switching account type will require re-onboarding. Continue?',
    yourBusinessCode: 'Your business code',
    shareWithStaff: 'Share this code with your staff so they can join.',
    copy: 'Copy', copied: 'Copied',
    activated: 'Subscription activated',
    checklist: 'Checklist',
    checklistAdd: 'Add a task…',
    checklistEmpty: 'No tasks yet. Add one below.',
    tapThisTab: 'Tap this tab ↓',
    tutorialStep1Title: 'Welcome to your workspace',
    tutorialStep1Body: "Everything's set up. Let's show you where things live.",
    tutorialStep2Title: 'Schedule',
    tutorialStep2Body: 'Add appointments, bookings, and sessions here. This is the main calendar for your business.',
    tutorialStep3Title: 'Team',
    tutorialStep3Body: 'Add the people who work with you. Assign them to bookings and manage their shifts.',
    tutorialStep4Title: 'Stock',
    tutorialStep4Body: 'Track your supplies, products, and anything that runs low. Get alerts before you run out.',
    tutorialStep5Title: "You're all set",
    tutorialStep5Body: 'Start by adding your first team member or booking. Your dashboard will fill up from there.',
    tutorialNext: 'Next',
    tutorialGetStarted: 'Get started',
    tutorialSkip: 'Skip tour',
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
    client: 'Klien', treatment: 'Layanan', time: 'Waktu', durationMin: 'Durasi (menit)',
    therapist: 'Penyedia', notes: 'Catatan', rolePlaceholder: 'misal Manajer, Penata, Pelatih',
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
    category: 'Kategori', stockLevel: 'Stok', threshold: 'Peringatan Stok Rendah', unit: 'Unit', supplier: 'Pemasok',
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
    sickReasonRequired: 'Jelaskan mengapa Anda tidak bisa masuk.',
    sickCallNotice: 'Kebijakan: lapor sakit minimal 3 jam sebelum shift dimulai.',
    daysWeek: 'Hari / minggu', mySopNotes: 'Catatan SOP Saya', cleanRecord: 'Catatan bersih — kerja bagus.',
    selectStaff: 'Pilih anggota tim',
    search: 'Cari', sortBy: 'Urutkan', filterCategory: 'Filter kategori', allCategories: 'Semua',
    timeAsc: 'Waktu ↑', timeDesc: 'Waktu ↓', exportCsv: '⬇ Unduh Spreadsheet',
    language: 'Bahasa', english: 'English', indonesian: 'Bahasa',
    failed: 'Gagal', noResults: 'Tidak ada hasil.',
    active: 'Aktif', leftLabel: 'tersisa · kuota',
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
    price: 'Harga', staffPhone: 'Telp staf', whatsapp: 'WhatsApp',
    undo: 'Batalkan', restored: 'Dipulihkan',
    thisWeek: 'Minggu Ini', revenue: 'Pendapatan', completed: 'Selesai',
    avgPerDay: 'Rata-rata / hari', topTherapist: 'Staf Terbaik',
    commission: 'Komisi', commissionRate: 'Tingkat komisi (%)',
    estEarnings: 'Perkiraan pendapatan', deferred: 'Segera hadir',
    friction: 'Catatan untuk tim Anda:', waMsg: 'Halo, pemberitahuan singkat dari tim.',
    days: { Mon: 'Sen', Tue: 'Sel', Wed: 'Rab', Thu: 'Kam', Fri: 'Jum', Sat: 'Sab', Sun: 'Min' },
    forgotPassword: 'Lupa kata sandi?', sendResetLink: 'Kirim Link Reset',
    resetPassword: 'Reset Kata Sandi', backToLogin: 'Kembali ke login',
    resetLinkSent: 'Jika email terdaftar, link reset telah dikirim.',
    newPassword: 'Kata Sandi Baru', passwordResetSuccess: 'Kata sandi direset. Silakan masuk.',
    requestStock: 'Minta Stok', stockRequest: 'Permintaan Stok',
    product: 'Produk', quantityLabel: 'Jumlah',
    stockRequestSubmitted: 'Permintaan stok dikirim',
    permissionsLabel: 'Izin',
    permCanViewSchedule: 'Boleh lihat jadwal',
    permCanRequestTimeOff: 'Boleh minta cuti',
    permCanSwapShifts: 'Boleh tukar shift',
    permCanRequestStock: 'Boleh minta stok produk',
    permCanRequestNewProducts: 'Boleh minta produk baru',
    permCanMarkViolations: 'Boleh catat pelanggaran SOP',
    permCanPostAnnouncements: 'Boleh kirim pengumuman',
    emptyBookingsTitle: 'Belum ada pemesanan',
    emptyBookingsBody: 'Tambahkan janji pertama Anda untuk melihatnya di jadwal.',
    emptyInventoryTitle: 'Belum ada produk',
    emptyInventoryBody: 'Lacak persediaan, bahan, atau apa pun yang sering habis.',
    emptyStaffTitle: 'Belum ada anggota tim',
    emptyStaffBody: 'Tambahkan orang yang bekerja dengan Anda agar bisa diberi pemesanan.',
    emptySopTitle: 'Belum ada prosedur',
    emptySopBody: 'Dokumentasikan aturan dan rutinitas yang harus diikuti tim.',
    addFirstBooking: 'Tambah pemesanan pertama',
    addFirstProduct: 'Tambah produk pertama',
    addFirstTeamMember: 'Tambah anggota tim pertama',
    addFirstSop: 'Tambah prosedur pertama',
    addSopRule: 'Tambah Aturan', sopRuleAdded: 'Aturan ditambahkan', sopRuleRemoved: 'Aturan dihapus',
    removeSopRule: 'Hapus aturan ini?', sopRuleTitle: 'Judul aturan', sopRuleDesc: 'Deskripsi (opsional)',
    noSopsYetViolation: 'Tambahkan aturan SOP terlebih dahulu sebelum mencatat pelanggaran.',
    landingHero: 'Manajemen bisnis jasa dipermudah.',
    landingSub: 'Atur jadwal staf, lacak inventaris, kelola operasional, kurangi kekacauan.',
    featSchedTitle: 'Penjadwalan',
    featSchedBody: 'Pemesanan, shift, tukar, dan pengalihan — semua dalam satu kalender.',
    featOpsTitle: 'Operasional',
    featOpsBody: 'Lacak inventaris, peringatan stok rendah, daftar harian, SOP.',
    featTeamTitle: 'Manajemen Tim',
    featTeamBody: 'Peran, izin, permintaan cuti, lapor sakit, tukar shift.',
    startFreeTrial: 'Tanpa kartu kredit, mulai uji coba gratis',
    haveAccount: 'Sudah punya akun?',
    trialFinePrint: 'Uji coba 7 hari gratis',
    trialFinePrintSub: 'Lalu $19/bulan. Batal kapan saja.',
    whatYouCanDo: 'Apa yang bisa Anda lakukan',
    trialActiveBanner: 'Uji coba aktif — sisa {n} hari',
    trialEndingSoon: 'Uji coba berakhir dalam {n} hari',
    trialEnded: 'Uji coba berakhir',
    trialActiveUntil: 'Uji coba aktif hingga',
    chooseYourPath: 'Bagaimana Anda akan menggunakan aplikasi ini?',
    iOwnBusiness: 'Siapkan bisnis saya',
    iOwnBusinessSub: 'Buat ruang kerja Anda dan undang tim.',
    iWorkAsStaff: 'Gabung tim saya',
    iWorkAsStaffSub: 'Gunakan kode untuk bergabung.',
    setupBusiness: 'Siapkan bisnis Anda',
    setupBusinessSub: 'Beberapa detail untuk membangun ruang kerja Anda.',
    businessName: 'Nama bisnis',
    businessNamePh: 'misal Nama Bisnis Anda',
    businessTypeLabel: 'Jenis bisnis',
    bizTypeSpa: 'Spa', bizTypeSalon: 'Salon', bizTypeBarbershop: 'Pangkas Rambut',
    bizTypeGym: 'Gym', bizTypeHotel: 'Hotel', bizTypeClinic: 'Klinik', bizTypeOther: 'Lainnya',
    numberOfStaff: 'Jumlah staf',
    createBusiness: 'Buat bisnis',
    joinBusiness: 'Gabung bisnis Anda',
    joinBusinessSub: 'Masukkan kode dari pemilik.',
    businessCode: 'Kode bisnis',
    businessCodePh: 'misal AB12CD',
    join: 'Gabung',
    invalidBusinessCode: 'Kode bisnis tidak valid',
    noCodeYet: 'Belum punya kode? Minta dari pemilik bisnis.',
    paymentRequiredTitle: 'Uji coba berakhir',
    paymentRequiredSub: 'Berlangganan untuk terus menggunakan ruang kerja Anda.',
    subscribeMonthly: 'Berlangganan — $19/bulan',
    subscribeNote: 'Pembayaran aman via Stripe. Batal kapan saja.',
    settings: 'Pengaturan',
    manageSubscription: 'Kelola langganan',
    switchAccountType: 'Ganti jenis akun',
    confirmSwitchAccountType: 'Mengganti jenis akun memerlukan onboarding ulang. Lanjut?',
    yourBusinessCode: 'Kode bisnis Anda',
    shareWithStaff: 'Bagikan kode ini agar staf bisa bergabung.',
    copy: 'Salin', copied: 'Disalin',
    activated: 'Langganan diaktifkan',
    checklist: 'Daftar Tugas',
    checklistAdd: 'Tambah tugas…',
    checklistEmpty: 'Belum ada tugas. Tambahkan di bawah.',
    tapThisTab: 'Ketuk tab ini ↓',
    tutorialStep1Title: 'Selamat datang di ruang kerja Anda',
    tutorialStep1Body: 'Semuanya sudah siap. Kami akan tunjukkan di mana setiap fitur berada.',
    tutorialStep2Title: 'Jadwal',
    tutorialStep2Body: 'Tambahkan janji, pemesanan, dan sesi di sini. Ini kalender utama bisnis Anda.',
    tutorialStep3Title: 'Tim',
    tutorialStep3Body: 'Tambahkan orang yang bekerja dengan Anda. Atur shift dan tugaskan pemesanan.',
    tutorialStep4Title: 'Stok',
    tutorialStep4Body: 'Lacak persediaan dan produk Anda. Dapatkan peringatan sebelum kehabisan.',
    tutorialStep5Title: 'Semuanya siap',
    tutorialStep5Body: 'Mulai dengan menambahkan anggota tim atau pemesanan pertama Anda.',
    tutorialNext: 'Lanjut',
    tutorialGetStarted: 'Mulai',
    tutorialSkip: 'Lewati',
  },
};

const LangContext = createContext({ lang: 'en', t: (k) => k, setLang: () => {} });
const useT = () => useContext(LangContext);

// ---------- Business-type-aware terminology ----------
// Each business type uses different words for the same concepts.
// gym calls clients "Members", clinic calls them "Patients", hotel calls them "Guests".
const BIZ_LABELS = {
  spa:        { client: 'Client',   clientPlural: 'Clients',   staffMember: 'Therapist', staffPlural: 'Therapists', service: 'Treatment',   servicePlural: 'Treatments',   booking: 'Booking',     bookingPlural: 'Bookings',     todayCount: "Today's Bookings" },
  salon:      { client: 'Client',   clientPlural: 'Clients',   staffMember: 'Stylist',   staffPlural: 'Stylists',   service: 'Service',     servicePlural: 'Services',     booking: 'Appointment', bookingPlural: 'Appointments', todayCount: "Today's Appointments" },
  barbershop: { client: 'Client',   clientPlural: 'Clients',   staffMember: 'Barber',    staffPlural: 'Barbers',    service: 'Cut',         servicePlural: 'Services',     booking: 'Appointment', bookingPlural: 'Appointments', todayCount: "Today's Appointments" },
  gym:        { client: 'Member',   clientPlural: 'Members',   staffMember: 'Trainer',   staffPlural: 'Trainers',   service: 'Class',       servicePlural: 'Classes',      booking: 'Class',       bookingPlural: 'Classes',      todayCount: "Today's Classes" },
  hotel:      { client: 'Guest',    clientPlural: 'Guests',    staffMember: 'Staff',     staffPlural: 'Staff',      service: 'Stay',        servicePlural: 'Stays',        booking: 'Check-In',    bookingPlural: 'Check-Ins',    todayCount: "Today's Check-Ins" },
  clinic:     { client: 'Patient',  clientPlural: 'Patients',  staffMember: 'Provider',  staffPlural: 'Providers',  service: 'Appointment', servicePlural: 'Appointments', booking: 'Appointment', bookingPlural: 'Appointments', todayCount: "Today's Appointments" },
  other:      { client: 'Customer', clientPlural: 'Customers', staffMember: 'Staff',     staffPlural: 'Staff',      service: 'Service',     servicePlural: 'Services',     booking: 'Booking',     bookingPlural: 'Bookings',     todayCount: "Today's Bookings" },
};
// Tabs hidden by default per business type (user-overridable later via settings).
const BIZ_HIDDEN_TABS = {
  spa:        [],
  salon:      [],
  barbershop: ['sop'],
  gym:        ['sop'],            // gyms rarely run formal SOP compliance
  hotel:      [],
  clinic:     [],
  other:      ['sop'],
};
const BizContext = createContext({ business: null, labels: BIZ_LABELS.spa, hiddenTabs: [] });
const useBiz = () => useContext(BizContext);
function BizProvider({ business, prefs, children }) {
  const value = useMemo(() => {
    const type = business?.type || 'spa';
    const p = prefs || {};
    return {
      business,
      labels: BIZ_LABELS[type] || BIZ_LABELS.spa,
      hiddenTabs: [...(BIZ_HIDDEN_TABS[type] || []), ...deriveExtraHiddenTabs(p)],
      prefs: p,
    };
  }, [business, prefs]);
  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
}

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
  // Demo mode: short-circuit the network and serve from localStorage.
  if (isDemo()) return demoApi(path, opts);

  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...opts,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    // Network failures (server down, DNS, offline) produce TypeError "Failed to fetch".
    // Translate to a human-readable message so users know what to do.
    if (!navigator.onLine) {
      throw new Error("You're offline. Check your internet connection and try again.");
    }
    throw new Error("Can't reach the server. It may be starting up — please try again in a moment.");
  }
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('opus:unauth'));
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const d = await res.json(); msg = d.error || msg; } catch {}
    if (res.status >= 500) msg = `Server error (${res.status}). Please try again.`;
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
const STAFF_DEFAULT_PERMISSIONS = {
  canViewSchedule: true, canRequestTimeOff: true, canSwapShifts: true,
  canRequestStock: true, canRequestNewProducts: false,
  canMarkViolations: false, canPostAnnouncements: false,
};
const PERMISSION_DEFS = [
  { key: 'canViewSchedule',        labelKey: 'permCanViewSchedule' },
  { key: 'canRequestTimeOff',      labelKey: 'permCanRequestTimeOff' },
  { key: 'canSwapShifts',          labelKey: 'permCanSwapShifts' },
  { key: 'canRequestStock',        labelKey: 'permCanRequestStock' },
  { key: 'canRequestNewProducts',  labelKey: 'permCanRequestNewProducts' },
  { key: 'canMarkViolations',      labelKey: 'permCanMarkViolations' },
  { key: 'canPostAnnouncements',   labelKey: 'permCanPostAnnouncements' },
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

// ---------- Empty state ----------
function EmptyState({ icon: Icon, title, body, ctaLabel, onCta }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)' }}>
      {Icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px',
          background: 'var(--cream-2, #f3ebde)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={24} color="var(--emerald)" />
        </div>
      )}
      {title && (
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: 'var(--emerald)', marginBottom: 6 }}>
          {title}
        </div>
      )}
      {body && (
        <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 320, margin: '0 auto 14px' }}>
          {body}
        </div>
      )}
      {ctaLabel && onCta && (
        <button className="btn btn-primary btn-sm" onClick={onCta}>
          <Plus size={12} style={{ marginRight: 4 }} /> {ctaLabel}
        </button>
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
function LangToggle({ floating = false, large = false }) {
  const { lang, setLang, t } = useT();
  const langName = lang === 'en' ? 'English' : 'Bahasa';

  if (large) {
    return (
      <button
        onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
        aria-label="toggle language"
        title={lang === 'en' ? 'Bahasa Indonesia' : 'English'}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          fontSize: 14,
          fontWeight: 600,
          background: 'var(--cream, #faf6ed)',
          color: 'var(--emerald)',
          border: '1.5px solid var(--emerald)',
          borderRadius: 999,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <Globe size={16} />
        {t('language')}: {langName}
      </button>
    );
  }

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

// ---------- Auth screen: login + signup + forgot password ----------
function AuthScreen({ onAuthed, initialMode, onBack }) {
  const { t } = useT();
  const [mode, setMode] = useState(initialMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);

  const switchMode = (m) => { setMode(m); setErr(null); setForgotDone(false); };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (mode === 'forgot') {
      if (!email) { setErr(t('emailRequired')); return; }
      setBusy(true);
      try {
        await api('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim().toLowerCase() } });
        setForgotDone(true);
      } catch { setForgotDone(true); }
      finally { setBusy(false); }
      return;
    }
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
        <BrandMark sub={mode === 'forgot' ? t('forgotPassword') : mode === 'login' ? t('welcomeBack') : t('createWorkspace')} />

        {mode !== 'forgot' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              {mode === 'login' && <span style={{ marginRight: 6, fontSize: 11 }}>●</span>}
              {t('signIn')}
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              {mode === 'signup' && <span style={{ marginRight: 6, fontSize: 11 }}>●</span>}
              {t('createAccount')}
            </button>
          </div>
        )}

        {mode === 'forgot' && forgotDone ? (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <CheckCircle size={32} color="var(--emerald)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>{t('resetLinkSent')}</div>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => switchMode('login')}>{t('backToLogin')}</button>
          </div>
        ) : (
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
            {mode !== 'forgot' && (
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
            )}
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
              {busy ? t('pleaseWait') : mode === 'forgot' ? t('sendResetLink') : mode === 'login' ? t('signIn') : t('createAccount')}
            </button>
            {mode === 'login' && (
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 6, fontSize: 12 }}
                onClick={() => switchMode('forgot')}>
                {t('forgotPassword')}
              </button>
            )}
            {mode === 'forgot' && (
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 6 }}
                onClick={() => switchMode('login')}>
                {t('backToLogin')}
              </button>
            )}
          </form>
        )}

        <div style={{ marginTop: 18, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          <Sparkles size={11} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--gold)' }} />
          {t('demoAccount')} <strong>demo@opus.app</strong> / <strong>demo1234</strong>
        </div>
        {onBack && (
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12, fontSize: 12 }} onClick={onBack}>
            ← {t('back')}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Reset password screen (via email link) ----------
function ResetPasswordScreen({ token, onDone }) {
  const { t } = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr(t('passwordsDontMatch')); return; }
    if (password.length < 6) { setErr(t('passwordTooShort')); return; }
    setBusy(true);
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (e) {
      setErr(e.message || t('failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card">
        <BrandMark sub={t('resetPassword')} />
        {done ? (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <CheckCircle size={32} color="var(--emerald)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>{t('passwordResetSuccess')}</div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onDone}>{t('signIn')}</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 18 }}>
            <div className="field">
              <label>{t('newPassword')}</label>
              <div className="input-wrap">
                <Lock size={14} className="input-icon" />
                <input className="input input-with-icon" type="password" autoFocus placeholder={t('pwSignup')}
                  value={password} onChange={e => { setErr(null); setPassword(e.target.value); }} />
              </div>
            </div>
            <div className="field">
              <label>{t('confirmPassword')}</label>
              <div className="input-wrap">
                <Lock size={14} className="input-icon" />
                <input className="input input-with-icon" type="password" placeholder={t('confirmPassword')}
                  value={confirm} onChange={e => { setErr(null); setConfirm(e.target.value); }} />
              </div>
            </div>
            {err && <div className="error-banner" style={{ marginTop: 4 }}><AlertTriangle size={14} /> {err}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
              {busy ? t('pleaseWait') : t('resetPassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------- Landing page (pre-auth) ----------
function LandingPage({ onStartTrial, onSignIn, onTryDemo }) {
  const { t } = useT();
  const [showDemoPicker, setShowDemoPicker] = useState(false);
  const features = [
    { icon: Calendar, titleKey: 'featSchedTitle', bodyKey: 'featSchedBody' },
    { icon: Package,  titleKey: 'featOpsTitle',   bodyKey: 'featOpsBody' },
    { icon: Users,    titleKey: 'featTeamTitle',  bodyKey: 'featTeamBody' },
  ];
  return (
    <div className="role-screen">
      <LangToggle large />
      <div className="role-card" style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <BrandMark sub="" />
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, lineHeight: 1.25, marginTop: 14, color: 'var(--emerald)' }}>
            {t('landingHero')}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>
            {t('landingSub')}
          </p>
        </div>

        {/* Features as text list — not buttons. Read-only header section. */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
            {t('whatYouCanDo')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.titleKey} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Icon size={18} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--emerald)' }}>{t(f.titleKey)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 }}>{t(f.bodyKey)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing card — transparent, builds trust before CTA */}
        <div style={{
          marginBottom: 18, padding: '18px 18px',
          border: '1px solid var(--gold)', borderRadius: 14,
          background: 'linear-gradient(135deg, #fff8ec 0%, #fff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, color: 'var(--emerald)' }}>$19</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>/month, billed monthly</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 600, marginBottom: 10 }}>
            7-day free trial · No credit card required
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text)' }}>
            {[
              'Unlimited staff and bookings',
              'Inventory tracking with low-stock alerts',
              'Time-off, sick, and shift-swap requests',
              'CSV export of all data',
              'Cancel anytime — your data stays yours',
            ].map(line => (
              <div key={line} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Check size={13} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 3 }} />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: '16px 16px', fontSize: 16 }} onClick={onStartTrial}>
          <Sparkles size={16} style={{ marginRight: 8 }} /> {t('startFreeTrial')}
        </button>

        {/* Try Demo — picks biz type so demo data matches visitor's industry */}
        {!showDemoPicker ? (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 10, padding: '14px 16px', fontSize: 14, border: '1px solid var(--border)' }}
            onClick={() => setShowDemoPicker(true)}
          >
            ▶ Try the demo (no sign-up)
          </button>
        ) : (
          <div style={{ marginTop: 10, padding: 14, border: '1px solid var(--gold)', borderRadius: 12, background: '#fff8ec' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--emerald)', marginBottom: 8, textAlign: 'center' }}>
              Pick your business type for the demo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { id: 'spa',    icon: '🌿', label: 'Spa' },
                { id: 'gym',    icon: '🏋', label: 'Gym' },
                { id: 'clinic', icon: '⚕',  label: 'Clinic' },
                { id: 'hotel',  icon: '🏨', label: 'Hotel' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onTryDemo(opt.id)}
                  style={{
                    padding: '14px 8px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--cream)',
                    cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 600,
                    color: 'var(--emerald)',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowDemoPicker(false)}
              style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >Cancel</button>
          </div>
        )}

        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {t('trialFinePrint')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {t('trialFinePrintSub')}
          </div>
        </div>

        <div style={{ marginTop: 22, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          {t('haveAccount')}{' '}
          <button type="button"
            style={{ background: 'none', border: 'none', color: 'var(--emerald)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}
            onClick={onSignIn}>
            {t('signIn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- New role selector: owner vs staff ----------
function OnboardingRoleSelector({ user, onPickOwner, onPickStaff, onLogout }) {
  const { t } = useT();
  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card" style={{ maxWidth: 520 }}>
        <BrandMark sub={t('chooseYourPath')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
          <button className="role-card-btn" onClick={onPickOwner}
            style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, border: '1px solid var(--border)', borderRadius: 14, background: 'var(--cream)', cursor: 'pointer', textAlign: 'left' }}>
            <Building2 size={28} color="var(--emerald)" />
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'var(--emerald)' }}>{t('iOwnBusiness')}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{t('iOwnBusinessSub')}</div>
            </div>
          </button>
          <button className="role-card-btn" onClick={onPickStaff}
            style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, border: '1px solid var(--border)', borderRadius: 14, background: 'var(--cream)', cursor: 'pointer', textAlign: 'left' }}>
            <Users size={28} color="var(--gold)" />
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'var(--emerald)' }}>{t('iWorkAsStaff')}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{t('iWorkAsStaffSub')}</div>
            </div>
          </button>
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
          <span>{user?.email}</span>
          <button className="btn-link" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }} onClick={onLogout}>
            {t('signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Business owner onboarding ----------
function BusinessOwnerOnboarding({ onCreated, onBack, onLogout }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [type, setType] = useState('spa');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) { setErr(t('emailRequired')); return; }
    setBusy(true);
    try {
      const result = await api('/api/businesses', {
        method: 'POST',
        body: { name: name.trim(), type },
      });
      if (result.token) setToken(result.token);
      onCreated(result.user, result.business);
    } catch (e) { setErr(e.message || t('failed')); setBusy(false); }
  };

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card" style={{ maxWidth: 460 }}>
        <BrandMark sub={t('setupBusiness')} />
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>{t('setupBusinessSub')}</p>
        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <div className="field">
            <label>{t('businessName')}</label>
            <input className="input" autoFocus required value={name}
              placeholder={t('businessNamePh')}
              onChange={e => { setErr(null); setName(e.target.value); }} />
          </div>
          <div className="field">
            <label>{t('businessTypeLabel')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 4 }}>
              {[
                { id: 'spa',        icon: '🌿', label: t('bizTypeSpa') },
                { id: 'salon',      icon: '💇', label: t('bizTypeSalon') },
                { id: 'barbershop', icon: '💈', label: t('bizTypeBarbershop') },
                { id: 'gym',        icon: '🏋', label: t('bizTypeGym') },
                { id: 'hotel',      icon: '🏨', label: t('bizTypeHotel') },
                { id: 'clinic',     icon: '⚕', label: t('bizTypeClinic') },
                { id: 'other',      icon: '✦',  label: t('bizTypeOther') },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  style={{
                    padding: '14px 8px', borderRadius: 12,
                    border: type === opt.id ? '2px solid var(--emerald)' : '1px solid var(--border)',
                    background: type === opt.id ? 'var(--emerald-soft, #e8f3ee)' : 'var(--cream)',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: type === opt.id ? 'var(--emerald)' : 'var(--text)' }}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>
          {err && <div className="error-banner" style={{ marginTop: 4 }}><AlertTriangle size={14} /> {err}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            {busy ? t('saving') : t('createBusiness')}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>← {t('back')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>{t('signOut')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Staff onboarding (join with code) ----------
function StaffOnboarding({ onJoined, onBack, onSwitchToOwner, onLogout }) {
  const { t } = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!code.trim()) { setErr(t('invalidBusinessCode')); return; }
    setBusy(true);
    try {
      const result = await api('/api/businesses/join', {
        method: 'POST',
        body: { code: code.trim() },
      });
      if (result.token) setToken(result.token);
      onJoined(result.user, result.business);
    } catch (e) { setErr(e.message || t('invalidBusinessCode')); setBusy(false); }
  };

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card" style={{ maxWidth: 460 }}>
        <BrandMark sub={t('joinBusiness')} />
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>{t('joinBusinessSub')}</p>
        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <div className="field">
            <label>{t('businessCode')}</label>
            <input className="input" autoFocus required value={code}
              placeholder={t('businessCodePh')}
              style={{ textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'monospace' }}
              onChange={e => { setErr(null); setCode(e.target.value.toUpperCase()); }} />
          </div>
          {err && <div className="error-banner" style={{ marginTop: 4 }}><AlertTriangle size={14} /> {err}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            {busy ? t('saving') : t('join')}
          </button>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
            {t('noCodeYet')}{' '}
            <button type="button" className="btn-link"
              style={{ background: 'none', border: 'none', color: 'var(--emerald)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}
              onClick={onSwitchToOwner}>
              {t('iOwnBusiness')}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>← {t('back')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>{t('signOut')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Payment required (trial expired) ----------
function PaymentRequired({ user, onActivated, onLogout }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const subscribe = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { checkoutUrl } = await api('/api/billing/subscribe', { method: 'POST', body: {} });
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      // Stripe not configured: mock activate
      const { user: u } = await api('/api/billing/mock-activate', { method: 'POST', body: {} });
      onActivated(u);
    } catch (e) { setErr(e.message || t('failed')); setBusy(false); }
  };

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card" style={{ maxWidth: 440 }}>
        <BrandMark sub={t('paymentRequiredTitle')} />
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Lock size={36} color="var(--gold)" />
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>
            {t('paymentRequiredSub')}
          </p>
        </div>
        {err && <div className="error-banner" style={{ marginTop: 12 }}><AlertTriangle size={14} /> {err}</div>}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 18, padding: '14px 16px', fontSize: 14 }}
          disabled={busy} onClick={subscribe}>
          <Gem size={14} style={{ marginRight: 6 }} /> {busy ? t('pleaseWait') : t('subscribeMonthly')}
        </button>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          {t('subscribeNote')}
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
          <span>{user?.email}</span>
          <button className="btn-link" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }} onClick={onLogout}>
            {t('signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Settings drawer (subscription + switch role) ----------
function SettingsDrawer({ user, business, onClose, onSwitched, onActivated, toast }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / (24 * 60 * 60 * 1000))) : 0;
  const status = user?.subscriptionStatus || 'trial';

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(business?.code || ''); toast(t('copied')); } catch {}
  };

  const switchType = async () => {
    if (!window.confirm(t('confirmSwitchAccountType'))) return;
    setBusy(true);
    try {
      const { token, user: u } = await api('/api/auth/switch-onboarding', { method: 'POST', body: {} });
      if (token) setToken(token);
      onSwitched(u);
      onClose();
    } catch (e) { toast(e.message || t('failed')); setBusy(false); }
  };

  const activate = async () => {
    setBusy(true);
    try {
      const { user: u } = await api('/api/billing/mock-activate', { method: 'POST', body: {} });
      onActivated(u);
      toast(t('activated'));
    } catch (e) { toast(e.message || t('failed')); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={t('settings')} onClose={onClose}>
      <div className="field">
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('email')}</div>
        <div style={{ fontSize: 14 }}>{user?.email}</div>
      </div>

      {business && (
        <div className="field">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('businessName')}</div>
          <div style={{ fontSize: 14 }}>{business.name} <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {business.type}</span></div>
        </div>
      )}

      <div className="field">
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('manageSubscription')}</div>
        <div className="row" style={{ marginTop: 0 }}>
          <Gem size={16} color={status === 'active' ? 'var(--emerald)' : 'var(--gold)'} />
          <div className="grow">
            <div className="title" style={{ fontSize: 13 }}>
              {status === 'active' ? `${t('active')} — $19/month` : t('trialActiveBanner').replace('{n}', daysLeft)}
            </div>
            {status !== 'active' && trialEnd && (
              <div className="meta" style={{ fontSize: 11 }}>
                {t('trialActiveUntil')} {trialEnd.toLocaleDateString()}
              </div>
            )}
          </div>
          {status !== 'active' && (
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={activate}>
              {t('subscribeMonthly')}
            </button>
          )}
        </div>
      </div>

      {business && user?.onboardingRole === 'owner' && (
        <div className="field">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('yourBusinessCode')}</div>
          <div className="row" style={{ marginTop: 0 }}>
            <div className="grow">
              <div className="title" style={{ fontSize: 18, fontFamily: 'monospace', letterSpacing: 2 }}>{business.code}</div>
              <div className="meta" style={{ fontSize: 11 }}>{t('shareWithStaff')}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={copyCode}>{t('copy')}</button>
          </div>
        </div>
      )}

      <div className="field">
        <button className="btn btn-ghost" style={{ width: '100%' }} disabled={busy} onClick={switchType}>
          {t('switchAccountType')}
        </button>
      </div>

      <div className="field">
        <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={() => {
          localStorage.removeItem(TOUR_DONE_KEY);
          onClose();
          window.location.reload();
        }}>
          Restart tutorial
        </button>
      </div>

      <div className="field">
        <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={() => {
          localStorage.removeItem(ONBOARD_DONE_KEY);
          localStorage.removeItem(ONBOARD_PREFS_KEY);
          onClose();
          window.location.reload();
        }}>
          Retake setup quiz
        </button>
      </div>
    </Modal>
  );
}

// ---------- Demo banner ----------
function DemoBanner({ onExit }) {
  if (!isDemo()) return null;
  return (
    <div style={{
      background: '#fff8ec', borderBottom: '1px solid var(--gold)', color: 'var(--emerald)',
      padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    }}>
      <span>
        <strong>Demo mode</strong> — exploring with sample data. Sign up to save your work.
      </span>
      <button
        onClick={onExit}
        style={{ background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >Sign up free</button>
    </div>
  );
}

// ---------- Offline banner ----------
function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  if (!offline) return null;
  return (
    <div style={{
      background: '#fee', borderBottom: '1px solid #fbb', color: '#a00',
      padding: '8px 14px', fontSize: 12, textAlign: 'center', fontWeight: 600,
    }}>
      ⚠ You're offline — changes won't save until you reconnect
    </div>
  );
}

// ---------- Trial banner ----------
function TrialBanner({ user, onUpgrade }) {
  const { t } = useT();
  if (!user || user.subscriptionStatus === 'active') return null;
  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  if (!trialEnd) return null;
  const daysLeft = Math.max(0, Math.ceil((trialEnd - new Date()) / (24 * 60 * 60 * 1000)));
  if (daysLeft > 3) return null; // only show when 3 or fewer days left
  const label = daysLeft <= 0 ? t('trialEnded') : t('trialEndingSoon').replace('{n}', daysLeft);
  return (
    <div style={{ background: '#fef3e0', borderBottom: '1px solid #f5d8a4', padding: '8px 14px', fontSize: 12, color: 'var(--emerald)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span><AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {label}</span>
      <button className="btn btn-primary btn-sm" onClick={onUpgrade}>{t('subscribeMonthly')}</button>
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
            {staff.length === 0 ? (
              <div className="center-muted" style={{ padding: '20px 12px', fontSize: 14, lineHeight: 1.5 }}>
                No team members exist yet. Ask the manager to add you to the team first.
              </div>
            ) : (
              <div className="field">
                <label>{t('whichMember')}</label>
                <select className="select" value={staffId || ''} onChange={e => setStaffId(Number(e.target.value))}>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPicking(null)} disabled={busy}>{t('back')}</button>
              {staff.length > 0 && (
                <button className="btn btn-primary" onClick={() => pick('staff')} disabled={busy || !staffId}>
                  {busy ? t('saving') : t('continue')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            {roles.map(r => (
              <button key={r.id} className="role-btn" onClick={() => pick(r.id)} disabled={busy} data-tour={`role-${r.id}`}>
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
  const { labels } = useBiz();
  const lowStock = inventory.filter(i => i.stock <= i.threshold);
  const pending  = requests.filter(r => r.status === 'pending');
  const [busy, setBusy] = useState(false);
  const bookingLabel = labels.todayCount;

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
    { v: bookings.length, l: bookingLabel,       i: <Calendar size={16} /> },
    { v: staff.length,    l: t('activeStaff'),    i: <Users size={16} /> },
    { v: lowStock.length, l: t('lowStock'),       i: <Package size={16} /> },
  ];

  const CHECKLIST_KEY = 'app_checklist';
  const [checkItems, setCheckItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || []; }
    catch { return []; }
  });
  const [newTask, setNewTask] = useState('');

  const saveItems = (items) => {
    setCheckItems(items);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(items));
  };
  const toggleItem = (id) => saveItems(checkItems.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const addItem = () => {
    const text = newTask.trim();
    if (!text) return;
    saveItems([...checkItems, { id: Date.now(), text, done: false }]);
    setNewTask('');
  };
  const removeItem = (id) => saveItems(checkItems.filter(i => i.id !== id));

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
        <div className="card-head"><h3>Upcoming {labels.bookingPlural}</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoto('schedule')}>{t('viewAll')}</button>
        </div>
        {bookings.length === 0 ? (
          <div className="center-muted" style={{ padding: '20px 0', fontSize: 14 }}>
            No {labels.bookingPlural.toLowerCase()} yet. <button
              onClick={() => onGoto('schedule')}
              style={{ background: 'none', border: 'none', color: 'var(--emerald)', cursor: 'pointer', textDecoration: 'underline', fontSize: 14, padding: 0 }}
            >Add your first one →</button>
          </div>
        ) : bookings.slice(0, 5).map(b => {
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
        <div className="card-head"><h3>{t('checklist')}</h3></div>
        {checkItems.length === 0 && (
          <div className="center-muted" style={{ padding: '12px 0', fontSize: 14 }}>{t('checklistEmpty')}</div>
        )}
        {checkItems.map(item => (
          <div key={item.id} className="row" style={{ cursor: 'pointer' }} onClick={() => toggleItem(item.id)}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: '2px solid ' + (item.done ? 'var(--emerald)' : 'var(--line)'),
              background: item.done ? 'var(--emerald)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.done && <Check size={12} color="#fff" />}
            </div>
            <div className="grow" style={{
              textDecoration: item.done ? 'line-through' : 'none',
              color: item.done ? 'var(--muted)' : 'var(--ink)',
              fontSize: 15,
            }}>{item.text}</div>
            <button
              onClick={e => { e.stopPropagation(); removeItem(item.id); }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
              aria-label="remove"
            ><X size={14} /></button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            className="input"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder={t('checklistAdd')}
            style={{ flex: 1 }}
          />
          <button className="btn btn-sm" onClick={addItem} disabled={!newTask.trim()}
            style={{ padding: '0 14px', background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Plus size={16} />
          </button>
        </div>
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
  const { labels } = useBiz();
  const { t, lang } = useT();
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const dayCounts = useMemo(() => {
    const counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    bookings.forEach(b => {
      if (!b.date) return;
      const idx = new Date(b.date + 'T12:00:00').getDay();
      const key = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][idx];
      if (key in counts) counts[key]++;
    });
    return DAYS.map(d => ({ d, c: counts[d] }));
  }, [bookings]);

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
          <h3>Today's {labels.bookingPlural}</h3>
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
          query
            ? <div className="center-muted">{t('noResults')}</div>
            : <EmptyState
                icon={Calendar}
                title={`No ${labels.bookingPlural.toLowerCase()} yet`}
                body={`Add your first ${labels.booking.toLowerCase()} so your team knows what's coming up today.`}
                ctaLabel={`Add ${labels.booking}`}
                onCta={() => setModal('new')}
              />
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
              <div>{labels.bookingPlural.toLowerCase()}</div>
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
  const { labels, business } = useBiz();
  const showAllergies = ['spa', 'salon', 'clinic'].includes(business?.type || 'spa');
  const hasStaff = staff && staff.length > 0;
  const [f, setF] = useState(() => {
    if (!booking) return {
      time: '10:00', client: '', treatment: '', duration: 60,
      staffId: hasStaff ? staff[0].id : null,
      therapist: '',
      notes: '', allergies: '', clientPhone: '', price: 0,
    };
    return { ...booking, therapist: booking.therapist || '' };
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      // Coerce empty-string price + ensure staffId is sent (so bookings show up in per-staff views).
      // If staff exists but user typed a custom name in the fallback input, keep `therapist` text but
      // also pass `staffId` if it was selected from the dropdown.
      const body = {
        ...f,
        price: f.price === '' || f.price == null ? 0 : Number(f.price),
        staffId: f.staffId || null,
      };
      if (booking) await api(`/api/bookings/${booking.id}`, { method: 'PUT', body });
      else         await api('/api/bookings', { method: 'POST', body });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={booking ? `Edit ${labels.booking}` : `New ${labels.booking}`} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={14} />{err}</div>}
        <div className="field"><label>{labels.client}</label>
          <input className="input" required value={f.client} onChange={e => setF({ ...f, client: e.target.value })} /></div>
        <div className="field"><label>{labels.service}</label>
          <input className="input" required value={f.treatment} onChange={e => setF({ ...f, treatment: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>{t('time')}</label>
            <input className="input" type="time" required value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>{t('durationMin')}</label>
            <input className="input" type="number" value={f.duration} onChange={e => setF({ ...f, duration: Number(e.target.value) })} /></div>
        </div>
        {/* Staff picker — select from team if any exist, fallback to text input.
            Both keep the booking linked correctly: select sets staffId, text input is for ad-hoc names. */}
        <div className="field"><label>{labels.staffMember}</label>
          {hasStaff ? (
            <select
              className="select"
              value={f.staffId || ''}
              onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null;
                const name = staff.find(s => s.id === id)?.name || '';
                setF({ ...f, staffId: id, therapist: name });
              }}
            >
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <input
              className="input"
              placeholder={`${labels.staffMember} name (no team yet)`}
              value={f.therapist || ''}
              onChange={e => setF({ ...f, therapist: e.target.value })}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label>{labels.client} phone</label>
            <input className="input" type="tel" placeholder="Phone number" value={f.clientPhone || ''} onChange={e => setF({ ...f, clientPhone: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>{t('price')}</label>
            <input className="input" type="number" min="0" value={f.price ?? ''} onChange={e => setF({ ...f, price: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
        </div>
        {/* Allergies field only relevant for spa/salon/clinic. Hide for gym/hotel/barbershop/other. */}
        {showAllergies && (
          <div className="field"><label>{t('allergies')}</label>
            <input className="input" placeholder="e.g. lavender, nuts" value={f.allergies || ''} onChange={e => setF({ ...f, allergies: e.target.value })} /></div>
        )}
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
  const { labels } = useBiz();
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
          <h3>{labels.staffPlural}</h3>
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
        {filtered.length === 0 ? (
          query
            ? <div className="center-muted">{t('noResults')}</div>
            : <EmptyState
                icon={Users}
                title={`No ${labels.staffPlural.toLowerCase()} yet`}
                body={`Add the ${labels.staffPlural.toLowerCase()} who work with you so you can assign ${labels.bookingPlural.toLowerCase()}.`}
                ctaLabel={`Add your first ${labels.staffMember.toLowerCase()}`}
                onCta={() => setModal('new')}
              />
        ) : filtered.map(s => {
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
    name: '', role: '', avatar: '', color: COLOR_OPTIONS[0],
    birthday: '', schedule: ['Mon','Tue','Wed','Thu','Fri'], phone: '',
    commissionRate: 30, permissions: { ...STAFF_DEFAULT_PERMISSIONS },
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
          <input className="input" required value={f.role} placeholder={t('rolePlaceholder')}
            onChange={e => setF({ ...f, role: e.target.value })} /></div>
        <div className="field"><label>{t('birthday')}</label>
          <input className="input" type="date" value={f.birthday || ''} onChange={e => setF({ ...f, birthday: e.target.value })} /></div>
        <div className="field"><label>{t('staffPhone')}</label>
          <input className="input" type="tel" placeholder="Phone number" value={f.phone || ''} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
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
        <div className="field">
          <label>{t('permissionsLabel')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {PERMISSION_DEFS.map(p => {
              const val = f.permissions ? (p.key in f.permissions ? f.permissions[p.key] : STAFF_DEFAULT_PERMISSIONS[p.key]) : STAFF_DEFAULT_PERMISSIONS[p.key];
              return (
                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={!!val}
                    onChange={e => setF({ ...f, permissions: { ...STAFF_DEFAULT_PERMISSIONS, ...(f.permissions || {}), [p.key]: e.target.checked } })}
                  />
                  {t(p.labelKey)}
                </label>
              );
            })}
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
        {filtered.length === 0 ? (
          (query || cat)
            ? <div className="center-muted">{t('noResults')}</div>
            : <EmptyState
                icon={Package}
                title={t('emptyInventoryTitle')}
                body={t('emptyInventoryBody')}
                ctaLabel={t('addFirstProduct')}
                onCta={() => setModal('new')}
              />
        ) : filtered.map((i, idx) => {
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
                  <button className="btn btn-ghost btn-sm" onClick={() => markOrdered(i.id)} {...(idx === 0 ? { 'data-tour': 'btn-mark-ordered' } : {})}>{t('ordered')}</button>
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
    name: '', category: '', stock: 0, threshold: 5, unit: 'pcs', supplier: '',
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
          <div className="field" style={{ flex: 1 }}>
            <label>{t('threshold')} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>— alert when below</span></label>
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

function SOPTab({ sops, staff, violations, onReload, onReloadSops, toast }) {
  const { t } = useT();
  const [modal, setModal] = useState(false);     // 'violation' | 'sop' | null
  const counts = staff.map(s => ({
    ...s, count: violations.filter(v => v.staffId === s.id).length,
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  const delViolation = async (id) => {
    if (!window.confirm(t('removeViolation'))) return;
    try {
      await api(`/api/violations/${id}`, { method: 'DELETE' });
      toast(t('noteRemoved')); onReload();
    } catch (e) { toast(e.message || t('couldNotRemoveNote')); }
  };

  const delSop = async (id) => {
    if (!window.confirm(t('removeSopRule'))) return;
    try {
      await api(`/api/sop/${id}`, { method: 'DELETE' });
      toast(t('sopRuleRemoved')); onReloadSops && onReloadSops();
    } catch (e) { toast(e.message || t('failed')); }
  };

  return (
    <div>
      {/* SOP Rules list */}
      <div className="card">
        <div className="card-head">
          <h3>{t('sopTitle')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('sop')}>
            <Plus size={14} /> {t('addSopRule')}
          </button>
        </div>
        {sops.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t('emptySopTitle')}
            body={t('emptySopBody')}
            ctaLabel={t('addSopRule')}
            onCta={() => setModal('sop')}
          />
        ) : sops.map(s => (
          <div key={s.id} className="row">
            <ShieldCheck size={20} color="var(--gold)" />
            <div className="grow">
              <div className="title">{s.title}</div>
              {(s.category || s.description) && (
                <div className="meta">{[s.category, s.description].filter(Boolean).join(' · ')}</div>
              )}
            </div>
            <button className="btn-icon" onClick={() => delSop(s.id)} aria-label={t('delete')}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Log violation */}
      <div className="card">
        <div className="card-head">
          <h3>{t('logSopViolation')}</h3>
          <button className="btn btn-gold btn-sm" onClick={() => setModal('violation')} data-tour="action-sop">
            <Plus size={14} /> {t('log')}
          </button>
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
                <div className="meta">{sop ? sop.title : (v.note || '—')}{v.note && sop ? ` · ${v.note}` : ''}</div>
                <div className="meta" style={{ fontSize: 11 }}>{new Date(v.createdAt).toLocaleString()}</div>
              </div>
              <button className="btn-icon" onClick={() => delViolation(v.id)} aria-label={t('delete')}><Trash2 size={14} /></button>
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

      {modal === 'sop' && (
        <SOPRuleModal
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onReloadSops && onReloadSops(); toast(t('sopRuleAdded')); }}
        />
      )}
      {modal === 'violation' && (
        <ViolationModal
          staff={staff} sops={sops}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onReload(); toast(t('violationLogged')); }}
        />
      )}
    </div>
  );
}

function SOPRuleModal({ onClose, onSaved }) {
  const { t } = useT();
  const [f, setF] = useState({ title: '', category: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) { setErr('Rule title required'); return; }
    setSaving(true); setErr(null);
    try {
      await api('/api/sop', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={t('addSopRule')} onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="error-banner"><AlertTriangle size={14} /> {err}</div>}
        <div className="field">
          <label>{t('sopRuleTitle')}</label>
          <input className="input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })}
            placeholder="e.g. Arrive on time, Wear uniform…" autoFocus />
        </div>
        <div className="field">
          <label>{t('category')}</label>
          <input className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}
            placeholder="e.g. Punctuality, Appearance…" />
        </div>
        <div className="field">
          <label>{t('sopRuleDesc')}</label>
          <textarea className="textarea" value={f.body} onChange={e => setF({ ...f, body: e.target.value })}
            placeholder="Extra detail…" rows={3} />
        </div>
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

function ViolationModal({ staff, sops, onClose, onSaved }) {
  const { t } = useT();
  const [f, setF] = useState({ staffId: staff[0]?.id || '', sopId: sops[0]?.id || '', note: '' });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      await api('/api/violations', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  // No SOP rules yet — prompt to add them first
  if (!sops.length) return (
    <Modal title={t('logSopViolation')} onClose={onClose}>
      <div style={{ padding: '12px 0', color: 'var(--muted)', lineHeight: 1.6 }}>
        {t('noSopsYetViolation')}
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
      </div>
    </Modal>
  );

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

  const formatType = (k) => {
    if (k === 'sick') return t('sickCall');
    if (k === 'dayoff') return t('dayOff');
    if (k === 'stock_request') return t('stockRequest');
    return t('shiftSwap');
  };

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
                    <div className="meta">
                      {req.type === 'stock_request'
                        ? `${inventory.find(i => i.id === req.productId)?.name || 'Product'} · qty ${req.quantity}${req.reason ? ` · ${req.reason}` : ''}`
                        : `${req.date} · ${req.reason || t('noReason')}`}
                    </div>
                  </div>
                  <Badge label={formatType(req.type)} type="pending" />
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
  const [sop] = useState(() => sops[Math.floor(Math.random() * sops.length)] || null);
  const [sickModal, setSickModal] = useState(false);

  if (!me) return <div className="center-muted">{t('loadingProfile')}</div>;

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
        <>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={() => setSickModal(true)}
            aria-label={t('callOutSick')}
          >
            <PhoneCall size={14} /> {t('callOutSick')}
          </button>
          {sickModal && (
            <RequestModal
              type="sick"
              staffId={staffId}
              staff={staff}
              onClose={() => setSickModal(false)}
              onSubmit={async (data) => {
                try {
                  await onSubmitRequest(data);
                  setSickModal(false);
                  toast && toast(t('sickCallToday'));
                } catch (e) { toast && toast(e.message || t('couldNotSubmitRequest')); }
              }}
            />
          )}
        </>
      )}

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

function StaffInboxView({ announcements, staffId, staff, requests, inventory, onSubmitRequest, toast }) {
  const { t } = useT();
  const [mode, setMode] = useState(null);
  const [stockItem, setStockItem] = useState(null);
  const mine = requests.filter(r => r.staffId === staffId);
  const me = staff.find(s => s.id === staffId);
  const perms = { ...STAFF_DEFAULT_PERMISSIONS, ...(me?.permissions || {}) };
  const lowStock = (inventory || []).filter(i => i.stock <= i.threshold);

  return (
    <div>
      {(perms.canRequestTimeOff || perms.canSwapShifts || perms.canRequestStock) && (
        <div className="card">
          <div className="card-head"><h3>{t('quickActions')}</h3></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {perms.canRequestTimeOff && <button className="btn btn-ghost" style={{ flex: '1 1 auto' }} onClick={() => setMode('sick')}><PhoneCall size={14} /> {t('sick')}</button>}
            {perms.canRequestTimeOff && <button className="btn btn-ghost" style={{ flex: '1 1 auto' }} onClick={() => setMode('dayoff')}><CalendarOff size={14} /> {t('dayOffShort')}</button>}
            {perms.canSwapShifts && <button className="btn btn-ghost" style={{ flex: '1 1 auto' }} onClick={() => setMode('swap')}><Repeat size={14} /> {t('swap')}</button>}
            {perms.canRequestStock && <button className="btn btn-ghost" style={{ flex: '1 1 auto' }} onClick={() => setMode('stock_request')}><Package size={14} /> {t('requestStock')}</button>}
          </div>
        </div>
      )}

      {perms.canRequestStock && lowStock.length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--warn)' }}>
          <div className="card-head">
            <h3><Package size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--warn)' }} />{t('stockAlerts')} ({lowStock.length})</h3>
          </div>
          {lowStock.map(i => (
            <div key={i.id} className="row">
              <Package size={18} color="var(--warn)" />
              <div className="grow">
                <div className="title">{i.name}</div>
                <div className="meta">{i.stock} {i.unit} {t('leftLabel')} {i.threshold}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setStockItem(i)}>{t('requestStock')}</button>
            </div>
          ))}
        </div>
      )}

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
        <h3>{t('myRequests')}</h3>
        {mine.length === 0 ? <div className="center-muted">{t('noRequestsSubmitted')}</div> : mine.map(r => (
          <div key={r.id} className="row">
            <div className="grow">
              <div className="title">{r.type === 'sick' ? t('sickCall') : r.type === 'dayoff' ? t('dayOff') : r.type === 'stock_request' ? t('stockRequest') : t('shiftSwap')}</div>
              <div className="meta">
                {r.type === 'stock_request'
                  ? `${(inventory || []).find(i => i.id === r.productId)?.name || 'Product'} · qty ${r.quantity}`
                  : `${r.date || '—'} · ${r.reason || '—'}`}
              </div>
            </div>
            <Badge label={r.status} type={r.status === 'approved' ? 'success' : r.status === 'declined' ? 'danger' : 'pending'} />
          </div>
        ))}
      </div>

      {mode && mode !== 'stock_request' && (
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
      {(mode === 'stock_request' || stockItem) && (
        <StockRequestModal
          staffId={staffId}
          inventory={inventory || []}
          initialProductId={stockItem?.id}
          onClose={() => { setMode(null); setStockItem(null); }}
          onSubmit={async (data) => {
            try {
              await onSubmitRequest(data);
              setMode(null); setStockItem(null); toast(t('stockRequestSubmitted'));
            } catch (e) { toast(e.message || t('couldNotSubmitRequest')); }
          }}
        />
      )}
    </div>
  );
}

function RequestModal({ type, staffId, staff, onClose, onSubmit }) {
  const { t } = useT();
  const todayISO = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    type, staffId, date: type === 'sick' ? todayISO : '', reason: '', swapWith: '', swapDay: '',
  });
  const [err, setErr] = useState(null);
  const titleMap = { sick: t('callInSick'), dayoff: t('requestDayOff'), swap: t('requestSwap') };
  const others = staff.filter(s => s.id !== staffId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'sick' && !f.reason.trim()) {
      setErr(t('sickReasonRequired'));
      return;
    }
    setErr(null);
    onSubmit(f);
  };

  return (
    <Modal title={titleMap[type]} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {/* Policy notice for sick calls */}
        {type === 'sick' && (
          <div style={{
            background: '#fff8ec', border: '1px solid var(--gold)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 14,
            fontSize: 13, color: 'var(--ink)', lineHeight: 1.5,
          }}>
            ⏰ {t('sickCallNotice')}
          </div>
        )}
        {err && <div className="error-banner"><AlertTriangle size={14} /> {err}</div>}
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
        <div className="field">
          <label>{type === 'sick' ? t('reason') : t('noteOptional')}</label>
          <textarea
            className="textarea"
            value={f.reason}
            onChange={e => { setErr(null); setF({ ...f, reason: e.target.value }); }}
            placeholder={type === 'sick' ? 'e.g. Fever, food poisoning, injury…' : ''}
            rows={type === 'sick' ? 3 : 2}
          />
          {type === 'sick' && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Required</div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary"><Send size={14} /> {t('submit')}</button>
        </div>
      </form>
    </Modal>
  );
}

function StockRequestModal({ staffId, inventory, initialProductId, onClose, onSubmit }) {
  const { t } = useT();
  const [f, setF] = useState({
    type: 'stock_request',
    staffId,
    productId: initialProductId || inventory[0]?.id || '',
    quantity: 1,
    reason: '',
  });

  return (
    <Modal title={t('requestStock')} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, productId: Number(f.productId) }); }}>
        <div className="field">
          <label>{t('product')}</label>
          <select className="select" value={f.productId} onChange={e => setF({ ...f, productId: e.target.value })}>
            {inventory.length === 0
              ? <option value="">No items</option>
              : inventory.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.stock} {i.unit} left)
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label>{t('quantityLabel')}</label>
          <input className="input" type="number" min="1" required value={f.quantity}
            onChange={e => setF({ ...f, quantity: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label>{t('noteOptional')}</label>
          <textarea className="textarea" value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={inventory.length === 0}>
            <Send size={14} /> {t('submit')}
          </button>
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
  const { labels } = useBiz();
  const lowStock = inventory.filter(i => i.stock <= i.threshold);
  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  const avgPerDay = Math.round(totalRevenue / 7);
  const fmt = (n) => new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US').format(n);
  const currency = lang === 'id' ? 'IDR ' : '$';

  // Per-staff totals + commission.
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
        <div className="stat"><div className="v">{bookings.length}</div><div className="l">{labels.todayCount}</div></div>
        <div className="stat"><div className="v">{staff.length}</div><div className="l">{labels.staffPlural}</div></div>
        <div className="stat"><div className="v">{violations.length}</div><div className="l">{t('sopNotesStat')}</div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>{t('thisWeek')}</h3></div>
        <div className="row"><Calendar size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('revenue')}</div><div className="meta">{currency}{fmt(totalRevenue)}</div></div></div>
        <div className="row"><Calendar size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('avgPerDay')}</div><div className="meta">{currency}{fmt(avgPerDay)}</div></div></div>
        <div className="row"><CheckCircle size={16} color="var(--gold)" /><div className="grow"><div className="title">{t('completed')}</div><div className="meta">{bookings.length} {labels.bookingPlural.toLowerCase()}</div></div></div>
        {top && top.revenue > 0 && (
          <div className="row">
            <Avatar initial={top.avatar} color={top.color} size={32} />
            <div className="grow"><div className="title">{t('topTherapist')}</div><div className="meta">{top.name} · {currency}{fmt(top.revenue)}</div></div>
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
              <div className="meta">{s.sessions} {labels.bookingPlural.toLowerCase()} · {currency}{fmt(s.revenue)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--emerald)' }}>{currency}{fmt(s.commission)}</div>
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

// ================= TOUR OVERLAY (data-tour DOM targeting) =================
function TourOverlay({ onDone }) {
  // Filter tour steps to only include tabs visible for this business type.
  // (gym hides SOP, etc — pointing at hidden tabs would hang the tour.)
  const { hiddenTabs } = useBiz();
  const visibleSteps = useMemo(
    () => TOUR_STEPS.filter(s => !hiddenTabs.includes(s.targetId.replace(/^tab-/, ''))),
    [hiddenTabs]
  );
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  // Measure target element position live
  const measure = useCallback(() => {
    const target = visibleSteps[stepRef.current];
    if (!target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${target.targetId}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [visibleSteps]);

  // Recompute on step change, resize, scroll
  useEffect(() => {
    const tid = setTimeout(measure, 120); // wait for DOM after tab switch
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(tid);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, measure]);

  // Listen for clicks on the current target to advance
  useEffect(() => {
    const target = visibleSteps[stepRef.current];
    if (!target) return;
    const { targetId } = target;
    const handler = (e) => {
      if (e.target.closest(`[data-tour="${targetId}"]`)) {
        setTimeout(() => {
          const next = stepRef.current + 1;
          if (next < visibleSteps.length) setStep(next);
          else onDone();
        }, 150);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [step, onDone, visibleSteps]);

  const currentStep = visibleSteps[step];
  const PAD = 10;
  const GOLD = '#b8956a';

  // Compute arrow + tooltip positions from rect
  let arrowLeft = 0, arrowTop = 0, arrowRotate = 0;
  let tipLeft = 0, tipTop = 0;

  if (rect) {
    const cx = rect.left + rect.width / 2;
    // Always position above the element (pointing down at it)
    arrowLeft = cx - 20;
    arrowTop  = rect.top - 58;
    arrowRotate = 0; // SVG arrow points down by default
    // Tooltip above the arrow
    tipLeft = Math.min(Math.max(cx - 120, 8), window.innerWidth - 248);
    tipTop  = rect.top - 58 - 68;
  }

  return (
    <>
      {/* Spotlight cutout: box-shadow creates dark vignette, transparent hole reveals target */}
      {rect ? (
        <div style={{
          position: 'fixed',
          left: rect.left - PAD, top: rect.top - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          borderRadius: 14,
          background: 'transparent',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          zIndex: 9990,
          pointerEvents: 'none',
          transition: 'all 0.2s ease',
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9990, pointerEvents: 'none' }} />
      )}

      {/* Bouncing SVG arrow pointing at target */}
      {rect && (
        <div style={{
          position: 'fixed', zIndex: 9995, pointerEvents: 'none',
          left: arrowLeft, top: arrowTop,
          animation: 'tour-bounce 0.85s ease-in-out infinite',
          transform: `rotate(${arrowRotate}deg)`,
        }}>
          <svg width="40" height="52" viewBox="0 0 40 52">
            <line x1="20" y1="2" x2="20" y2="38" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
            <polyline points="8,28 20,44 32,28" fill="none" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Tooltip */}
      {rect && (
        <div style={{
          position: 'fixed', zIndex: 9996, pointerEvents: 'none',
          left: tipLeft, top: Math.max(tipTop, 8),
          background: '#1c1c1e',
          color: '#f5f0e8',
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 15, lineHeight: 1.55,
          padding: '12px 16px',
          borderRadius: 14,
          maxWidth: 240,
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {currentStep.message}
        </div>
      )}

      {/* No target found — fallback card */}
      {!rect && (
        <div style={{
          position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 9996, background: '#1c1c1e', color: '#f5f0e8',
          fontFamily: 'Fraunces, Georgia, serif',
          padding: '20px 28px', borderRadius: 18,
          maxWidth: 300, fontSize: 15, textAlign: 'center',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ marginBottom: 16, lineHeight: 1.6 }}>
            Navigate to find: <strong style={{ color: GOLD }}>{currentStep.message.toLowerCase()}</strong>
          </div>
          <button
            onClick={() => { const n = step + 1; if (n < visibleSteps.length) setStep(n); else onDone(); }}
            style={{
              background: GOLD, color: '#fff', border: 'none', borderRadius: 10,
              padding: '9px 20px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            }}
          >Skip this step →</button>
        </div>
      )}

      {/* Skip tour button */}
      <button
        onClick={onDone}
        style={{
          position: 'fixed', top: 14, right: 14, zIndex: 9999,
          background: 'rgba(28,28,30,0.9)', color: 'rgba(255,255,255,0.8)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 20, padding: '6px 14px', fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
        }}
      >Skip tour</button>

      {/* Step progress dots */}
      <div style={{
        position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', gap: 7, pointerEvents: 'none',
      }}>
        {visibleSteps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 22 : 7, height: 7, borderRadius: 4,
            background: i === step ? GOLD : 'rgba(255,255,255,0.3)',
            transition: 'all 0.25s',
          }} />
        ))}
      </div>
    </>
  );
}

// ================= ONBOARDING QUIZ =================
// 4-question quiz shown after a new owner finishes BusinessOwnerOnboarding.
// Each question is its own screen (low cognitive load on mobile).
// Every question is fully skippable. Every answer set has an "Other" with free-text fallback.
// Answers persist to localStorage and drive customization (hidden tabs, default tab).

const QUIZ_QUESTIONS = [
  {
    id: 'teamSize',
    title: 'How many people work in your business?',
    sub: 'Including yourself.',
    options: [
      { value: 'solo',  label: 'Just me (solo)',     icon: '👤' },
      { value: '2-3',   label: '2 or 3',             icon: '👥' },
      { value: '4-10',  label: '4 to 10',            icon: '👨‍👩‍👧' },
      { value: '11-25', label: '11 to 25',           icon: '🏢' },
      { value: '26+',   label: '26 or more',         icon: '🏬' },
    ],
  },
  {
    id: 'mainStruggle',
    title: "What's your biggest struggle right now?",
    sub: "We'll set up the app to focus on this.",
    options: [
      { value: 'scheduling',    label: 'Scheduling chaos / double bookings', icon: '📅' },
      { value: 'noshows',       label: 'Staff no-shows or sick calls',       icon: '🚨' },
      { value: 'inventory',     label: 'Running out of supplies or stock',   icon: '📦' },
      { value: 'revenue',       label: 'Tracking revenue and commission',    icon: '💰' },
      { value: 'compliance',    label: 'Standards and SOP compliance',       icon: '✅' },
      { value: 'communication', label: 'Communicating with my team',         icon: '💬' },
    ],
  },
  {
    id: 'bookingsPerDay',
    title: 'About how many bookings on a busy day?',
    sub: 'Rough guess is fine.',
    options: [
      { value: '0-5',   label: '0 to 5',     icon: '🌱' },
      { value: '6-15',  label: '6 to 15',    icon: '🌿' },
      { value: '16-30', label: '16 to 30',   icon: '🌳' },
      { value: '31-50', label: '31 to 50',   icon: '🔥' },
      { value: '50+',   label: '50 or more', icon: '⚡' },
    ],
  },
  {
    id: 'currentTool',
    title: 'How do you manage your business today?',
    sub: 'No wrong answer.',
    options: [
      { value: 'paper',       label: 'Pen and paper',           icon: '📝' },
      { value: 'spreadsheet', label: 'Excel or Google Sheets',  icon: '📊' },
      { value: 'app',         label: 'Another app',             icon: '📱' },
      { value: 'nothing',     label: 'Nothing organized yet',   icon: '🤷' },
    ],
  },
];

function OnboardingQuiz({ onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => getOnboardPrefs());
  const [otherMode, setOtherMode] = useState(false);
  const [otherText, setOtherText] = useState('');

  const q = QUIZ_QUESTIONS[step];
  const isLast = step === QUIZ_QUESTIONS.length - 1;

  const saveAnswer = (value, customText) => {
    const next = { ...answers, [q.id]: value };
    if (customText) next[`${q.id}_custom`] = customText;
    setAnswers(next);
    setOnboardPrefs(next);
    setOtherMode(false); setOtherText('');
    if (isLast) {
      markOnboardDone();
      onDone(next);
    } else {
      setStep(step + 1);
    }
  };

  const back = () => {
    setOtherMode(false); setOtherText('');
    if (step > 0) setStep(step - 1);
  };

  const skipAll = () => {
    markOnboardDone();
    setOnboardPrefs(answers); // keep partial answers
    onSkip();
  };

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card" style={{ maxWidth: 520 }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
          {QUIZ_QUESTIONS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 6, borderRadius: 3,
              background: i <= step ? 'var(--emerald)' : 'var(--line)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: 'var(--emerald)', margin: 0, lineHeight: 1.3 }}>
            {q.title}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>{q.sub}</p>
        </div>

        {!otherMode ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => saveAnswer(opt.value)}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '14px 16px', borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: answers[q.id] === opt.value ? 'var(--emerald-soft)' : 'var(--cream)',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: 15, fontWeight: 500, color: 'var(--ink)',
                    fontFamily: 'inherit',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--emerald)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
              {/* Other — free text fallback so no one is forced into a bucket */}
              <button
                type="button"
                onClick={() => setOtherMode(true)}
                style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  padding: '14px 16px', borderRadius: 12,
                  border: '1px dashed var(--border)', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  fontSize: 15, fontWeight: 500, color: 'var(--muted)',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 22 }}>✏️</span>
                <span>Other (type your own)</span>
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="input"
              autoFocus
              value={otherText}
              onChange={e => setOtherText(e.target.value)}
              placeholder="Type your answer…"
              onKeyDown={e => {
                if (e.key === 'Enter' && otherText.trim()) saveAnswer('other', otherText.trim());
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setOtherMode(false); setOtherText(''); }}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontFamily: 'inherit' }}
              >Cancel</button>
              <button
                type="button"
                disabled={!otherText.trim()}
                onClick={() => saveAnswer('other', otherText.trim())}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none',
                  background: otherText.trim() ? 'var(--emerald)' : 'var(--line)',
                  color: '#fff', cursor: otherText.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit', fontWeight: 600,
                }}
              >Save answer</button>
            </div>
          </div>
        )}

        {/* Footer: back / skip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            style={{
              background: 'none', border: 'none', cursor: step === 0 ? 'default' : 'pointer',
              color: step === 0 ? 'transparent' : 'var(--muted)', fontSize: 13, fontFamily: 'inherit',
            }}
          >← Back</button>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {step + 1} of {QUIZ_QUESTIONS.length}
          </div>
          <button
            type="button"
            onClick={skipAll}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: 13, textDecoration: 'underline', fontFamily: 'inherit',
            }}
          >Skip all</button>
        </div>
      </div>
    </div>
  );
}

// ================= APP =================
function AppInner() {
  const { t } = useT();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => setToastMsg(m);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('reset_token') || null);
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'signup'
  const [onboardingChoice, setOnboardingChoice] = useState(null); // null | 'owner' | 'staff'
  const [business, setBusiness] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tourDone, setTourDone] = useState(() => localStorage.getItem(TOUR_DONE_KEY) === 'true');
  const [onboardDone, setOnboardDone] = useState(() => isOnboardDone());

  const authed = !!user;
  const onboarded = !!(user?.role && user?.businessType && user?.businessId);

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

  // On mount: restore session if token present, or restore demo if active.
  useEffect(() => {
    if (isDemo()) {
      initDemoData(); // no type arg — keeps existing
      setUser({ ...DEMO_USER, businessType: getDemoType() });
      setBusiness(getDemoBusiness());
      setRole('manager');
      setAuthChecking(false);
      return;
    }
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
    setBusiness(null);
    setOnboardingChoice(null);
    setAuthMode(null);
  };

  // Load business when user has businessId
  useEffect(() => {
    if (!user?.businessId) { setBusiness(null); return; }
    api('/api/businesses/me').then(setBusiness).catch(() => setBusiness(null));
  }, [user?.businessId]);

  // Trial / payment status
  const trialEndDate = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const trialExpired = trialEndDate ? new Date() > trialEndDate : false;
  const isPaid = user?.subscriptionStatus === 'active';
  const needsPayment = authed && trialExpired && !isPaid;

  if (resetToken) return (
    <ResetPasswordScreen token={resetToken} onDone={() => {
      setResetToken(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('reset_token');
      window.history.replaceState({}, '', url.toString());
    }} />
  );

  if (authChecking) {
    return (
      <div className="role-screen">
        <div className="center-muted">
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    if (!authMode) {
      return <LandingPage
        onStartTrial={() => setAuthMode('signup')}
        onSignIn={() => setAuthMode('login')}
        onTryDemo={(type) => {
          setDemo(true);
          initDemoData(type || 'spa');
          setUser({ ...DEMO_USER, businessType: type || 'spa' });
          setBusiness(getDemoBusiness());
          setRole('manager');
          setTab('dashboard');
          // Skip the onboarding quiz in demo — sample data is the experience
          markOnboardDone();
          setOnboardDone(true);
        }}
      />;
    }
    return <AuthScreen
      onAuthed={(u) => { setUser(u); setAuthMode(null); }}
      initialMode={authMode}
      onBack={() => setAuthMode(null)}
    />;
  }

  if (needsPayment) return (
    <PaymentRequired user={user} onActivated={setUser} onLogout={logout} />
  );

  if (!user.businessId) {
    if (!onboardingChoice) {
      return <OnboardingRoleSelector
        user={user}
        onPickOwner={() => setOnboardingChoice('owner')}
        onPickStaff={() => setOnboardingChoice('staff')}
        onLogout={logout}
      />;
    }
    if (onboardingChoice === 'owner') {
      return <BusinessOwnerOnboarding
        onCreated={(u, b) => { setUser(u); setBusiness(b); setOnboardingChoice(null); setRole(u.role || 'manager'); }}
        onBack={() => setOnboardingChoice(null)}
        onLogout={logout}
      />;
    }
    if (onboardingChoice === 'staff') {
      return <StaffOnboarding
        onJoined={(u, b) => { setUser(u); setBusiness(b); setOnboardingChoice(null); setRole(u.role || 'staff'); }}
        onBack={() => setOnboardingChoice(null)}
        onSwitchToOwner={() => setOnboardingChoice('owner')}
        onLogout={logout}
      />;
    }
  }

  if (!role) return <RoleSelector user={user} staff={staff.data} onSelected={(u) => { setUser(u); setRole(u.role || 'manager'); }} onLogout={logout} />;

  // Onboarding quiz — managers only, once, skippable. Demo bypasses it.
  if (role === 'manager' && !onboardDone && !isDemo()) {
    const finishQuiz = (prefs) => {
      // Land them on the tab that matches their #1 struggle
      if (prefs && prefs.mainStruggle) setTab(deriveDefaultTab(prefs));
      setOnboardDone(true);
    };
    return <OnboardingQuiz
      onDone={finishQuiz}
      onSkip={() => setOnboardDone(true)}
    />;
  }

  const currentStaffId = user.staffId || user.id;

  const currentStaffMember = role === 'staff' ? staff.data.find(s => s.id === currentStaffId) : null;
  const staffPerms = { ...STAFF_DEFAULT_PERMISSIONS, ...(currentStaffMember?.permissions || {}) };
  const filteredStaffNav = STAFF_NAV.filter(item => {
    if (item.id === 'schedule') return staffPerms.canViewSchedule;
    return true;
  });
  // Filter manager nav by biz-type defaults (gym hides SOP) PLUS user prefs (solo hides Staff).
  const bizType = business?.type || 'spa';
  const prefsForTabs = getOnboardPrefs();
  const hiddenTabs = [
    ...(BIZ_HIDDEN_TABS[bizType] || []),
    ...deriveExtraHiddenTabs(prefsForTabs),
  ];
  const filteredManagerNav = MANAGER_NAV.filter(item => !hiddenTabs.includes(item.id));
  const nav = role === 'manager' ? filteredManagerNav : role === 'staff' ? filteredStaffNav : OWNER_NAV;
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
    <BizProvider business={business} prefs={prefsForTabs}>
    <div className="shell">
      <OfflineBanner />
      <DemoBanner onExit={() => {
        clearDemoData();
        setUser(null); setBusiness(null); setRole(null);
        setAuthMode('signup');
      }} />
      <TrialBanner user={user} onUpgrade={() => setShowSettings(true)} />
      <header className="topbar">
        <div>
          <div className="brand">{business?.name || `${BRAND}·`}</div>
          <div className="sub">{t(role)} · {(user.email || '').split('@')[0]}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LangToggle />
          {user.role === 'manager' && (
            <button className="switch" onClick={() => setRole(null)} aria-label="switch role">
              {t('switch')}
            </button>
          )}
          <button className="switch" onClick={() => setShowSettings(true)} aria-label="settings">
            {t('settings')}
          </button>
          <button className="switch" onClick={logout} aria-label="sign out">
            <LogOut size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {t('signOut')}
          </button>
        </div>
      </header>
      {showSettings && (
        <SettingsDrawer
          user={user}
          business={business}
          onClose={() => setShowSettings(false)}
          onSwitched={(u) => { setUser(u); setRole(null); setOnboardingChoice(null); }}
          onActivated={setUser}
          toast={toast}
        />
      )}

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
                  onReload={() => { requests.reload(); bookings.reload(); inventory.reload(); }} toast={toast}
                />
              )}
              {tab === 'sop' && (
                <SOPTab sops={sops.data} staff={staff.data} violations={violations.data}
                  onReload={violations.reload} onReloadSops={sops.reload} toast={toast} />
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
              {tab === 'schedule' && staffPerms.canViewSchedule && (
                <StaffScheduleView staff={staff.data} bookings={bookings.data} staffId={currentStaffId} />
              )}
              {tab === 'inbox' && (
                <StaffInboxView
                  announcements={announcements.data} staffId={currentStaffId} staff={staff.data}
                  requests={requests.data} inventory={inventory.data} onSubmitRequest={submitRequest} toast={toast}
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
            <button key={item.id} onClick={() => setTab(item.id)} className={`nav-item ${active ? 'active' : ''}`} data-tour={`tab-${item.id}`}>
              <Icon size={22} />
              <span>{t(item.labelKey)}</span>
              {active && <span className="dot" />}
              {badge > 0 && <span className="badge-dot">{badge}</span>}
            </button>
          );
        })}
      </nav>

      {!tourDone && (
        <TourOverlay onDone={async () => {
          setTourDone(true);
          localStorage.setItem(TOUR_DONE_KEY, 'true');
          try { await api('/api/auth/complete-tutorial', { method: 'POST', body: {} }); } catch {}
        }} />
      )}

      <Toast payload={toastMsg} onDone={() => setToastMsg(null)} />
    </div>
    </BizProvider>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
