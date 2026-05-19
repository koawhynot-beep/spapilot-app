import { useState, useEffect, useCallback, createContext, useContext, useMemo, useRef, useId, Component } from 'react';
import {
  Calendar, Users, Package, LayoutDashboard, AlertTriangle,
  CheckCircle, RefreshCw, Bell, User, ShieldCheck, Send, Home, Inbox,
  Plus, Trash2, Edit2, X, LogOut, Megaphone, PhoneCall, CalendarOff,
  Repeat, Leaf, Sparkles, Gem, Check, Lock,
  Building2, Mail, Search, Download, Globe, Settings as SettingsIcon,
} from 'lucide-react';
import './App.css';

// ── Error Boundary ────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Class component — can't useT() (context may also be broken). Read lang from localStorage directly.
      const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('app_lang')) || 'en';
      const txt = lang === 'id' ? {
        title: 'Terjadi kesalahan',
        body: 'Aplikasi mengalami error. Coba muat ulang.',
        btn: 'Muat ulang aplikasi',
      } : {
        title: 'Something went wrong',
        body: 'The app encountered an error. Try reloading.',
        btn: 'Reload App',
      };
      return (
        <div role="alert" aria-live="assertive" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: '20px', background: 'var(--cream, #f5f0e8)', textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--ink, #2b2623)'
        }}>
          <AlertTriangle size={48} color="var(--danger, #a83838)" aria-hidden="true" style={{ marginBottom: '16px' }} />
          <h1 style={{ color: 'var(--danger, #a83838)', marginBottom: '8px', fontSize: 22, fontFamily: 'Fraunces, Georgia, serif' }}>{txt.title}</h1>
          <p style={{ color: 'var(--muted, #6b5d4a)', marginBottom: '20px', fontSize: 14 }}>{txt.body}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 22px', minHeight: 44, background: 'var(--emerald, #2d5a4a)', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            }}
          >
            {txt.btn}
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', overflow: 'auto', maxWidth: '100%', fontSize: 11 }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const API = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'app_token';
const LANG_KEY = 'app_lang';

// One-time migration: copy any existing tokens/lang from old "opus_*" keys to new keys,
// then delete the old keys so nothing references the legacy brand.
(function migrateLegacyKeys() {
  if (typeof window === 'undefined') return;
  const map = { opus_token: TOKEN_KEY, opus_lang: LANG_KEY };
  for (const [oldKey, newKey] of Object.entries(map)) {
    const v = localStorage.getItem(oldKey);
    if (v != null && localStorage.getItem(newKey) == null) {
      localStorage.setItem(newKey, v);
    }
    localStorage.removeItem(oldKey);
  }
})();
const TOUR_DONE_KEY = 'spapilot-tutorial-done-v2';
// Per-user tour key so every new account sees the tour fresh, even on shared browsers.
const tourKeyFor = (user) => user?.id ? `spapilot-tutorial-done-u${user.id}` : TOUR_DONE_KEY;

// Tour step targets — messages resolved at render via t(messageKey) for i18n.
const TOUR_STEPS = [
  { targetId: 'tab-dashboard',     messageKey: 'tourDashboard',     position: 'top' },
  { targetId: 'tab-schedule',      messageKey: 'tourSchedule',      position: 'top' },
  { targetId: 'tab-clients',       messageKey: 'tourClients',       position: 'top' },
  { targetId: 'tab-staff',         messageKey: 'tourStaff',         position: 'top' },
  { targetId: 'tab-inventory',     messageKey: 'tourInventory',     position: 'top' },
  { targetId: 'tab-alerts',        messageKey: 'tourAlerts',        position: 'top' },
  { targetId: 'tab-sop',           messageKey: 'tourSop',           position: 'top' },
  { targetId: 'tab-announcements', messageKey: 'tourAnnouncements', position: 'top' },
];

// ---------- i18n ----------
const TRANSLATIONS = {
  en: {
    welcomeBack: 'Welcome back.', createWorkspace: 'Create your workspace.',
    signIn: 'Sign in', createAccount: 'Create account', signOut: 'Sign out',
    email: 'Email', password: 'Password', confirmPassword: 'Confirm password',
    emailRequired: 'Email and password required', passwordsDontMatch: 'Passwords do not match',
    passwordTooShort: 'Password must be 8+ characters', pleaseWait: 'Please wait…',
    emailPlaceholder: 'you@example.com',
    pwSignup: 'At least 8 characters', pwLogin: 'Your password',
    pickBusiness: 'pick your business type.', soon: 'Soon',
    spaWellness: 'Spa & Wellness', spaSub: 'Massage, facials, treatment rooms',
    salon: 'Salon', gym: 'Gym & Fitness', restaurant: 'Restaurant', retail: 'Retail / Other',
    comingSoon: 'Coming soon',
    oneLast: 'One last step — who are you?',
    manager: 'Manager', staff: 'Staff', owner: 'Owner', managerSub: 'Run the day, manage the team',
    staffSub: 'Your shifts, your guests', whichMember: 'Which team member are you?',
    back: 'Back', continue: 'Continue', saving: 'Saving…',
    switch: 'Switch', loading: 'Loading…', retry: 'Retry',
    home: 'Home', schedule: 'Schedule', stock: 'Stock', alerts: 'Alerts', clients: 'Clients',
    services: 'Services',
    sop: 'Rules', send: 'Send', today: 'Today', inbox: 'Inbox', profile: 'Profile',
    add: 'Add', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel',
    approve: 'Approve', decline: 'Decline', remove: 'Remove', reload: 'Reload',
    todaysBookings: "Today's Bookings", activeStaff: 'Active Staff', lowStock: 'Low Stock',
    pendingRequest: 'pending request', pendingRequests: 'pending requests', review: 'Review',
    upcomingBookings: 'Upcoming Bookings', viewAll: 'View all',
    todaysChecklist: "Today's Checklist", latestAnnouncement: 'Latest Announcement',
    manage: 'Manage', noAnnouncements: 'No announcements yet.',
    recentSopNotes: 'Recent Rule Notes', sopViolation: 'Rule break logged',
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
    sopNotes: 'rule notes', sopNote: 'rule note',
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
    sopTitle: 'House Rules',
    logSopViolation: 'Log Rule Break', log: 'Log',
    noViolations: 'No notes logged.', repeatOffenders: 'Needs Follow-up',
    notes_n: 'notes', notes_1: 'note',
    removeViolation: 'Remove this note?', noteRemoved: 'Note removed',
    couldNotRemoveNote: 'Could not remove note', violationLogged: 'Rule break logged',
    logViolation: 'Log Break', staffPerson: 'Staff', sopRule: 'Rule', noteText: 'Note',
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
    daysWeek: 'Days / week', mySopNotes: 'My Rule Notes', cleanRecord: 'Clean record — well done.',
    selectStaff: 'Select team member',
    noTeamMembersAskManager: 'No team members exist yet. Ask the manager to add you to the team first.',
    noOtherStaffAvailable: 'No other team members available. Decline this request or add a teammate first.',
    overlapsWithAnother: 'Overlaps with another booking on this team member',
    conflictsCount: 'Conflicts', peakHourLabel: 'Peak hour', topServicesTitle: 'Top services',
    inventoryValue: 'Inventory value', thisMonth: 'This Month', allTime: 'All Time',
    noTeamYetShort: 'No team members yet.',
    ruleTitleRequired: 'Rule title required',
    phonePlaceholder: 'Phone number',
    yourPasswordPlaceholder: 'Your password',
    typeDeleteToConfirm: 'Type DELETE to confirm',
    deleteAccountConfirm: 'DELETE',
    subscriptionUnavailable: 'Subscription is temporarily unavailable. Please try again in a few minutes.',
    extraDetailPlaceholder: 'Extra detail…',
    ruleTitlePh: 'e.g. Arrive on time, Wear uniform…',
    rulePunctualityPh: 'e.g. Punctuality, Appearance…',
    passwordRequired: 'Password required',
    privacyAndData: 'Privacy & Data',
    exportMyData: 'Export my data',
    deleteAccount: 'Delete account',
    deleteAccountWarn: '⚠ This permanently deletes your account and all your business data. Cannot be undone.',
    deleteForever: 'Delete forever',
    deletingEllipsis: 'Deleting…',
    exportFailed: 'Export failed',
    dataExported: 'Data exported',
    accountDeleted: 'Account deleted',
    restartTutorial: 'Restart tutorial',
    joinTeamTitle: 'Join a team',
    freeForever: 'FREE FOREVER',
    joinTeamIntro: 'Staff accounts cost nothing. Ask your manager for the 6-letter business code, then:',
    joinStep1: 'Tap the button below',
    joinStep2: 'Create your free account (email + password)',
    joinStep3: 'Pick "I work as staff" and enter the code given by the business owner',
    joinTeamCta: 'Join your team →',
    upcomingLabel: 'Upcoming',
    addFirstOne: 'Add your first one →',
    pickFromCatalog: 'Pick from catalog (optional)',
    chooseAService: '— Choose a service —',
    lastVisitLabel: 'Last visit',
    skipThisStep: 'Skip this step →',
    skipTour: 'Skip tour',
    withPerson: 'with',
    qtyLabel: 'qty',
    statusPending: 'pending',
    statusApproved: 'approved',
    statusDeclined: 'declined',
    colorLabel: 'Color',
    historyLabel: 'History',
    subscriptionActivated: 'Subscription activated. Welcome aboard!',
    phoneShort: 'phone',
    dateInPastWarn: 'Date is in the past',
    managementSig: 'Management',
    required: 'Required',
    sickReasonPh: 'e.g. Fever, food poisoning, injury…',
    removeServiceConfirm: 'Remove this {item}?',
    staffNameNoTeamPh: '{role} name (no team yet)',
    activePlanLabel: 'Active — $19/month',
    skipToMain: 'Skip to main content',
    slide1Title: 'Welcome aboard',
    slide1Body: "We're going to make running your business much easier. This will only take 30 seconds.",
    slide2Title: 'Built for any service business',
    slide2Body: 'Spas, salons, gyms, clinics, restaurants, hotels, cafés, repair shops, freelancers — and many more. If you take bookings or manage a team, this app fits.',
    slide3Title: 'Smart scheduling',
    slide3Body: 'Bookings, shifts, swaps, and reassignments — all in one calendar. When someone calls in sick, you can reassign their day in two taps.',
    slide4Title: 'Your team, organized',
    slide4Body: 'Time-off, sick calls, and shift swaps come through as requests you can approve or decline. No more "did you see my text?"',
    slide5Title: 'Never run out of stock',
    slide5Body: 'Track supplies, products, or equipment. Get alerts before you run low. One tap to mark items reordered.',
    slide6Title: "Let's set up yours",
    slide6Body: "Tap the button below — we'll show you where everything is.",
    slideshowNext: 'Next →',
    slideshowBack: '← Back',
    slideshowFinish: 'Show me around →',
    slideshowSkip: 'Skip',
    emptyScheduleTitle: 'No {plural} on {date}',
    emptyScheduleBody: 'Add a {item} so your team knows what’s coming up.',
    emptyClientsTitle: 'No {plural} yet',
    emptyClientsBody: '{Plural} you add to {bookings} will show up here automatically.',
    emptyStaffTitle2: 'No {plural} yet',
    emptyStaffBody2: 'Add the {plural} who work with you so you can assign {bookings}.',
    emptyServicesTitle: 'No {plural} yet',
    emptyServicesBody: 'Define the {plural} you offer (e.g., 30-min consultation, haircut, oil change). Add price and duration once, then pick from this list when creating {bookings}.',
    addFirstFmt: 'Add your first {item}',
    search: 'Search', sortBy: 'Sort by', filterCategory: 'Filter category', allCategories: 'All',
    timeAsc: 'Time ↑', timeDesc: 'Time ↓', exportCsv: '⬇ Download Spreadsheet',
    language: 'Language', english: 'English', indonesian: 'Bahasa',
    failed: 'Failed', noResults: 'No results.',
    active: 'Active', leftLabel: 'left · quota',
    todaySopReminder: "Today's Rule Reminder", yourSessions: 'Your Sessions',
    noteLabel: 'Note:', birthdayLabel: 'Birthday:',
    teamSize: 'Team Size', sopNotesStat: 'Rule Notes',
    snapshot: 'Snapshot', lowStockItems: 'Low stock items', flagged: 'flagged',
    pendingRequestsSnap: 'Pending requests', announcementsSent: 'Announcements sent',
    team: 'Team', sessionsTodayStat: 'Sessions today',
    loadingProfile: 'Loading profile…',
    checklistOpen: 'Unlock reception & diffuse oils',
    checklistBrief: 'Morning team briefing',
    checklistInventory: 'Check low-stock items',
    checklistWrapup: 'Cash up and close',
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
    friction: 'Notes for your team:', waMsg: 'Hey! Quick check-in.',
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
    permCanEditStock: 'Can change stock counts',
    permCanMarkViolations: 'Can log rule breaks',
    permCanPostAnnouncements: 'Can post announcements',
    emptyBookingsTitle: 'No bookings yet',
    emptyBookingsBody: 'Add your first appointment to see it on the schedule.',
    emptyInventoryTitle: 'No products yet',
    emptyInventoryBody: 'Track supplies, ingredients, or anything that runs out.',
    emptyStaffTitle: 'No team members yet',
    emptyStaffBody: 'Add the people who work with you so you can assign bookings.',
    emptySopTitle: 'No house rules yet',
    emptySopBody: 'Document the rules and routines your team should follow.',
    addFirstBooking: 'Add your first booking',
    addFirstProduct: 'Add your first product',
    addFirstTeamMember: 'Add your first team member',
    addFirstSop: 'Add your first house rule',
    addSopRule: 'Add Rule', sopRuleAdded: 'Rule added', sopRuleRemoved: 'Rule removed',
    removeSopRule: 'Remove this rule?', sopRuleTitle: 'Rule title', sopRuleDesc: 'Description (optional)',
    noSopsYetViolation: 'Add a house rule first before logging a note.',
    landingHero: 'Service business management made simple.',
    landingSub: 'Schedule staff, track inventory, manage operations, reduce chaos.',
    featSchedTitle: 'Scheduling',
    featSchedBody: 'Bookings, shifts, swaps, and reassignments — all in one calendar.',
    featOpsTitle: 'Operations',
    featOpsBody: 'Inventory tracking, low-stock alerts, daily checklists, SOPs.',
    featTeamTitle: 'Team Management',
    featTeamBody: 'Roles, permissions, time-off requests, sick calls, swap shifts.',
    startFreeTrial: 'No credit card. Start free trial',
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
    bizTypeGym: 'Gym', bizTypeHotel: 'Hotel', bizTypeClinic: 'Clinic',
    bizTypeRestaurant: 'Restaurant', bizTypeOther: 'Other',
    minutesShort: 'min',
    filterAll: 'All', filterLowOnly: 'Low only', filterOutOnly: 'Out only',
    sortNameAZ: 'Name A-Z', sortStockAsc: 'Stock ↑', sortStockDesc: 'Stock ↓', sortValueDesc: 'Value ↓',
    statOut: 'Out', range7d: '7d', range30d: '30d', rangeAll: 'All',
    stockLeftLabel: 'left',
    bizSubSalon: 'Hair, beauty, nails',
    bizSubSpa: 'Massage, facials, wellness',
    bizSubBarbershop: 'Cuts, shaves, grooming',
    bizSubGym: 'Fitness, classes, training',
    bizSubClinic: 'Medical, dental, therapy',
    bizSubHotel: 'Rooms, venues, rentals',
    bizSubRestaurant: 'Reservations, kitchen, service',
    bizSubServices: 'Consultations, repairs, anything else',
    bizTypeOtherFull: 'Other service business',
    previousDay: 'Previous day', nextDay: 'Next day',
    closeLabel: 'Close',
    tourDashboard: "Your dashboard — today's overview lives here",
    tourSchedule: 'Schedule — manage every booking and shift',
    tourClients: 'Clients — see everyone you serve, with full visit history',
    tourStaff: 'Staff — your team, their roles, and schedules',
    tourInventory: 'Stock — track supplies and get low-stock alerts',
    tourAlerts: 'Alerts — staff requests and stock warnings land here',
    tourSop: 'Rules — house standards your team follows',
    tourAnnouncements: 'Send — broadcast announcements to your team',
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
    // Iter 9 additions
    catalogOf: '{item} catalog',
    removedToast: '{item} removed',
    savedCheck: 'Saved',
    alertWhenBelow: '— alert when below',
    costPerUnit: '— cost per {unit}',
    unitFallback: 'unit',
    allergiesPh: 'e.g. lavender, nuts',
    categoryPh: 'e.g. Consultation, Haircut, Repair',
    joinTeamLabel: 'Join a team',
    joinTeamFree: "(it's free)",
    privacyPolicyTitle: 'Privacy Policy',
    privacyPolicyLink: 'Privacy Policy',
    navPrimary: 'Primary',
    skipOnboardingLabel: 'Skip onboarding',
    confirmPromptDefault: 'Confirm?',
    confirmDefault: 'Confirm',
    restartTutorialConfirmTitle: 'Restart tutorial?',
    restartTutorialConfirmBody: 'The welcome slides and on-screen tour will replay. Your data is unchanged.',
    privacyLastUpdated: 'Last updated: May 2026',
    privacy1Title: '1. Who We Are',
    privacy1Body: 'Spapilot ("we", "us", "our") provides business operations management software for service businesses. This policy explains how we handle your data.',
    privacy2Title: '2. What We Collect',
    privacy2Acct: 'Account data: Email address and password (hashed — we never store plain-text passwords)',
    privacy2Biz: 'Business data: Staff, bookings, inventory, SOPs, and announcements you create inside the app',
    privacy2Usage: 'Usage data: Basic server logs (request paths, timestamps) for debugging and security',
    privacy2Foot: 'We do not collect payment card details directly. Payments are handled by Stripe.',
    privacy3Title: '3. How We Use It',
    privacy3a: 'Provide and improve the Spapilot service',
    privacy3b: 'Send password reset emails (only when you request them)',
    privacy3c: 'Detect and prevent security threats',
    privacy3d: 'Communicate service updates',
    privacy3Foot: 'We do not sell your data. We do not share it with third parties except as required to operate the service (e.g., hosting provider, email delivery).',
    privacy4Title: '4. Data Storage',
    privacy4Body: 'Your data is stored on secure servers. Passwords are hashed using bcrypt. Connections use HTTPS. We retain your data for as long as your account is active.',
    privacy5Title: '5. Your Rights',
    privacy5a: 'Access: You can request a copy of your data at any time',
    privacy5b: 'Deletion: You can request account deletion by emailing us',
    privacy5c: 'Correction: You can update your account information in the app',
    privacy5Foot: 'To exercise these rights, contact us at the email below.',
    privacy6Title: '6. Cookies',
    privacy6Body: "We use a single session token stored in your browser's local storage for authentication. No third-party tracking cookies.",
    privacy7Title: '7. Children',
    privacy7Body: 'Spapilot is not directed at children under 13. We do not knowingly collect data from children.',
    privacy8Title: '8. Changes',
    privacy8Body: 'We may update this policy. Continued use after changes means acceptance. We will notify users of material changes by email.',
    privacy9Title: '9. Contact',
    privacy9Body: 'Questions? Email us at:',
    privacyRights: 'All rights reserved.',
    more: 'more',
    loadMore: 'Load more',
    confirmSignOut: 'Sign out of Spapilot? Your data is safe — you can sign back in any time.',
    clearSearch: 'Clear search',
  },
  id: {
    welcomeBack: 'Selamat datang kembali.', createWorkspace: 'Buat ruang kerja Anda.',
    signIn: 'Masuk', createAccount: 'Daftar', signOut: 'Keluar',
    email: 'Email', password: 'Kata sandi', confirmPassword: 'Konfirmasi kata sandi',
    emailRequired: 'Email dan kata sandi wajib diisi', passwordsDontMatch: 'Kata sandi tidak cocok',
    passwordTooShort: 'Kata sandi minimal 8 karakter', pleaseWait: 'Mohon tunggu…',
    emailPlaceholder: 'anda@contoh.com',
    pwSignup: 'Minimal 8 karakter', pwLogin: 'Kata sandi Anda',
    pickBusiness: 'pilih jenis bisnis Anda.', soon: 'Segera',
    spaWellness: 'Spa & Kebugaran', spaSub: 'Pijat, perawatan wajah, ruang terapi',
    salon: 'Salon', gym: 'Gym & Kebugaran', restaurant: 'Restoran', retail: 'Ritel / Lainnya',
    comingSoon: 'Segera hadir',
    oneLast: 'Satu langkah lagi — siapa Anda?',
    manager: 'Manajer', staff: 'Staf', owner: 'Pemilik', managerSub: 'Atur hari, kelola tim',
    staffSub: 'Shift Anda, tamu Anda', whichMember: 'Anggota tim mana Anda?',
    back: 'Kembali', continue: 'Lanjut', saving: 'Menyimpan…',
    switch: 'Tukar', loading: 'Memuat…', retry: 'Coba lagi',
    home: 'Beranda', schedule: 'Jadwal', stock: 'Stok', alerts: 'Peringatan', clients: 'Klien',
    services: 'Layanan',
    sop: 'Aturan', send: 'Kirim', today: 'Hari ini', inbox: 'Kotak Masuk', profile: 'Profil',
    add: 'Tambah', edit: 'Ubah', delete: 'Hapus', save: 'Simpan', cancel: 'Batal',
    approve: 'Setujui', decline: 'Tolak', remove: 'Hapus', reload: 'Muat ulang',
    todaysBookings: 'Pemesanan Hari Ini', activeStaff: 'Staf Aktif', lowStock: 'Stok Menipis',
    pendingRequest: 'permintaan tertunda', pendingRequests: 'permintaan tertunda', review: 'Tinjau',
    upcomingBookings: 'Pemesanan Mendatang', viewAll: 'Lihat semua',
    todaysChecklist: 'Daftar Periksa Hari Ini', latestAnnouncement: 'Pengumuman Terbaru',
    manage: 'Kelola', noAnnouncements: 'Belum ada pengumuman.',
    recentSopNotes: 'Catatan Aturan Terbaru', sopViolation: 'Pelanggaran aturan dicatat',
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
    sopNotes: 'catatan aturan', sopNote: 'catatan aturan',
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
    sopTitle: 'Aturan Rumah',
    logSopViolation: 'Catat Pelanggaran Aturan', log: 'Catat',
    noViolations: 'Belum ada catatan.', repeatOffenders: 'Perlu Tindak Lanjut',
    notes_n: 'catatan', notes_1: 'catatan',
    removeViolation: 'Hapus catatan ini?', noteRemoved: 'Catatan dihapus',
    couldNotRemoveNote: 'Tidak dapat menghapus catatan', violationLogged: 'Pelanggaran aturan dicatat',
    logViolation: 'Catat Pelanggaran', staffPerson: 'Staf', sopRule: 'Aturan', noteText: 'Catatan',
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
    daysWeek: 'Hari / minggu', mySopNotes: 'Catatan Aturan Saya', cleanRecord: 'Catatan bersih — kerja bagus.',
    selectStaff: 'Pilih anggota tim',
    noTeamMembersAskManager: 'Belum ada anggota tim. Minta manajer menambahkan Anda ke tim terlebih dahulu.',
    noOtherStaffAvailable: 'Tidak ada anggota tim lain. Tolak permintaan ini atau tambahkan rekan terlebih dahulu.',
    overlapsWithAnother: 'Tumpang tindih dengan pemesanan lain pada staf yang sama',
    conflictsCount: 'Konflik', peakHourLabel: 'Jam tersibuk', topServicesTitle: 'Layanan teratas',
    inventoryValue: 'Nilai inventaris', thisMonth: 'Bulan Ini', allTime: 'Sepanjang Waktu',
    noTeamYetShort: 'Belum ada anggota tim.',
    ruleTitleRequired: 'Judul aturan wajib diisi',
    phonePlaceholder: 'Nomor telepon',
    yourPasswordPlaceholder: 'Kata sandi Anda',
    typeDeleteToConfirm: 'Ketik DELETE untuk konfirmasi',
    deleteAccountConfirm: 'DELETE',
    subscriptionUnavailable: 'Langganan tidak tersedia sementara. Coba lagi beberapa menit lagi.',
    extraDetailPlaceholder: 'Detail tambahan…',
    ruleTitlePh: 'misal Datang tepat waktu, Pakai seragam…',
    rulePunctualityPh: 'misal Ketepatan, Penampilan…',
    passwordRequired: 'Kata sandi diperlukan',
    privacyAndData: 'Privasi & Data',
    exportMyData: 'Ekspor data saya',
    deleteAccount: 'Hapus akun',
    deleteAccountWarn: '⚠ Ini akan menghapus akun Anda dan semua data bisnis Anda secara permanen. Tidak dapat dibatalkan.',
    deleteForever: 'Hapus selamanya',
    deletingEllipsis: 'Menghapus…',
    exportFailed: 'Ekspor gagal',
    dataExported: 'Data diekspor',
    accountDeleted: 'Akun dihapus',
    restartTutorial: 'Mulai ulang tutorial',
    joinTeamTitle: 'Gabung tim',
    freeForever: 'GRATIS SELAMANYA',
    joinTeamIntro: 'Akun staf gratis. Minta kode bisnis 6-huruf dari manajer, lalu:',
    joinStep1: 'Ketuk tombol di bawah',
    joinStep2: 'Buat akun gratis Anda (email + kata sandi)',
    joinStep3: 'Pilih "Saya bekerja sebagai staf" dan masukkan kode dari pemilik bisnis',
    joinTeamCta: 'Gabung tim Anda →',
    upcomingLabel: 'Mendatang',
    addFirstOne: 'Tambah yang pertama →',
    pickFromCatalog: 'Pilih dari katalog (opsional)',
    chooseAService: '— Pilih layanan —',
    lastVisitLabel: 'Kunjungan terakhir',
    skipThisStep: 'Lewati langkah ini →',
    skipTour: 'Lewati tur',
    withPerson: 'dengan',
    qtyLabel: 'jumlah',
    statusPending: 'menunggu',
    statusApproved: 'disetujui',
    statusDeclined: 'ditolak',
    colorLabel: 'Warna',
    historyLabel: 'Riwayat',
    subscriptionActivated: 'Langganan diaktifkan. Selamat bergabung!',
    phoneShort: 'telepon',
    dateInPastWarn: 'Tanggal di masa lalu',
    managementSig: 'Manajemen',
    required: 'Wajib',
    sickReasonPh: 'misal demam, keracunan makanan, cedera…',
    removeServiceConfirm: 'Hapus {item} ini?',
    staffNameNoTeamPh: '{role} nama (belum ada tim)',
    activePlanLabel: 'Aktif — $19/bulan',
    skipToMain: 'Lewati ke konten utama',
    slide1Title: 'Selamat datang',
    slide1Body: 'Kami akan membuat pengelolaan bisnis Anda jauh lebih mudah. Hanya butuh 30 detik.',
    slide2Title: 'Dibuat untuk semua bisnis jasa',
    slide2Body: 'Spa, salon, gym, klinik, restoran, hotel, kafe, bengkel, freelancer — dan banyak lagi. Jika Anda menerima pemesanan atau mengelola tim, aplikasi ini cocok.',
    slide3Title: 'Penjadwalan cerdas',
    slide3Body: 'Pemesanan, shift, tukar, dan pengalihan — semua dalam satu kalender. Saat ada yang sakit, Anda bisa mengalihkan hari mereka dalam dua ketukan.',
    slide4Title: 'Tim Anda, terorganisir',
    slide4Body: 'Cuti, lapor sakit, dan tukar shift masuk sebagai permintaan yang bisa Anda setujui atau tolak. Tidak ada lagi "kamu lihat pesanku?"',
    slide5Title: 'Jangan kehabisan stok',
    slide5Body: 'Lacak persediaan, produk, atau peralatan. Dapatkan peringatan sebelum stok menipis. Satu ketukan untuk menandai item sudah dipesan ulang.',
    slide6Title: 'Mari atur milik Anda',
    slide6Body: 'Ketuk tombol di bawah — kami akan tunjukkan di mana semuanya berada.',
    slideshowNext: 'Lanjut →',
    slideshowBack: '← Kembali',
    slideshowFinish: 'Tunjukkan padaku →',
    slideshowSkip: 'Lewati',
    emptyScheduleTitle: 'Tidak ada {plural} pada {date}',
    emptyScheduleBody: 'Tambahkan {item} agar tim Anda tahu yang akan datang.',
    emptyClientsTitle: 'Belum ada {plural}',
    emptyClientsBody: '{Plural} yang Anda tambahkan ke {bookings} akan muncul di sini otomatis.',
    emptyStaffTitle2: 'Belum ada {plural}',
    emptyStaffBody2: 'Tambahkan {plural} yang bekerja dengan Anda agar bisa diberi {bookings}.',
    emptyServicesTitle: 'Belum ada {plural}',
    emptyServicesBody: 'Definisikan {plural} yang Anda tawarkan (misal konsultasi 30 menit, potong rambut, ganti oli). Tambahkan harga dan durasi sekali, lalu pilih dari daftar ini saat membuat {bookings}.',
    addFirstFmt: 'Tambah {item} pertama',
    search: 'Cari', sortBy: 'Urutkan', filterCategory: 'Filter kategori', allCategories: 'Semua',
    timeAsc: 'Waktu ↑', timeDesc: 'Waktu ↓', exportCsv: '⬇ Unduh Spreadsheet',
    language: 'Bahasa', english: 'English', indonesian: 'Bahasa',
    failed: 'Gagal', noResults: 'Tidak ada hasil.',
    active: 'Aktif', leftLabel: 'tersisa · kuota',
    todaySopReminder: 'Pengingat Aturan Hari Ini', yourSessions: 'Sesi Anda',
    noteLabel: 'Catatan:', birthdayLabel: 'Ulang Tahun:',
    teamSize: 'Jumlah Tim', sopNotesStat: 'Catatan Aturan',
    snapshot: 'Ringkasan', lowStockItems: 'Item stok rendah', flagged: 'ditandai',
    pendingRequestsSnap: 'Permintaan tertunda', announcementsSent: 'Pengumuman terkirim',
    team: 'Tim', sessionsTodayStat: 'Sesi hari ini',
    loadingProfile: 'Memuat profil…',
    checklistOpen: 'Buka resepsi & nyalakan diffuser',
    checklistBrief: 'Briefing tim pagi',
    checklistInventory: 'Periksa item stok rendah',
    checklistWrapup: 'Hitung kas dan tutup',
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
    friction: 'Catatan untuk tim Anda:', waMsg: 'Halo! Sekadar menyapa.',
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
    permCanEditStock: 'Boleh mengubah jumlah stok',
    permCanRequestNewProducts: 'Boleh minta produk baru',
    permCanMarkViolations: 'Boleh catat pelanggaran aturan',
    permCanPostAnnouncements: 'Boleh kirim pengumuman',
    emptyBookingsTitle: 'Belum ada pemesanan',
    emptyBookingsBody: 'Tambahkan janji pertama Anda untuk melihatnya di jadwal.',
    emptyInventoryTitle: 'Belum ada produk',
    emptyInventoryBody: 'Lacak persediaan, bahan, atau apa pun yang sering habis.',
    emptyStaffTitle: 'Belum ada anggota tim',
    emptyStaffBody: 'Tambahkan orang yang bekerja dengan Anda agar bisa diberi pemesanan.',
    emptySopTitle: 'Belum ada aturan rumah',
    emptySopBody: 'Dokumentasikan aturan dan rutinitas yang harus diikuti tim.',
    addFirstBooking: 'Tambah pemesanan pertama',
    addFirstProduct: 'Tambah produk pertama',
    addFirstTeamMember: 'Tambah anggota tim pertama',
    addFirstSop: 'Tambah aturan pertama',
    addSopRule: 'Tambah Aturan', sopRuleAdded: 'Aturan ditambahkan', sopRuleRemoved: 'Aturan dihapus',
    removeSopRule: 'Hapus aturan ini?', sopRuleTitle: 'Judul aturan', sopRuleDesc: 'Deskripsi (opsional)',
    noSopsYetViolation: 'Tambahkan aturan rumah dulu sebelum mencatat catatan.',
    landingHero: 'Manajemen bisnis jasa dipermudah.',
    landingSub: 'Atur jadwal staf, lacak inventaris, kelola operasional, kurangi kekacauan.',
    featSchedTitle: 'Penjadwalan',
    featSchedBody: 'Pemesanan, shift, tukar, dan pengalihan — semua dalam satu kalender.',
    featOpsTitle: 'Operasional',
    featOpsBody: 'Lacak inventaris, peringatan stok rendah, daftar harian, SOP.',
    featTeamTitle: 'Manajemen Tim',
    featTeamBody: 'Peran, izin, permintaan cuti, lapor sakit, tukar shift.',
    startFreeTrial: 'Tanpa kartu kredit. Mulai uji coba gratis',
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
    bizTypeGym: 'Gym', bizTypeHotel: 'Hotel', bizTypeClinic: 'Klinik',
    bizTypeRestaurant: 'Restoran', bizTypeOther: 'Lainnya',
    minutesShort: 'mnt',
    filterAll: 'Semua', filterLowOnly: 'Hanya menipis', filterOutOnly: 'Hanya habis',
    sortNameAZ: 'Nama A-Z', sortStockAsc: 'Stok ↑', sortStockDesc: 'Stok ↓', sortValueDesc: 'Nilai ↓',
    statOut: 'Habis', range7d: '7h', range30d: '30h', rangeAll: 'Semua',
    stockLeftLabel: 'tersisa',
    bizSubSalon: 'Rambut, kecantikan, kuku',
    bizSubSpa: 'Pijat, facial, kesehatan',
    bizSubBarbershop: 'Potong, cukur, grooming',
    bizSubGym: 'Kebugaran, kelas, latihan',
    bizSubClinic: 'Medis, gigi, terapi',
    bizSubHotel: 'Kamar, tempat, sewa',
    bizSubRestaurant: 'Reservasi, dapur, layanan',
    bizSubServices: 'Konsultasi, perbaikan, lainnya',
    bizTypeOtherFull: 'Bisnis jasa lainnya',
    previousDay: 'Hari sebelumnya', nextDay: 'Hari berikutnya',
    closeLabel: 'Tutup',
    tourDashboard: 'Dasbor Anda — ringkasan hari ini ada di sini',
    tourSchedule: 'Jadwal — kelola setiap pemesanan dan shift',
    tourClients: 'Klien — lihat semua orang yang Anda layani, dengan riwayat lengkap',
    tourStaff: 'Staf — tim Anda, peran, dan jadwal mereka',
    tourInventory: 'Stok — lacak persediaan dan dapatkan peringatan stok rendah',
    tourAlerts: 'Peringatan — permintaan staf dan peringatan stok masuk ke sini',
    tourSop: 'Aturan — standar rumah yang diikuti tim Anda',
    tourAnnouncements: 'Kirim — broadcast pengumuman ke tim Anda',
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
    // Iter 9 additions
    catalogOf: 'Katalog {item}',
    removedToast: '{item} dihapus',
    savedCheck: 'Tersimpan',
    alertWhenBelow: '— peringatkan jika di bawah',
    costPerUnit: '— biaya per {unit}',
    unitFallback: 'unit',
    allergiesPh: 'misal lavender, kacang',
    categoryPh: 'misal Konsultasi, Potong Rambut, Perbaikan',
    joinTeamLabel: 'Gabung tim',
    joinTeamFree: '(gratis)',
    privacyPolicyTitle: 'Kebijakan Privasi',
    privacyPolicyLink: 'Kebijakan Privasi',
    navPrimary: 'Utama',
    skipOnboardingLabel: 'Lewati onboarding',
    confirmPromptDefault: 'Konfirmasi?',
    confirmDefault: 'Konfirmasi',
    restartTutorialConfirmTitle: 'Mulai ulang tutorial?',
    restartTutorialConfirmBody: 'Slide selamat datang dan tur layar akan diputar ulang. Data Anda tidak berubah.',
    privacyLastUpdated: 'Pembaruan terakhir: Mei 2026',
    privacy1Title: '1. Tentang Kami',
    privacy1Body: 'Spapilot ("kami") menyediakan perangkat lunak manajemen operasi bisnis untuk bisnis jasa. Kebijakan ini menjelaskan cara kami menangani data Anda.',
    privacy2Title: '2. Yang Kami Kumpulkan',
    privacy2Acct: 'Data akun: Alamat email dan kata sandi (di-hash — kami tidak menyimpan kata sandi dalam teks asli)',
    privacy2Biz: 'Data bisnis: Staf, pemesanan, inventaris, SOP, dan pengumuman yang Anda buat di dalam aplikasi',
    privacy2Usage: 'Data penggunaan: Log server dasar (jalur permintaan, stempel waktu) untuk debugging dan keamanan',
    privacy2Foot: 'Kami tidak mengumpulkan detail kartu pembayaran secara langsung. Pembayaran ditangani oleh Stripe.',
    privacy3Title: '3. Cara Kami Menggunakannya',
    privacy3a: 'Menyediakan dan meningkatkan layanan Spapilot',
    privacy3b: 'Mengirim email reset kata sandi (hanya saat Anda minta)',
    privacy3c: 'Mendeteksi dan mencegah ancaman keamanan',
    privacy3d: 'Menyampaikan pembaruan layanan',
    privacy3Foot: 'Kami tidak menjual data Anda. Kami tidak membagikannya kepada pihak ketiga kecuali yang diperlukan untuk mengoperasikan layanan (misal penyedia hosting, pengiriman email).',
    privacy4Title: '4. Penyimpanan Data',
    privacy4Body: 'Data Anda disimpan di server yang aman. Kata sandi di-hash dengan bcrypt. Koneksi menggunakan HTTPS. Kami menyimpan data Anda selama akun Anda aktif.',
    privacy5Title: '5. Hak Anda',
    privacy5a: 'Akses: Anda dapat meminta salinan data Anda kapan saja',
    privacy5b: 'Penghapusan: Anda dapat meminta penghapusan akun melalui email',
    privacy5c: 'Koreksi: Anda dapat memperbarui informasi akun di dalam aplikasi',
    privacy5Foot: 'Untuk menggunakan hak ini, hubungi kami di email di bawah.',
    privacy6Title: '6. Cookie',
    privacy6Body: 'Kami menggunakan satu token sesi yang disimpan di local storage browser Anda untuk autentikasi. Tidak ada cookie pelacakan pihak ketiga.',
    privacy7Title: '7. Anak-Anak',
    privacy7Body: 'Spapilot tidak ditujukan untuk anak di bawah 13 tahun. Kami tidak mengumpulkan data dari anak-anak secara sengaja.',
    privacy8Title: '8. Perubahan',
    privacy8Body: 'Kami dapat memperbarui kebijakan ini. Penggunaan berkelanjutan setelah perubahan berarti penerimaan. Kami akan memberi tahu pengguna mengenai perubahan signifikan melalui email.',
    privacy9Title: '9. Kontak',
    privacy9Body: 'Pertanyaan? Email kami di:',
    privacyRights: 'Hak cipta dilindungi.',
    more: 'lagi',
    loadMore: 'Muat lebih banyak',
    confirmSignOut: 'Keluar dari Spapilot? Data Anda aman — Anda dapat masuk kembali kapan saja.',
    clearSearch: 'Hapus pencarian',
  },
};

const LangContext = createContext({ lang: 'en', t: (k) => k, setLang: () => {} });
const useT = () => useContext(LangContext);

// ---------- Business-type-aware terminology ----------
// Each business type uses different words for the same concepts.
// gym calls clients "Members", clinic calls them "Patients", hotel calls them "Guests".
const BIZ_LABELS = {
  // Broad work categories — primary onboarding choice. Cover any service business.
  services:   { client: 'Client',   clientPlural: 'Clients',   staffMember: 'Provider', staffPlural: 'Providers', service: 'Service',     servicePlural: 'Services',     booking: 'Booking',     bookingPlural: 'Bookings',     todayCount: "Today's Bookings" },
  products:   { client: 'Customer', clientPlural: 'Customers', staffMember: 'Staff',    staffPlural: 'Staff',     service: 'Product',     servicePlural: 'Products',     booking: 'Order',       bookingPlural: 'Orders',       todayCount: "Today's Orders" },
  space:      { client: 'Guest',    clientPlural: 'Guests',    staffMember: 'Staff',    staffPlural: 'Staff',     service: 'Stay',        servicePlural: 'Stays',        booking: 'Check-In',    bookingPlural: 'Check-Ins',    todayCount: "Today's Check-Ins" },
  mix:        { client: 'Customer', clientPlural: 'Customers', staffMember: 'Staff',    staffPlural: 'Staff',     service: 'Service',     servicePlural: 'Services',     booking: 'Booking',     bookingPlural: 'Bookings',     todayCount: "Today's Bookings" },
  // Specific industry types — used by the demo's "Try X demo" cards (industry preview).
  // Existing real users with these legacy types still get correct labels.
  spa:        { client: 'Client',   clientPlural: 'Clients',   staffMember: 'Therapist', staffPlural: 'Therapists', service: 'Treatment',   servicePlural: 'Treatments',   booking: 'Booking',     bookingPlural: 'Bookings',     todayCount: "Today's Bookings" },
  salon:      { client: 'Client',   clientPlural: 'Clients',   staffMember: 'Stylist',   staffPlural: 'Stylists',   service: 'Service',     servicePlural: 'Services',     booking: 'Appointment', bookingPlural: 'Appointments', todayCount: "Today's Appointments" },
  barbershop: { client: 'Client',   clientPlural: 'Clients',   staffMember: 'Barber',    staffPlural: 'Barbers',    service: 'Cut',         servicePlural: 'Services',     booking: 'Appointment', bookingPlural: 'Appointments', todayCount: "Today's Appointments" },
  gym:        { client: 'Member',   clientPlural: 'Members',   staffMember: 'Trainer',   staffPlural: 'Trainers',   service: 'Class',       servicePlural: 'Classes',      booking: 'Class',       bookingPlural: 'Classes',      todayCount: "Today's Classes" },
  hotel:      { client: 'Guest',    clientPlural: 'Guests',    staffMember: 'Staff',     staffPlural: 'Staff',      service: 'Stay',        servicePlural: 'Stays',        booking: 'Check-In',    bookingPlural: 'Check-Ins',    todayCount: "Today's Check-Ins" },
  clinic:     { client: 'Patient',  clientPlural: 'Patients',  staffMember: 'Provider',  staffPlural: 'Providers',  service: 'Appointment', servicePlural: 'Appointments', booking: 'Appointment', bookingPlural: 'Appointments', todayCount: "Today's Appointments" },
  restaurant: { client: 'Guest',    clientPlural: 'Guests',    staffMember: 'Server',    staffPlural: 'Servers',    service: 'Menu item',   servicePlural: 'Menu',         booking: 'Reservation', bookingPlural: 'Reservations',todayCount: "Today's Reservations" },
  other:      { client: 'Customer', clientPlural: 'Customers', staffMember: 'Staff',     staffPlural: 'Staff',      service: 'Service',     servicePlural: 'Services',     booking: 'Booking',     bookingPlural: 'Bookings',     todayCount: "Today's Bookings" },
};
// Tabs hidden by default per business type.
const BIZ_HIDDEN_TABS = {
  services:   [],
  products:   ['sop'],            // product-only sellers usually skip SOP compliance
  space:      [],
  mix:        [],
  spa:        [],
  salon:      [],
  restaurant: ['sop'],
  barbershop: ['sop'],
  gym:        ['sop'],
  hotel:      [],
  clinic:     [],
  other:      ['sop'],
};
// Default to generic "services" labels so any business type sees neutral terms
// until they pick their specific industry. Avoids spa-only "Therapist/Treatment" leaking.
const BizContext = createContext({ business: null, labels: BIZ_LABELS.services, hiddenTabs: [] });
const useBiz = () => useContext(BizContext);
function BizProvider({ business, children }) {
  const { lang } = useT();
  const value = useMemo(() => {
    const type = business?.type || 'services';
    return {
      business,
      labels: getBizLabels(type, lang),
      hiddenTabs: BIZ_HIDDEN_TABS[type] || [],
    };
  }, [business, lang]);
  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
}

function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || 'en');
  const setLang = useCallback((l) => { localStorage.setItem(LANG_KEY, l); setLangState(l); }, []);
  const t = useCallback((k) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return dict[k] !== undefined ? dict[k] : (TRANSLATIONS.en[k] || k);
  }, [lang]);
  // Sync document.documentElement.lang so screen readers pronounce content correctly.
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang === 'id' ? 'id' : 'en';
  }, [lang]);
  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

// ---------- Currency helper ----------
// Business-level money (booking price, service price, client revenue, inventory cost).
// NOT for subscription pricing — that stays USD because Stripe charges in USD.
// Indonesian users see "Rp 1,000" with thousands separator; English users see "$1,000.00" with cents.
function fmtMoney(amount, lang) {
  const n = Number(amount) || 0;
  if (lang === 'id') {
    return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
  }
  return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// Duration helper — Indonesian users see "60 mnt" instead of English "60min".
function fmtDuration(n, lang) {
  const num = Number(n) || 0;
  return `${num} ${lang === 'id' ? 'mnt' : 'min'}`;
}

// Per-language localized BIZ_LABELS lookup — Indonesian users see "Anggota/Pelatih/Kelas",
// English see "Member/Trainer/Class". Falls back to English values.
const BIZ_LABELS_ID = {
  services:   { client: 'Klien',      clientPlural: 'Klien',      staffMember: 'Penyedia', staffPlural: 'Penyedia',  service: 'Layanan',     servicePlural: 'Layanan',      booking: 'Pemesanan',  bookingPlural: 'Pemesanan',     todayCount: 'Pemesanan Hari Ini' },
  products:   { client: 'Pelanggan',  clientPlural: 'Pelanggan',  staffMember: 'Staf',     staffPlural: 'Staf',      service: 'Produk',      servicePlural: 'Produk',       booking: 'Pesanan',    bookingPlural: 'Pesanan',       todayCount: 'Pesanan Hari Ini' },
  space:      { client: 'Tamu',       clientPlural: 'Tamu',       staffMember: 'Staf',     staffPlural: 'Staf',      service: 'Penginapan',  servicePlural: 'Penginapan',   booking: 'Check-In',   bookingPlural: 'Check-In',      todayCount: 'Check-In Hari Ini' },
  mix:        { client: 'Pelanggan',  clientPlural: 'Pelanggan',  staffMember: 'Staf',     staffPlural: 'Staf',      service: 'Layanan',     servicePlural: 'Layanan',      booking: 'Pemesanan',  bookingPlural: 'Pemesanan',     todayCount: 'Pemesanan Hari Ini' },
  spa:        { client: 'Klien',      clientPlural: 'Klien',      staffMember: 'Terapis',  staffPlural: 'Terapis',   service: 'Perawatan',   servicePlural: 'Perawatan',    booking: 'Pemesanan',  bookingPlural: 'Pemesanan',     todayCount: 'Pemesanan Hari Ini' },
  salon:      { client: 'Klien',      clientPlural: 'Klien',      staffMember: 'Penata',   staffPlural: 'Penata',    service: 'Layanan',     servicePlural: 'Layanan',      booking: 'Janji Temu', bookingPlural: 'Janji Temu',    todayCount: 'Janji Temu Hari Ini' },
  barbershop: { client: 'Klien',      clientPlural: 'Klien',      staffMember: 'Barber',   staffPlural: 'Barber',    service: 'Cukur',       servicePlural: 'Layanan',      booking: 'Janji Temu', bookingPlural: 'Janji Temu',    todayCount: 'Janji Temu Hari Ini' },
  gym:        { client: 'Anggota',    clientPlural: 'Anggota',    staffMember: 'Pelatih',  staffPlural: 'Pelatih',   service: 'Kelas',       servicePlural: 'Kelas',        booking: 'Kelas',      bookingPlural: 'Kelas',         todayCount: 'Kelas Hari Ini' },
  hotel:      { client: 'Tamu',       clientPlural: 'Tamu',       staffMember: 'Staf',     staffPlural: 'Staf',      service: 'Menginap',    servicePlural: 'Menginap',     booking: 'Check-In',   bookingPlural: 'Check-In',      todayCount: 'Check-In Hari Ini' },
  clinic:     { client: 'Pasien',     clientPlural: 'Pasien',     staffMember: 'Dokter',   staffPlural: 'Dokter',    service: 'Janji Temu',  servicePlural: 'Janji Temu',   booking: 'Janji Temu', bookingPlural: 'Janji Temu',    todayCount: 'Janji Temu Hari Ini' },
  restaurant: { client: 'Tamu',       clientPlural: 'Tamu',       staffMember: 'Pelayan',  staffPlural: 'Pelayan',   service: 'Menu',        servicePlural: 'Menu',         booking: 'Reservasi',  bookingPlural: 'Reservasi',     todayCount: 'Reservasi Hari Ini' },
  other:      { client: 'Pelanggan',  clientPlural: 'Pelanggan',  staffMember: 'Staf',     staffPlural: 'Staf',      service: 'Layanan',     servicePlural: 'Layanan',      booking: 'Pemesanan',  bookingPlural: 'Pemesanan',     todayCount: 'Pemesanan Hari Ini' },
};
function getBizLabels(type, lang) {
  const pool = lang === 'id' ? BIZ_LABELS_ID : BIZ_LABELS;
  return pool[type] || pool.services || BIZ_LABELS.services;
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

// Lang-aware error message helper for use outside React tree (api() helper).
function apiErr(en, id) {
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem(LANG_KEY)) || 'en';
  return lang === 'id' ? id : en;
}
async function api(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // 30s timeout — Render free-tier cold starts can take 20-25s, give a bit of headroom.
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 30000);
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...opts,
      headers,
      signal: opts.signal || controller.signal,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    clearTimeout(tid);
    if (e.name === 'AbortError') {
      throw new Error(apiErr(
        'Request timed out. Please try again.',
        'Permintaan habis waktu. Coba lagi.'
      ));
    }
    // Network failures (server down, DNS, offline) produce TypeError "Failed to fetch".
    // Translate to a human-readable message so users know what to do.
    if (!navigator.onLine) {
      throw new Error(apiErr(
        "You're offline. Check your internet connection and try again.",
        "Anda offline. Periksa koneksi internet dan coba lagi."
      ));
    }
    throw new Error(apiErr(
      "Can't reach the server. It may be starting up — please try again in a moment.",
      "Tidak dapat terhubung ke server. Mungkin sedang menyalakan — coba lagi sebentar."
    ));
  }
  clearTimeout(tid);
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('app:unauth'));
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    let serverErr = null;
    try { const d = await res.json(); serverErr = d.error || null; msg = serverErr || msg; } catch {}
    // Surface server-provided error if any; only fall back to generic for true unknown 5xx
    if (res.status >= 500 && !serverErr) msg = apiErr(
      `Server error (${res.status}). Please try again.`,
      `Kesalahan server (${res.status}). Coba lagi.`
    );
    if (res.status === 429 && !serverErr) msg = apiErr(
      'Too many requests. Please slow down and try again in a minute.',
      'Terlalu banyak permintaan. Pelan-pelan dan coba lagi dalam satu menit.'
    );
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

function useCollection(path, enabled = true, pollMs = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Generation counter — when path changes or component unmounts, in-flight requests
  // resolving later must not stomp on the fresh state.
  const genRef = useRef(0);

  const reload = useCallback(() => {
    if (!enabled) return;
    const gen = ++genRef.current;
    setRefreshing(true);
    setError(null);
    api(path)
      .then(d => {
        if (gen !== genRef.current) return; // stale response — drop it
        setData(Array.isArray(d) ? d : []);
        setLoading(false); setRefreshing(false); setHasLoaded(true);
      })
      .catch(e => {
        if (gen !== genRef.current) return;
        setError(e.message);
        setLoading(false); setRefreshing(false);
      });
  }, [path, enabled]);

  // Bump generation on unmount so anything still in flight gets ignored.
  useEffect(() => () => { genRef.current = -1; }, []);

  useEffect(() => { if (enabled) reload(); }, [reload, enabled]);

  // Optional background polling — only when tab visible and enabled, to keep manager
  // dashboards fresh (new requests / new low-stock alerts) without manual refresh.
  // Also refresh once when the tab becomes visible again so users coming back from
  // another app/tab don't see stale data while waiting for the next poll tick.
  useEffect(() => {
    if (!enabled || !pollMs) return undefined;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        reload();
      }
    }, pollMs);
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') reload();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, pollMs, reload]);

  // Expose `loading` true only for initial fetch; subsequent refreshes don't blank the UI.
  return { data, loading: loading && !hasLoaded, refreshing, error, reload, setData };
}

// ---------- Constants ----------
const COLOR_OPTIONS = ['#2d5a4a', '#b8956a', '#8ba888', '#d4b896', '#6b8e7f', '#a17c52', '#c9a97a'];
// Friendly names for screen-reader aria-labels (hex codes are meaningless to NVDA).
const COLOR_NAMES = {
  '#2d5a4a': 'Emerald',
  '#b8956a': 'Gold',
  '#8ba888': 'Sage',
  '#d4b896': 'Sand',
  '#6b8e7f': 'Pine',
  '#a17c52': 'Bronze',
  '#c9a97a': 'Wheat',
};
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Convert "HH:MM" to minutes for overlap math
const toMin = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const STAFF_DEFAULT_PERMISSIONS = {
  canViewSchedule: true, canRequestTimeOff: true, canSwapShifts: true,
  canRequestStock: true, canRequestNewProducts: false,
  canEditStock: false,
  canMarkViolations: false, canPostAnnouncements: false,
};
const PERMISSION_DEFS = [
  { key: 'canViewSchedule',        labelKey: 'permCanViewSchedule' },
  { key: 'canRequestTimeOff',      labelKey: 'permCanRequestTimeOff' },
  { key: 'canSwapShifts',          labelKey: 'permCanSwapShifts' },
  { key: 'canRequestStock',        labelKey: 'permCanRequestStock' },
  { key: 'canRequestNewProducts',  labelKey: 'permCanRequestNewProducts' },
  { key: 'canEditStock',           labelKey: 'permCanEditStock' },
  { key: 'canMarkViolations',      labelKey: 'permCanMarkViolations' },
  { key: 'canPostAnnouncements',   labelKey: 'permCanPostAnnouncements' },
];


// ---------- Shared UI ----------
function Avatar({ initial, color, size = 36, name }) {
  return (
    <div
      className="avatar"
      role="img"
      aria-label={name || (typeof initial === 'string' ? initial : '')}
      style={{
        width: size, height: size,
        background: color, fontSize: size * 0.4,
      }}
    >{initial}</div>
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
    <div role="alert" aria-live="assertive" className="error-banner">
      <AlertTriangle size={16} aria-hidden="true" /> {error}
      {reload && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={reload}>{t('retry')}</button>}
    </div>
  );
  return children;
}

// ConfirmDialog — styled, themed, i18n-friendly replacement for window.confirm().
// Singleton renderer mounted at root via window.__spapilotConfirm. Usage:
//   await spapilotConfirm({ title, body, confirmLabel, danger }) -> Promise<boolean>
const ConfirmContext = createContext(null);
let _resolver = null;
function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const open = useCallback((opts) => {
    return new Promise((resolve) => {
      _resolver = resolve;
      setState(opts || {});
    });
  }, []);
  const close = useCallback((result) => {
    if (_resolver) { _resolver(result); _resolver = null; }
    setState(null);
  }, []);
  // Make available as a global function for non-component contexts (e.g., async handlers)
  useEffect(() => {
    window.__spapilotConfirm = open;
    return () => { if (window.__spapilotConfirm === open) delete window.__spapilotConfirm; };
  }, [open]);
  return (
    <ConfirmContext.Provider value={open}>
      {children}
      {state && (
        <Modal title={state.title || ''} onClose={() => close(false)}>
          {state.body && (
            <div id="confirm-body" style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 16 }}>
              {state.body}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
              {state.cancelLabel || apiErr('Cancel', 'Batal')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={state.danger ? { background: 'var(--danger)', color: '#fff' } : undefined}
              onClick={() => close(true)}
              autoFocus
            >
              {state.confirmLabel || apiErr('Confirm', 'Konfirmasi')}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
// Hook for components (currently unused — appConfirm helper used instead — kept for future direct use).
// eslint-disable-next-line no-unused-vars
const useConfirm = () => useContext(ConfirmContext) || ((opts) => Promise.resolve(window.confirm((opts && (opts.title || opts.body)) || 'Confirm?')));
// App-level confirm helper for use outside React tree (rare). Routes through ConfirmProvider when mounted.
function appConfirm(opts) {
  if (typeof window !== 'undefined' && window.__spapilotConfirm) return window.__spapilotConfirm(opts);
  return Promise.resolve(window.confirm((opts && (opts.title || opts.body)) || apiErr('Confirm?', 'Konfirmasi?')));
}

function Modal({ title, onClose, children }) {
  const { t } = useT();
  const modalRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    // Save trigger to restore focus on close (a11y: WCAG 2.4.3).
    const trigger = document.activeElement;
    const esc = e => { if (e.key === 'Escape') onClose(); };
    const focusTrap = e => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusables = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', esc);
    window.addEventListener('keydown', focusTrap);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move initial focus into the dialog (a11y: announce dialog opened).
    setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        );
        (firstFocusable || modalRef.current).focus();
      }
    }, 30);
    return () => {
      window.removeEventListener('keydown', esc);
      window.removeEventListener('keydown', focusTrap);
      document.body.style.overflow = prevOverflow;
      // Return focus to trigger (a11y: WCAG 2.4.3).
      try { trigger && trigger.focus && trigger.focus(); } catch {}
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2 id={titleId} style={{ margin: 0, color: 'var(--emerald)', fontSize: 20, fontFamily: 'Fraunces, serif', fontWeight: 500 }}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('closeLabel')}><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Toast({ payload, onDone }) {
  const { t } = useT();
  const msg = typeof payload === 'string' ? payload : payload?.message;
  const action = typeof payload === 'object' && payload ? payload : null;
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!msg) return;
    if (paused) return;
    // WCAG 2.2.1: bumped from 2.4s -> 5s; undo variant stays 10s. Pause on hover/focus.
    const ttl = action?.undo ? 10000 : 5000;
    const timer = setTimeout(onDone, ttl);
    return () => clearTimeout(timer);
  }, [msg, action, onDone, paused]);
  if (!msg) return null;
  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span>{msg}</span>
      {action?.undo && (
        <button
          className="toast-btn"
          onClick={() => { action.undo(); onDone(); }}
          aria-label={action.undoLabel || t('undo')}
        >{action.undoLabel || t('undo')}</button>
      )}
      <button
        className="toast-close"
        onClick={onDone}
        aria-label={t('closeLabel')}
        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 4, marginLeft: 4, fontSize: 16, lineHeight: 1 }}
      >×</button>
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
        <button type="button" className="btn btn-primary btn-sm" onClick={onCta}>
          <Plus size={12} aria-hidden="true" style={{ marginRight: 4 }} /> {ctaLabel}
        </button>
      )}
    </div>
  );
}

// ---------- Brand mark ----------
// Pre-onboarding: simple gold dot logo (no brand text). Post-onboarding the topbar
// shows the user's actual business name instead.
function BrandMark({ sub }) {
  return (
    <>
      <div className="brand" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <span className="dot" style={{ fontSize: 32, lineHeight: 1, color: 'var(--gold)' }}>●</span>
      </div>
      {sub && <div className="tagline">{sub}</div>}
    </>
  );
}

// ---------- Language toggle ----------
function LangToggle({ floating = false, large = false }) {
  const { lang, setLang, t } = useT();
  const langName = lang === 'en' ? 'English' : 'Bahasa';

  const switchLabel = lang === 'en'
    ? 'Language: English. Switch to Bahasa.'
    : 'Bahasa. Ganti ke English.';

  if (large) {
    return (
      <button
        type="button"
        onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
        aria-label={switchLabel}
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
        <Globe size={16} aria-hidden="true" />
        {t('language')}: {langName}
      </button>
    );
  }

  const className = floating ? 'lang-toggle-float' : 'switch';
  return (
    <button
      type="button"
      className={className}
      onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
      aria-label={switchLabel}
      title={lang === 'en' ? 'Bahasa Indonesia' : 'English'}
    >
      <Globe size={12} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
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
    if (mode === 'signup' && password.length < 8) { setErr(t('passwordTooShort')); return; }
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
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              {mode === 'login' && <span aria-hidden="true" style={{ marginRight: 6, fontSize: 11 }}>●</span>}
              {t('signIn')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              {mode === 'signup' && <span aria-hidden="true" style={{ marginRight: 6, fontSize: 11 }}>●</span>}
              {t('createAccount')}
            </button>
          </div>
        )}

        {mode === 'forgot' && forgotDone ? (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <CheckCircle size={32} color="var(--emerald)" aria-hidden="true" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>{t('resetLinkSent')}</div>
            <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => switchMode('login')}>{t('backToLogin')}</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 18 }} aria-busy={busy}>
            <div className="field">
              <label htmlFor="auth-email">{t('email')}</label>
              <div className="input-wrap">
                <Mail size={14} className="input-icon" aria-hidden="true" />
                <input
                  id="auth-email"
                  className="input input-with-icon"
                  type="email"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  maxLength={254}
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={e => { setErr(null); setEmail(e.target.value); }}
                  aria-invalid={!!err}
                  aria-describedby={err ? 'auth-error' : undefined}
                />
              </div>
            </div>
            {mode !== 'forgot' && (
              <div className="field">
                <label htmlFor="auth-password">{t('password')}</label>
                <div className="input-wrap">
                  <Lock size={14} className="input-icon" aria-hidden="true" />
                  <input
                    id="auth-password"
                    className="input input-with-icon"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    maxLength={200}
                    placeholder={mode === 'signup' ? t('pwSignup') : t('pwLogin')}
                    value={password}
                    onChange={e => { setErr(null); setPassword(e.target.value); }}
                    aria-invalid={!!err}
                    aria-describedby={err ? 'auth-error' : undefined}
                  />
                </div>
              </div>
            )}
            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="auth-confirm">{t('confirmPassword')}</label>
                <div className="input-wrap">
                  <Lock size={14} className="input-icon" aria-hidden="true" />
                  <input
                    id="auth-confirm"
                    className="input input-with-icon"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('confirmPassword')}
                    value={confirm}
                    onChange={e => { setErr(null); setConfirm(e.target.value); }}
                    aria-invalid={!!err}
                    aria-describedby={err ? 'auth-error' : undefined}
                  />
                </div>
              </div>
            )}
            {err && (
              <div id="auth-error" role="alert" aria-live="assertive" className="error-banner" style={{ marginTop: 4 }}>
                <AlertTriangle size={14} aria-hidden="true" /> {err}
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

        {onBack && (
          <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 12, fontSize: 12 }} onClick={onBack}>
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
    if (password.length < 8) { setErr(t('passwordTooShort')); return; }
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
            <CheckCircle size={32} color="var(--emerald)" aria-hidden="true" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>{t('passwordResetSuccess')}</div>
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={onDone}>{t('signIn')}</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 18 }} aria-busy={busy}>
            <div className="field">
              <label htmlFor="reset-new-password">{t('newPassword')}</label>
              <div className="input-wrap">
                <Lock size={14} className="input-icon" aria-hidden="true" />
                <input id="reset-new-password" className="input input-with-icon" type="password" autoFocus
                  autoComplete="new-password" placeholder={t('pwSignup')}
                  aria-invalid={!!err}
                  aria-describedby={err ? 'reset-error' : undefined}
                  value={password} onChange={e => { setErr(null); setPassword(e.target.value); }} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="reset-confirm-password">{t('confirmPassword')}</label>
              <div className="input-wrap">
                <Lock size={14} className="input-icon" aria-hidden="true" />
                <input id="reset-confirm-password" className="input input-with-icon" type="password"
                  autoComplete="new-password" placeholder={t('confirmPassword')}
                  aria-invalid={!!err}
                  aria-describedby={err ? 'reset-error' : undefined}
                  value={confirm} onChange={e => { setErr(null); setConfirm(e.target.value); }} />
              </div>
            </div>
            {err && <div id="reset-error" role="alert" aria-live="assertive" className="error-banner" style={{ marginTop: 4 }}><AlertTriangle size={14} aria-hidden="true" /> {err}</div>}
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
function LandingPage({ onStartTrial, onSignIn, onJoinTeam, onShowPrivacy }) {
  const { t } = useT();
  const [showJoinInfo, setShowJoinInfo] = useState(false);
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
                  <Icon size={18} color="var(--emerald)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--emerald)' }}>{t(f.titleKey)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 }}>{t(f.bodyKey)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary CTA — for business owners starting trial */}
        <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '16px 16px', fontSize: 16 }} onClick={onStartTrial}>
          <Sparkles size={16} aria-hidden="true" style={{ marginRight: 8 }} /> {t('startFreeTrial')}
        </button>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          {t('trialFinePrintSub')}
        </div>

        {/* Small Join-team button — modal opens with full instructions on click */}
        <button
          type="button"
          className="btn btn-ghost"
          style={{
            width: '100%', marginTop: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600,
            border: '1px solid var(--border)', color: 'var(--emerald)', background: 'transparent',
          }}
          onClick={() => setShowJoinInfo(true)}
        >
          <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} aria-hidden="true" />
          {t('joinTeamLabel')} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13, marginLeft: 4 }}>{t('joinTeamFree')}</span>
        </button>

        <div style={{ marginTop: 22, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          {t('haveAccount')}{' '}
          <button type="button"
            style={{ background: 'none', border: 'none', color: 'var(--emerald)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}
            onClick={onSignIn}>
            {t('signIn')}
          </button>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
          <button type="button"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: 11, padding: 0 }}
            onClick={onShowPrivacy}>
            {t('privacyPolicyLink')}
          </button>
          {' · '}© {new Date().getFullYear()} Spapilot
        </div>
      </div>

      {/* Join-team info modal */}
      {showJoinInfo && (
        <Modal title={t('joinTeamTitle')} onClose={() => setShowJoinInfo(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Users size={20} color="var(--emerald)" aria-hidden="true" />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              padding: '3px 8px', borderRadius: 999,
              background: 'var(--emerald)', color: '#fff',
            }}>{t('freeForever')}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
            {t('joinTeamIntro')}
          </div>
          <ol style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, paddingLeft: 20, margin: '0 0 18px' }}>
            <li>{t('joinStep1')}</li>
            <li>{t('joinStep2')}</li>
            <li>{t('joinStep3')}</li>
          </ol>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowJoinInfo(false)}>{t('cancel')}</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { setShowJoinInfo(false); onJoinTeam(); }}
            >{t('joinTeamCta')}</button>
          </div>
        </Modal>
      )}
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
          <button type="button" className="role-card-btn" onClick={onPickOwner}
            style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, border: '1px solid var(--border)', borderRadius: 14, background: 'var(--cream)', cursor: 'pointer', textAlign: 'left' }}>
            <Building2 size={28} color="var(--emerald)" aria-hidden="true" />
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'var(--emerald)' }}>{t('iOwnBusiness')}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{t('iOwnBusinessSub')}</div>
            </div>
          </button>
          <button type="button" className="role-card-btn" onClick={onPickStaff}
            style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18, border: '1px solid var(--border)', borderRadius: 14, background: 'var(--cream)', cursor: 'pointer', textAlign: 'left' }}>
            <Users size={28} color="var(--gold)" aria-hidden="true" />
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'var(--emerald)' }}>{t('iWorkAsStaff')}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{t('iWorkAsStaffSub')}</div>
            </div>
          </button>
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink)', flexWrap: 'wrap', gap: 8 }}>
          <span>{t('email')}: <strong style={{ color: 'var(--emerald)' }}>{user?.email}</strong></span>
          <button type="button" className="btn-link" onClick={onLogout}>
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
  const [type, setType] = useState('services');
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
        <form onSubmit={submit} style={{ marginTop: 18 }} aria-busy={busy}>
          <div className="field">
            <label htmlFor="biz-name">{t('businessName')}</label>
            <input id="biz-name" className="input" autoFocus required maxLength={120} value={name}
              autoComplete="organization"
              placeholder={t('businessNamePh')}
              aria-invalid={!!err}
              aria-describedby={err ? 'biz-onboard-error' : undefined}
              onChange={e => { setErr(null); setName(e.target.value); }} />
          </div>
          <div className="field">
            <label>{t('businessTypeLabel')}</label>
            {/* Industry-specific picker drives BIZ_LABELS so users see "Stylist/Appointment/Member/Class"
                immediately, not generic "Provider/Booking". Falls back to "services" for generic case. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {[
                { id: 'salon',      icon: '💇',  label: t('bizTypeSalon'),       sub: t('bizSubSalon') },
                { id: 'spa',        icon: '💆',  label: t('bizTypeSpa'),         sub: t('bizSubSpa') },
                { id: 'barbershop', icon: '💈',  label: t('bizTypeBarbershop'),  sub: t('bizSubBarbershop') },
                { id: 'gym',        icon: '🏋️',  label: t('bizTypeGym'),         sub: t('bizSubGym') },
                { id: 'clinic',     icon: '🩺',  label: t('bizTypeClinic'),      sub: t('bizSubClinic') },
                { id: 'hotel',      icon: '🏨',  label: t('bizTypeHotel'),       sub: t('bizSubHotel') },
                { id: 'restaurant', icon: '🍽️',  label: t('bizTypeRestaurant'),  sub: t('bizSubRestaurant') },
                { id: 'services',   icon: '🛠️',  label: t('bizTypeOtherFull'),   sub: t('bizSubServices') },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12,
                    border: type === opt.id ? '2px solid var(--emerald)' : '1px solid var(--border)',
                    background: type === opt.id ? 'var(--emerald-soft, #e8f3ee)' : 'var(--cream)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 26, flexShrink: 0 }}>{opt.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: type === opt.id ? 'var(--emerald)' : 'var(--text)' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {err && <div id="biz-onboard-error" role="alert" aria-live="assertive" className="error-banner" style={{ marginTop: 4 }}><AlertTriangle size={14} aria-hidden="true" /> {err}</div>}
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
        <form onSubmit={submit} style={{ marginTop: 18 }} aria-busy={busy}>
          <div className="field">
            <label htmlFor="biz-code">{t('businessCode')}</label>
            <input id="biz-code" className="input" autoFocus required value={code}
              autoComplete="off"
              placeholder={t('businessCodePh')}
              aria-invalid={!!err}
              aria-describedby={err ? 'biz-code-error' : undefined}
              style={{ textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'monospace' }}
              onChange={e => { setErr(null); setCode(e.target.value.toUpperCase()); }} />
          </div>
          {err && <div id="biz-code-error" role="alert" aria-live="assertive" className="error-banner" style={{ marginTop: 4 }}><AlertTriangle size={14} aria-hidden="true" /> {err}</div>}
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
function PaymentRequired({ user, onLogout }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const subscribe = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { checkoutUrl } = await api('/api/billing/subscribe', { method: 'POST', body: {} });
      if (checkoutUrl) {
        // Security: validate Stripe origin to prevent open-redirect.
        try {
          const u = new URL(checkoutUrl, window.location.origin);
          const allowed = ['checkout.stripe.com', 'billing.stripe.com'];
          if (!allowed.includes(u.hostname)) {
            setErr(t('subscriptionUnavailable'));
            setBusy(false);
            return;
          }
        } catch {
          setErr(t('subscriptionUnavailable'));
          setBusy(false);
          return;
        }
        window.location.href = checkoutUrl;
        return;
      }
      // No checkout URL = backend Stripe missing. Don't silently auto-activate.
      setErr(t('subscriptionUnavailable'));
      setBusy(false);
    } catch (e) { setErr(e.message || t('failed')); setBusy(false); }
  };

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card" style={{ maxWidth: 440 }}>
        <BrandMark sub={t('paymentRequiredTitle')} />
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Lock size={36} color="var(--gold)" aria-hidden="true" />
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>
            {t('paymentRequiredSub')}
          </p>
        </div>
        {err && <div role="alert" aria-live="assertive" className="error-banner" style={{ marginTop: 12 }}><AlertTriangle size={14} aria-hidden="true" /> {err}</div>}
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 18, padding: '14px 16px', fontSize: 14 }}
          disabled={busy} onClick={subscribe}>
          <Gem size={14} aria-hidden="true" style={{ marginRight: 6 }} /> {busy ? t('pleaseWait') : t('subscribeMonthly')}
        </button>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          {t('subscribeNote')}
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink)', flexWrap: 'wrap', gap: 8 }}>
          <span>{t('email')}: <strong style={{ color: 'var(--emerald)' }}>{user?.email}</strong></span>
          <button type="button" className="btn-link" onClick={onLogout}>
            {t('signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Settings drawer (subscription + switch role) ----------
function SettingsDrawer({ user, business, onClose, onSwitched, onAccountDeleted, toast }) {
  const { t, lang } = useT();
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteErr, setDeleteErr] = useState(null);

  const exportData = async () => {
    setBusy(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/auth/export-data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('exportFailed'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spapilot-data-${user.id}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(t('dataExported'));
    } catch (e) { toast(e.message || t('exportFailed')); }
    finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    setDeleteErr(null);
    if (deleteConfirm !== 'DELETE') {
      setDeleteErr(t('typeDeleteToConfirm'));
      return;
    }
    if (!deletePassword) {
      setDeleteErr(t('passwordRequired'));
      return;
    }
    setBusy(true);
    try {
      await api('/api/auth/account', {
        method: 'DELETE',
        body: { password: deletePassword, confirmation: 'DELETE' },
      });
      toast(t('accountDeleted'));
      onAccountDeleted && onAccountDeleted();
    } catch (e) {
      setDeleteErr(e.message || t('failed'));
      setBusy(false);
    }
  };

  const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / (24 * 60 * 60 * 1000))) : 0;
  const status = user?.subscriptionStatus || 'trial';

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(business?.code || '');
      toast(t('copied'));
    } catch {
      // Clipboard API blocked (older browsers / non-HTTPS) — fall back to a prompt so the
      // user can still see and manually copy the code instead of failing silently.
      try { window.prompt(t('copy'), business?.code || ''); } catch {}
    }
  };

  const switchType = async () => {
    if (!(await appConfirm({ title: t('switchAccountType'), body: t('confirmSwitchAccountType'), confirmLabel: t('continue'), cancelLabel: t('cancel') }))) return;
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
      const { checkoutUrl } = await api('/api/billing/subscribe', { method: 'POST', body: {} });
      if (checkoutUrl) {
        // C1 security fix: validate Stripe URL origin before redirect to prevent open-redirect.
        try {
          const u = new URL(checkoutUrl, window.location.origin);
          const allowed = ['checkout.stripe.com', 'billing.stripe.com'];
          if (!allowed.includes(u.hostname)) {
            toast(t('subscriptionUnavailable'));
            return;
          }
        } catch {
          toast(t('subscriptionUnavailable'));
          return;
        }
        window.location.href = checkoutUrl;
      } else {
        toast(t('subscriptionUnavailable'));
      }
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
          <div style={{ fontSize: 14, wordBreak: 'break-word' }}>{business.name} <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {(() => {
            const key = 'bizType' + (business.type ? business.type.charAt(0).toUpperCase() + business.type.slice(1) : 'Other');
            const val = t(key);
            // Fallback: if no translation key matches (e.g. legacy 'services'/'mix'/'space'/'products'),
            // title-case the raw type so we don't leak "bizTypeServices" to the UI.
            return val === key ? (business.type ? business.type.charAt(0).toUpperCase() + business.type.slice(1) : '') : val;
          })()}</span></div>
        </div>
      )}

      <div className="field">
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('manageSubscription')}</div>
        <div className="row" style={{ marginTop: 0 }}>
          <Gem size={16} color={status === 'active' ? 'var(--emerald)' : 'var(--gold)'} />
          <div className="grow">
            <div className="title" style={{ fontSize: 13 }}>
              {status === 'active' ? t('activePlanLabel') : t('trialActiveBanner').replace('{n}', daysLeft)}
            </div>
            {status !== 'active' && trialEnd && (
              <div className="meta" style={{ fontSize: 11 }}>
                {t('trialActiveUntil')} {trialEnd.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US')}
              </div>
            )}
          </div>
          {status !== 'active' && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={activate}>
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
            <button type="button" className="btn btn-ghost btn-sm" onClick={copyCode}>{t('copy')}</button>
          </div>
        </div>
      )}

      {/* Restart tutorial — promoted above destructive switch-account-type so help is easier to find */}
      <div className="field">
        <button type="button" className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={async () => {
          const ok = await appConfirm({
            title: t('restartTutorialConfirmTitle'),
            body: t('restartTutorialConfirmBody'),
            confirmLabel: t('continue'),
            cancelLabel: t('cancel'),
          });
          if (!ok) return;
          // Clear both legacy global key + this user's per-user keys so tutorial replays
          localStorage.removeItem(TOUR_DONE_KEY);
          if (user?.id) {
            localStorage.removeItem(`spapilot-tutorial-done-u${user.id}`);
            localStorage.removeItem(`spapilot-slides-done-u${user.id}`);
          }
          onClose();
          window.location.reload();
        }}>
          {t('restartTutorial')}
        </button>
      </div>

      <div className="field">
        <button type="button" className="btn btn-ghost" style={{ width: '100%' }} disabled={busy} onClick={switchType}>
          {t('switchAccountType')}
        </button>
      </div>

      <div className="field" style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          {t('privacyAndData')}
        </div>
        <button type="button" className="btn btn-ghost" style={{ width: '100%', fontSize: 13, marginBottom: 8 }} disabled={busy} onClick={exportData}>
          <Download size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {t('exportMyData')}
        </button>
        {!showDeleteConfirm ? (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 13, color: 'var(--danger)' }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t('deleteAccount')}
          </button>
        ) : (
          <div style={{ padding: 12, background: '#fbecec', border: '1px solid #f0c8c8', borderRadius: 8, marginTop: 4 }}>
            <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 10, fontWeight: 600 }}>
              {t('deleteAccountWarn')}
            </div>
            <input
              type="password"
              className="input"
              autoComplete="current-password"
              aria-label={t('password')}
              autoFocus
              placeholder={t('yourPasswordPlaceholder')}
              value={deletePassword}
              onChange={e => { setDeleteErr(null); setDeletePassword(e.target.value); }}
              style={{ marginBottom: 8 }}
            />
            <input
              type="text"
              className="input"
              autoComplete="off"
              aria-label={t('typeDeleteToConfirm')}
              placeholder={t('typeDeleteToConfirm')}
              value={deleteConfirm}
              onChange={e => { setDeleteErr(null); setDeleteConfirm(e.target.value); }}
              style={{ marginBottom: 8 }}
            />
            {deleteErr && (
              <div role="alert" aria-live="assertive" style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{deleteErr}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteConfirm(''); setDeleteErr(null); }}
              >
                {t('cancel')}
              </button>
              <button
                className="btn btn-sm"
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', border: 'none' }}
                disabled={busy}
                onClick={deleteAccount}
              >
                {busy ? t('deletingEllipsis') : t('deleteForever')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- Offline banner ----------
function OfflineBanner() {
  const { lang } = useT();
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
  const msg = lang === 'id'
    ? "⚠ Anda offline — perubahan tidak akan tersimpan sampai terhubung kembali"
    : "⚠ You're offline — changes won't save until you reconnect";
  return (
    <div role="alert" style={{
      background: '#fbecec', borderBottom: '1px solid #f0c8c8', color: 'var(--danger)',
      padding: '8px 14px', fontSize: 12, textAlign: 'center', fontWeight: 600,
    }}>
      {msg}
    </div>
  );
}

// ---------- Trial banner ----------
// Show subtle banner from day 1 (count remaining), escalate styling at ≤3 days.
// Users need a continuous reminder, not a surprise on day 4.
function TrialBanner({ user, onUpgrade }) {
  const { t } = useT();
  if (!user || user.subscriptionStatus === 'active') return null;
  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  if (!trialEnd) return null;
  const daysLeft = Math.max(0, Math.ceil((trialEnd - new Date()) / (24 * 60 * 60 * 1000)));
  const urgent = daysLeft <= 3;
  const ended = daysLeft <= 0;
  const label = ended
    ? t('trialEnded')
    : urgent
      ? t('trialEndingSoon').replace('{n}', daysLeft)
      : t('trialActiveBanner').replace('{n}', daysLeft);
  const styles = ended
    ? { bg: '#fbecec', border: '#f0c8c8', text: 'var(--danger)' }
    : urgent
      ? { bg: '#fef3e0', border: '#f5d8a4', text: 'var(--warn)' }
      : { bg: 'var(--emerald-soft, #e6ede9)', border: 'var(--line)', text: 'var(--emerald)' };
  return (
    <div role="status" style={{
      background: styles.bg, borderBottom: `1px solid ${styles.border}`,
      padding: '8px 14px', fontSize: 12, color: styles.text,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {urgent ? <AlertTriangle size={12} aria-hidden="true" /> : <Gem size={12} aria-hidden="true" />}
        {label}
      </span>
      <button
        className="btn btn-sm"
        onClick={onUpgrade}
        aria-label={`${t('subscribeMonthly')} — ${label}`}
        style={{ background: urgent ? 'var(--emerald)' : 'transparent', color: urgent ? '#fff' : 'var(--emerald)', border: urgent ? 'none' : '1px solid var(--emerald)' }}
      >
        {t('subscribeMonthly')}
      </button>
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
    // Pick first staff if none selected.
    if (!staffId && staff[0]?.id) { setStaffId(staff[0].id); return; }
    // If selected staffId is no longer in the list (deleted), fall back to first.
    if (staffId && !staff.some(s => s.id === staffId)) {
      setStaffId(staff[0]?.id || null);
    }
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
    { id: 'manager', label: t('manager'), sub: t('managerSub'), icon: <LayoutDashboard size={22} aria-hidden="true" /> },
    { id: 'staff',   label: t('staff'),   sub: t('staffSub'),   icon: <Leaf size={22} aria-hidden="true" /> },
  ];

  return (
    <div className="role-screen">
      <LangToggle floating />
      <div className="role-card">
        <BrandMark sub={t('oneLast')} />
        {err && <div role="alert" aria-live="assertive" className="error-banner" style={{ marginTop: 14 }}><AlertTriangle size={14} aria-hidden="true" /> {err}</div>}

        {picking === 'staff' ? (
          <div style={{ marginTop: 18 }}>
            {staff.length === 0 ? (
              <div className="center-muted" style={{ padding: '20px 12px', fontSize: 14, lineHeight: 1.5 }}>
                {t('noTeamMembersAskManager')}
              </div>
            ) : (
              <div className="field">
                <label htmlFor="role-staff-select">{t('whichMember')}</label>
                <select id="role-staff-select" className="select" value={staffId || ''} onChange={e => setStaffId(Number(e.target.value))}>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPicking(null)} disabled={busy}>{t('back')}</button>
              {staff.length > 0 && (
                <button type="button" className="btn btn-primary" onClick={() => pick('staff')} disabled={busy || !staffId}>
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

        <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onLogout}>
          <LogOut size={14} aria-hidden="true" /> {t('signOut')}
        </button>
      </div>
    </div>
  );
}

// ================= MANAGER VIEWS =================

function ManagerDashboard({ staff, bookings, inventory, requests, announcements, violations, onGoto, onReload, toast }) {
  const { t, lang } = useT();
  const { labels } = useBiz();
  const todayStr = new Date().toISOString().slice(0, 10);
  // Map lookup — replaces O(n*m) .find() across upcoming bookings + violations rows.
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);
  // C1 fix: count only TODAY's bookings, not all-time. Stat card label says "Today's Bookings"
  // so it must actually reflect today.
  const todayBookings = useMemo(
    () => bookings.filter(b => (b.date || todayStr) === todayStr),
    [bookings, todayStr]
  );
  // C4 fix: upcoming = today onwards, sorted by date+time ascending. Drops past bookings.
  const upcomingBookings = useMemo(
    () => bookings
      .filter(b => (b.date || todayStr) >= todayStr)
      .sort((a, b) => {
        const dateA = a.date || todayStr;
        const dateB = b.date || todayStr;
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.time || '').localeCompare(b.time || '');
      }),
    [bookings, todayStr]
  );
  const lowStock = useMemo(() => inventory.filter(i => i.stock <= i.threshold), [inventory]);
  const pending  = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const [busy, setBusy] = useState(false);
  const bookingLabel = labels.todayCount;

  const reorderAll = async () => {
    if (!lowStock.length) { toast && toast(t('noLowStock')); return; }
    setBusy(true);
    try {
      // Use allSettled so partial successes are kept (was Promise.all → one failure aborted batch).
      const results = await Promise.allSettled(
        lowStock.map(i => api(`/api/inventory/${i.id}/order`, { method: 'POST', body: {} }))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      onReload && onReload();
      if (failed === 0) {
        toast && toast(t('reorderAllDone'));
      } else if (failed === results.length) {
        toast && toast(t('couldNotMarkOrdered'));
      } else {
        toast && toast(`${results.length - failed}/${results.length} ${t('markedOrdered').toLowerCase()}`);
      }
    } catch (e) { toast && toast(e.message || t('couldNotMarkOrdered')); }
    finally { setBusy(false); }
  };

  const stats = [
    { v: todayBookings.length, l: bookingLabel,    i: <Calendar size={16} aria-hidden="true" /> },
    { v: staff.length,         l: t('activeStaff'), i: <Users size={16} aria-hidden="true" /> },
    { v: lowStock.length,      l: t('lowStock'),    i: <Package size={16} aria-hidden="true" /> },
  ];

  const CHECKLIST_KEY = 'app_checklist';
  const [checkItems, setCheckItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || []; }
    catch { return []; }
  });
  const [newTask, setNewTask] = useState('');
  // Debounced persistence — avoids hitting localStorage on every keystroke / tap.
  // Also flushes on tab hide so a sudden close doesn't lose the last change.
  const checklistWriteTimer = useRef(null);
  useEffect(() => {
    if (checklistWriteTimer.current) clearTimeout(checklistWriteTimer.current);
    checklistWriteTimer.current = setTimeout(() => {
      try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checkItems)); } catch {}
    }, 200);
    return () => { if (checklistWriteTimer.current) clearTimeout(checklistWriteTimer.current); };
  }, [checkItems]);
  useEffect(() => {
    const flush = () => {
      try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checkItems)); } catch {}
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [checkItems]);

  const saveItems = (items) => {
    setCheckItems(items);
  };
  const toggleItem = (id) => saveItems(checkItems.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const addItem = () => {
    const text = newTask.trim();
    if (!text) return;
    if (checkItems.length >= 50) return; // cap so localStorage payload stays small
    saveItems([...checkItems, { id: Date.now(), text, done: false }]);
    setNewTask('');
  };
  const removeItem = (id) => saveItems(checkItems.filter(i => i.id !== id));

  return (
    <div>
      <div className="stats" role="group" aria-label={t('snapshot')}>
        {stats.map(s => (
          <div className="stat" key={s.l} aria-label={`${s.v} ${s.l}`}>
            <div className="icon-mini" aria-hidden="true">{s.i}</div>
            <div className="v" aria-hidden="true">{s.v}</div>
            <div className="l" aria-hidden="true">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('quickActionsBar')}</h2></div>
        <div className="qa-grid">
          <button type="button" className="qa-btn" onClick={reorderAll} disabled={busy || lowStock.length === 0} aria-label={`${t('reorderAll')}${lowStock.length > 0 ? ` (${lowStock.length})` : ''}`}>
            <Package size={18} aria-hidden="true" />
            <span>{t('reorderAll')}{lowStock.length > 0 ? ` (${lowStock.length})` : ''}</span>
          </button>
          <button type="button" className="qa-btn" onClick={() => onGoto('alerts')} aria-label={`${t('reviewRequests')}${pending.length > 0 ? ` (${pending.length})` : ''}`}>
            <Bell size={18} aria-hidden="true" />
            <span>{t('reviewRequests')}{pending.length > 0 ? ` (${pending.length})` : ''}</span>
          </button>
          <button type="button" className="qa-btn" onClick={() => onGoto('announcements')} aria-label={t('broadcast')}>
            <Megaphone size={18} aria-hidden="true" />
            <span>{t('broadcast')}</span>
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="card-head">
            <h2><AlertTriangle size={16} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {pending.length} {pending.length === 1 ? t('pendingRequest') : t('pendingRequests')}</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onGoto('alerts')}>{t('review')}</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h2>{t('upcomingLabel')} {labels.bookingPlural}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onGoto('schedule')}>{t('viewAll')}</button>
        </div>
        {upcomingBookings.length === 0 ? (
          <div className="center-muted" style={{ padding: '20px 0', fontSize: 14 }}>
            {t('noBookings')} <button
              onClick={() => onGoto('schedule')}
              className="btn-link"
              style={{ fontSize: 14 }}
            >{t('addFirstOne')}</button>
          </div>
        ) : upcomingBookings.slice(0, 5).map(b => {
          const m = staffById.get(b.staffId);
          const isToday = (b.date || todayStr) === todayStr;
          const locale = lang === 'id' ? 'id-ID' : 'en-US';
          const shortDate = b.date ? new Date(b.date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }) : '';
          return (
            <div key={b.id} className="row">
              <div style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0, fontFamily: 'Fraunces, serif', fontSize: 13, minWidth: isToday ? 54 : 92, whiteSpace: 'nowrap' }}>
                {isToday ? b.time : `${shortDate} · ${b.time}`}
              </div>
              <div className="grow">
                <div className="title">{b.client}</div>
                <div className="meta">{b.treatment}{b.duration ? ` · ${fmtDuration(b.duration, lang)}` : ''}</div>
              </div>
              {m && <Avatar initial={m.avatar} color={m.color} size={28} />}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('checklist')}</h2></div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {checkItems.length} {checkItems.length === 1 ? t('notes_1') : t('notes_n')}
        </div>
        {checkItems.length === 0 && (
          <div className="center-muted" style={{ padding: '12px 0', fontSize: 14 }}>{t('checklistEmpty')}</div>
        )}
        {checkItems.map(item => (
          <div key={item.id} className="row" style={{ padding: 0 }}>
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-pressed={item.done}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, flex: 1, minHeight: 44,
                background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer',
                textAlign: 'left', font: 'inherit', color: 'inherit',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: '2px solid ' + (item.done ? 'var(--emerald)' : 'var(--line)'),
                background: item.done ? 'var(--emerald)' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.done && <Check size={12} color="#fff" aria-hidden="true" />}
              </span>
              <span className="grow" style={{
                textDecoration: item.done ? 'line-through' : 'none',
                color: item.done ? 'var(--muted)' : 'var(--ink)',
                fontSize: 15,
              }}>{item.text}</span>
            </button>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
              aria-label={t('remove')}
            ><X size={16} aria-hidden="true" /></button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            className="input"
            value={newTask}
            maxLength={200}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder={t('checklistAdd')}
            aria-label={t('checklistAdd')}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-sm" onClick={addItem} disabled={!newTask.trim()}
            style={{ padding: '0 14px', background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('latestAnnouncement')}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onGoto('announcements')}>{t('manage')}</button>
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
          <h2>{t('recentSopNotes')}</h2>
          {violations.slice(-3).reverse().map(v => {
            const s = staffById.get(v.staffId);
            return (
              <div key={v.id} className="row">
                {s && <Avatar initial={s.avatar} color={s.color} size={28} />}
                <div className="grow">
                  <div className="title">{s ? s.name : `${labels.staffMember} #${v.staffId}`}</div>
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

function ScheduleTab({ bookings, staff, services = [], onReload, toast }) {
  const { labels } = useBiz();
  const { t, lang } = useT();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [visibleCount, setVisibleCount] = useState(50);
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

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };
  const dateLabel = useMemo(() => {
    if (selectedDate === todayStr) return t('today');
    const d = new Date(selectedDate + 'T12:00:00');
    return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [selectedDate, todayStr, t, lang]);

  // Detect overlapping bookings for visual conflict indicator
  const conflictIds = useMemo(() => {
    const sameDay = bookings.filter(b => (b.date || todayStr) === selectedDate);
    const conflicts = new Set();
    for (let i = 0; i < sameDay.length; i++) {
      for (let j = i + 1; j < sameDay.length; j++) {
        const a = sameDay[i], b = sameDay[j];
        if (!a.staffId || !b.staffId || a.staffId !== b.staffId) continue;
        const aStart = toMin(a.time), aEnd = aStart + (Number(a.duration) || 0);
        const bStart = toMin(b.time), bEnd = bStart + (Number(b.duration) || 0);
        if (aStart < bEnd && bStart < aEnd) { conflicts.add(a.id); conflicts.add(b.id); }
      }
    }
    return conflicts;
  }, [bookings, selectedDate, todayStr]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = bookings.filter(b => (b.date || todayStr) === selectedDate);
    if (q) out = out.filter(b =>
      (b.client || '').toLowerCase().includes(q) ||
      (b.treatment || '').toLowerCase().includes(q) ||
      (b.notes || '').toLowerCase().includes(q)
    );
    out = [...out].sort((a, b) => sortDir === 'asc' ? (a.time || '').localeCompare(b.time || '') : (b.time || '').localeCompare(a.time || ''));
    return out;
  }, [bookings, query, sortDir, selectedDate, todayStr]);
  // Reset pagination when filter inputs change so user starts from page 1.
  useEffect(() => { setVisibleCount(50); }, [query, selectedDate, sortDir]);

  const del = async (id) => {
    if (!(await appConfirm({ title: t('deleteBooking'), confirmLabel: t('delete'), cancelLabel: t('cancel'), danger: true }))) return;
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
      // C5 fix: include date column so multi-day exports are usable.
      return {
        date: b.date || '',
        time: b.time,
        client: b.client,
        service: b.treatment,
        duration: b.duration,
        price: b.price || 0,
        staff: m?.name || '',
        notes: b.notes || '',
      };
    });
    downloadCSV(`bookings-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  const totalRevenue = useMemo(
    () => filtered.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
    [filtered]
  );

  // Map lookups — replaces O(n*m) .find() inside the row render loop. Power users
  // with 200+ bookings + dozens of staff/services felt the lag.
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);
  const serviceByName = useMemo(() => {
    const m = new Map();
    for (const s of services) m.set((s.name || '').toLowerCase(), s);
    return m;
  }, [services]);

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h2>{dateLabel} · {labels.bookingPlural}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
            <Plus size={14} aria-hidden="true" /> {t('add')}
          </button>
        </div>

        {/* Date picker with prev/next + jump-to-today */}
        <div className="date-nav">
          <button type="button" className="btn-icon" onClick={() => shiftDate(-1)} aria-label={t('previousDay')}>‹</button>
          <input
            type="date"
            className="input date-nav-input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value || todayStr)}
          />
          <button type="button" className="btn-icon" onClick={() => shiftDate(1)} aria-label={t('nextDay')}>›</button>
          {selectedDate !== todayStr && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(todayStr)}>{t('today')}</button>
          )}
        </div>

        {/* Quick stats for the selected date */}
        {filtered.length > 0 && (
          <div className="day-stats">
            <div className="day-stat"><span className="v">{filtered.length}</span><span className="l">{labels.bookingPlural}</span></div>
            {totalRevenue > 0 && <div className="day-stat"><span className="v">{fmtMoney(totalRevenue, lang)}</span><span className="l">{t('revenue')}</span></div>}
            {conflictIds.size > 0 && <div className="day-stat day-stat-warn"><span className="v">{conflictIds.size / 2}</span><span className="l">{t('conflictsCount')}</span></div>}
          </div>
        )}

        <div className="search-wrap">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input className="search-input" type="search" enterKeyHint="search" placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} aria-label={t('search')} />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label={t('clearSearch')}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="toolbar">
          <select className="select" value={sortDir} onChange={e => setSortDir(e.target.value)} aria-label={t('sortBy')}>
            <option value="asc">{t('timeAsc')}</option>
            <option value="desc">{t('timeDesc')}</option>
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={12} aria-hidden="true" /> {t('exportCsv')}
          </button>
        </div>

        {filtered.length === 0 ? (
          query
            ? <div className="center-muted">{t('noResults')}</div>
            : <EmptyState
                icon={Calendar}
                title={t('emptyScheduleTitle').replace('{plural}', labels.bookingPlural.toLowerCase()).replace('{date}', dateLabel.toLowerCase())}
                body={t('emptyScheduleBody').replace('{item}', labels.booking.toLowerCase())}
                ctaLabel={`${t('add')} ${labels.booking.toLowerCase()}`}
                onCta={() => setModal('new')}
              />
        ) : filtered.slice(0, visibleCount).map(b => {
          const m = staffById.get(b.staffId);
          const isConflict = conflictIds.has(b.id);
          const svc = serviceByName.get((b.treatment || '').toLowerCase());
          const accent = isConflict ? 'var(--danger)' : (svc?.color || 'var(--gold)');
          return (
            <div key={b.id} className={`sched-block ${isConflict ? 'sched-conflict' : ''}`} style={{ borderLeftColor: accent }}>
              <div className="time" style={{ color: accent }}>{b.time}</div>
              <div className="grow">
                <div className="title">{b.client}</div>
                <div className="meta">{b.treatment}{b.duration ? ` · ${fmtDuration(b.duration, lang)}` : ''}{b.price > 0 ? ` · ${fmtMoney(b.price, lang)}` : ''}</div>
                {m && <div className="meta" style={{ marginTop: 4 }}>{t('withPerson')} <strong>{m.name}</strong></div>}
                {isConflict && <div className="note-chip note-chip-danger"><AlertTriangle size={12} aria-hidden="true" style={{ marginRight: 4, verticalAlign: 'middle' }} />{t('overlapsWithAnother')}</div>}
                {b.allergies && <div className="note-chip note-chip-danger"><AlertTriangle size={12} aria-hidden="true" style={{ marginRight: 4, verticalAlign: 'middle' }} />{t('allergies')}: {b.allergies}</div>}
                {b.notes && <div className="note-chip">{t('notes')}: {b.notes}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" className="btn-icon" onClick={() => setModal(b)} aria-label={`${t('edit')} ${b.client} ${b.time}`}><Edit2 size={14} aria-hidden="true" /></button>
                <button type="button" className="btn-icon" onClick={() => del(b.id)} aria-label={`${t('delete')} ${b.client} ${b.time}`}><Trash2 size={14} aria-hidden="true" /></button>
              </div>
            </div>
          );
        })}
        {filtered.length > visibleCount && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVisibleCount(c => c + 50)}>
              {t('loadMore')} ({filtered.length - visibleCount} {t('more')})
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>{t('weekOverview')}</h2>
        <div className="week-grid">
          {dayCounts.map(x => {
            // Click a week cell to jump the date picker to that day of the current week.
            const dayIdx = DAYS.indexOf(x.d); // Mon..Sun → 0..6
            const today = new Date();
            const todayIdx = (today.getDay() + 6) % 7; // shift Sun(0) → 6
            const diff = dayIdx - todayIdx;
            const target = new Date(today);
            target.setDate(today.getDate() + diff);
            const targetIso = target.toISOString().slice(0, 10);
            return (
              <button
                type="button"
                className="week-cell"
                key={x.d}
                onClick={() => setSelectedDate(targetIso)}
                aria-label={`${t('days')[x.d]} — ${x.c} ${labels.bookingPlural.toLowerCase()}`}
                style={{ cursor: 'pointer', font: 'inherit', color: 'inherit' }}
              >
                <div className="d">{t('days')[x.d]}</div>
                <div className="c">{x.c}</div>
                <div>{labels.bookingPlural.toLowerCase()}</div>
              </button>
            );
          })}
        </div>
      </div>

      {modal && (
        <BookingModal
          booking={modal === 'new' ? null : modal}
          staff={staff}
          services={services}
          allBookings={bookings}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onReload(); toast(modal === 'new' ? t('bookingAdded') : t('bookingUpdated')); }}
        />
      )}
    </div>
  );
}

function BookingModal({ booking, staff, services = [], allBookings = [], onClose, onSaved }) {
  const { t, lang } = useT();
  const { labels, business } = useBiz();
  // C6 fix: allow allergies field for new generic business categories too.
  // Was only ['spa','salon','clinic'] → new users with type='services' lost the field.
  const showAllergies = ['spa', 'salon', 'clinic', 'services', 'mix'].includes(business?.type || 'services');
  const hasStaff = staff && staff.length > 0;
  const hasServices = services && services.length > 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState(() => {
    if (!booking) return {
      date: todayStr, time: '10:00', client: '', treatment: '', duration: 60,
      staffId: hasStaff ? staff[0].id : null,
      therapist: '',
      notes: '', allergies: '', clientPhone: '', price: 0,
    };
    return { ...booking, date: booking.date || todayStr, therapist: booking.therapist || '' };
  });

  const pickService = (id) => {
    const svc = services.find(s => s.id === Number(id));
    if (!svc) return;
    setF(prev => ({
      ...prev,
      treatment: svc.name,
      duration: svc.durationMin || prev.duration,
      price: svc.price || prev.price,
    }));
  };
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  // Detect overlap with existing bookings on same staff member at the same time/date.
  // Returns conflict booking if found, else null. Excludes the booking we're editing.
  const findConflict = () => {
    if (!f.staffId || !f.date || !f.time || !f.duration) return null;
    const newStart = toMin(f.time);
    const newEnd = newStart + (Number(f.duration) || 0);
    return allBookings.find(b => {
      if (booking && b.id === booking.id) return false; // skip self when editing
      if (b.staffId !== f.staffId) return false;
      if ((b.date || '') !== f.date) return false;
      const bStart = toMin(b.time);
      const bEnd = bStart + (Number(b.duration) || 0);
      return newStart < bEnd && bStart < newEnd;
    });
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    // Validate duration — was accepting empty/NaN silently.
    const dur = Number(f.duration);
    if (!dur || dur < 5) {
      setErr(`${t('durationMin')}: min 5`);
      setSaving(false);
      return;
    }
    // Pre-save conflict check — warn user before creating a double-booking.
    const conflict = findConflict();
    if (conflict) {
      const ok = await appConfirm({
        title: t('overlapsWithAnother'),
        body: `${conflict.client} @ ${conflict.time} (${fmtDuration(conflict.duration, lang)}). ${t('save')}?`,
        confirmLabel: t('save'),
        cancelLabel: t('cancel'),
        danger: true,
      });
      if (!ok) { setSaving(false); return; }
    }
    // Warn (but allow) if booking is in the past — useful for logging historical visits.
    // Also warn on edits that move a booking into the past (was previously create-only).
    const wasFuture = booking ? (booking.date || todayStr) >= todayStr : false;
    const movedToPast = booking && wasFuture && f.date && f.date < todayStr;
    if (f.date && f.date < todayStr && (!booking || movedToPast)) {
      const ok = await appConfirm({
        title: t('dateInPastWarn'),
        body: `${f.date}. ${t('save')}?`,
        confirmLabel: t('save'),
        cancelLabel: t('cancel'),
      });
      if (!ok) { setSaving(false); return; }
    }
    try {
      // Coerce empty-string price + ensure staffId is sent (so bookings show up in per-staff views).
      // If staff exists but user typed a custom name in the fallback input, keep `therapist` text but
      // also pass `staffId` if it was selected from the dropdown.
      const body = {
        ...f,
        duration: dur,
        price: f.price === '' || f.price == null ? 0 : Number(f.price),
        staffId: f.staffId || null,
      };
      if (booking) await api(`/api/bookings/${booking.id}`, { method: 'PUT', body });
      else         await api('/api/bookings', { method: 'POST', body });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={booking ? `${t('edit')} ${labels.booking.toLowerCase()}` : `${t('add')} ${labels.booking.toLowerCase()}`} onClose={onClose}>
      <form onSubmit={save} aria-busy={saving}>
        {err && <div id="booking-error" role="alert" aria-live="assertive" className="error-banner"><AlertTriangle size={14} aria-hidden="true" />{err}</div>}
        <div className="field"><label htmlFor="booking-client">{labels.client}</label>
          <input id="booking-client" className="input" required maxLength={120} value={f.client} onChange={e => setF({ ...f, client: e.target.value })} aria-invalid={!!err} aria-describedby={err ? 'booking-error' : undefined} /></div>
        {hasServices && (
          <div className="field"><label htmlFor="booking-catalog">{t('pickFromCatalog')}</label>
            {/* Persist selection so picker shows what was chosen (was resetting to placeholder — confusing). */}
            <select
              id="booking-catalog"
              className="select"
              value={services.find(s => (s.name || '').toLowerCase() === (f.treatment || '').toLowerCase())?.id || ''}
              onChange={e => e.target.value && pickService(e.target.value)}
            >
              <option value="">{t('chooseAService')}</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} · {fmtDuration(s.durationMin, lang)} · {fmtMoney(s.price, lang)}</option>
              ))}
            </select>
          </div>
        )}
        <div className="field"><label htmlFor="booking-treatment">{labels.service}</label>
          <input id="booking-treatment" className="input" required maxLength={120} value={f.treatment} onChange={e => setF({ ...f, treatment: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="booking-date">{t('date')}</label>
            <input id="booking-date" className="input" type="date" required
              max="2099-12-31"
              value={f.date || todayStr} onChange={e => setF({ ...f, date: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label htmlFor="booking-time">{t('time')}</label>
            <input id="booking-time" className="input" type="time" required value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="booking-duration">{t('durationMin')}</label>
          <input id="booking-duration" className="input" type="number" min="5" max="1440" inputMode="numeric" value={f.duration ?? ''} onChange={e => setF({ ...f, duration: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
        {/* Staff picker — select from team if any exist, fallback to text input.
            Both keep the booking linked correctly: select sets staffId, text input is for ad-hoc names. */}
        <div className="field"><label htmlFor="booking-staff">{labels.staffMember}</label>
          {hasStaff ? (
            <select
              id="booking-staff"
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
              id="booking-staff"
              className="input"
              placeholder={t('staffNameNoTeamPh').replace('{role}', labels.staffMember)}
              value={f.therapist || ''}
              onChange={e => setF({ ...f, therapist: e.target.value })}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="booking-phone">{labels.client} · {t('phoneShort')}</label>
            <input id="booking-phone" className="input" type="tel" autoComplete="tel" placeholder={t('phonePlaceholder')} value={f.clientPhone || ''} onChange={e => setF({ ...f, clientPhone: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label htmlFor="booking-price">{t('price')}</label>
            <input id="booking-price" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={f.price ?? ''} onChange={e => setF({ ...f, price: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
        </div>
        {/* Allergies field only relevant for spa/salon/clinic. Hide for gym/hotel/barbershop/other. */}
        {showAllergies && (
          <div className="field"><label htmlFor="booking-allergies">{t('allergies')}</label>
            <input id="booking-allergies" className="input" placeholder={t('allergiesPh')} value={f.allergies || ''} onChange={e => setF({ ...f, allergies: e.target.value })} /></div>
        )}
        <div className="field"><label htmlFor="booking-notes">{t('notes')}</label>
          <textarea id="booking-notes" className="textarea" maxLength={2000} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
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

// ================= CLIENTS TAB =================
// Derived from bookings — aggregates by client name (case-insensitive). No backend
// schema change required. Each row = 1 unique client with totals + last visit + history.
function ClientsTab({ bookings, staff, toast }) {
  const { t, lang } = useT();
  const { labels } = useBiz();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null); // selected client name or null
  const [visibleCount, setVisibleCount] = useState(50);
  // O(1) staff lookup — replaces .find() inside the per-booking history render loop.
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);

  // Aggregate clients from bookings
  const clients = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      const name = (b.client || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = map.get(key) || {
        name, key, phone: '', visits: 0, totalSpend: 0, lastVisit: null,
        bookings: [], allergies: '', notes: '',
      };
      existing.visits += 1;
      existing.totalSpend += Number(b.price) || 0;
      if (b.clientPhone && !existing.phone) existing.phone = b.clientPhone;
      if (b.allergies && !existing.allergies) existing.allergies = b.allergies;
      const date = b.date || '';
      if (date && (!existing.lastVisit || date > existing.lastVisit)) existing.lastVisit = date;
      existing.bookings.push(b);
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [clients, query]);
  useEffect(() => { setVisibleCount(50); }, [query]);

  const exportCsv = () => {
    const rows = clients.map(c => ({
      name: c.name, phone: c.phone, visits: c.visits,
      totalSpend: c.totalSpend, lastVisit: c.lastVisit || '',
    }));
    downloadCSV(`${labels.clientPlural.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  const detail = open && clients.find(c => c.key === open);

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h2>{labels.clientPlural} ({clients.length})</h2>
        </div>
        <div className="search-wrap">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input className="search-input" type="search" enterKeyHint="search" placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} aria-label={t('search')} />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label={t('clearSearch')}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={12} aria-hidden="true" /> {t('exportCsv')}
          </button>
        </div>

        {clients.length === 0 ? (
          <EmptyState
            icon={User}
            title={t('emptyClientsTitle').replace('{plural}', labels.clientPlural.toLowerCase())}
            body={t('emptyClientsBody').replace('{Plural}', labels.clientPlural).replace('{bookings}', labels.bookingPlural.toLowerCase())}
          />
        ) : filtered.length === 0 ? (
          <div className="center-muted">{t('noResults')}</div>
        ) : filtered.slice(0, visibleCount).map(c => (
          <div
            key={c.key}
            className="row"
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            onClick={() => setOpen(c.key)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(c.key); } }}
          >
            <Avatar initial={c.name[0]} color="#5b8a72" size={40} />
            <div className="grow">
              <div className="title">{c.name}</div>
              <div className="meta">
                {c.visits} {c.visits === 1 ? labels.booking.toLowerCase() : labels.bookingPlural.toLowerCase()}
                {c.phone ? ` · ${c.phone}` : ''}
              </div>
              {c.allergies && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--danger)' }}>
                  <AlertTriangle size={11} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 3 }} />
                  {t('allergies')}: {c.allergies}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
              <div style={{ fontWeight: 600, color: 'var(--emerald)' }}>{fmtMoney(c.totalSpend, lang)}</div>
              <div style={{ fontSize: 11 }}>{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric' }) : ''}</div>
            </div>
          </div>
        ))}
        {filtered.length > visibleCount && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVisibleCount(c => c + 50)}>
              {t('loadMore')} ({filtered.length - visibleCount} {t('more')})
            </button>
          </div>
        )}
      </div>

      {detail && (
        <Modal title={detail.name} onClose={() => setOpen(null)}>
          <div className="field">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              <Avatar initial={detail.name[0]} color="#5b8a72" size={56} />
              <div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, color: 'var(--emerald)' }}>{detail.name}</div>
                {detail.phone && <div className="meta">{detail.phone}</div>}
              </div>
            </div>

            <div className="stats" role="group" style={{ marginBottom: 14 }}>
              <div className="stat" aria-label={`${detail.visits} ${labels.bookingPlural}`}>
                <div className="v" aria-hidden="true">{detail.visits}</div>
                <div className="l" aria-hidden="true">{labels.bookingPlural}</div>
              </div>
              <div className="stat" aria-label={`${fmtMoney(detail.totalSpend, lang)} ${t('revenue')}`}>
                <div className="v" aria-hidden="true">{fmtMoney(detail.totalSpend, lang)}</div>
                <div className="l" aria-hidden="true">{t('revenue')}</div>
              </div>
              <div className="stat" aria-label={`${t('lastVisitLabel')} ${detail.lastVisit ? new Date(detail.lastVisit).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}`}>
                <div className="v" aria-hidden="true">{detail.lastVisit ? new Date(detail.lastVisit).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                <div className="l" aria-hidden="true">{t('lastVisitLabel')}</div>
              </div>
            </div>

            {detail.allergies && (
              <div style={{ background: '#fbecec', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13, color: 'var(--danger)' }}>
                <AlertTriangle size={13} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                <strong>{t('allergies')}:</strong> {detail.allergies}
              </div>
            )}

            <h3 className="modal-subhead" style={{ fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '14px 0 8px' }}>
              {t('historyLabel')}
            </h3>
            {detail.bookings
              .slice()
              .sort((a, b) => {
                // Newest visit first by (date, time). DB order doesn't guarantee
                // multi-day clients arrive in display order.
                const da = a.date || '';
                const db = b.date || '';
                if (da !== db) return db.localeCompare(da);
                return (b.time || '').localeCompare(a.time || '');
              })
              .map(b => {
              const m = staffById.get(b.staffId);
              return (
                <div key={b.id} className="row">
                  <Calendar size={16} color="var(--gold)" aria-hidden="true" />
                  <div className="grow">
                    <div className="title">{b.treatment}</div>
                    <div className="meta">{b.time}{b.duration ? ` · ${fmtDuration(b.duration, lang)}` : ''}{m ? ` · ${m.name}` : ''}</div>
                  </div>
                  {b.price > 0 && <div style={{ fontWeight: 600, color: 'var(--emerald)' }}>{fmtMoney(b.price, lang)}</div>}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

function StaffTab({ staff, violations, onReload, toast }) {
  const { t, lang } = useT();
  const { labels } = useBiz();
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q)
    );
  }, [staff, query]);
  useEffect(() => { setVisibleCount(50); }, [query]);

  const exportCsv = () => {
    const rows = staff.map(s => ({
      id: s.id, name: s.name, role: s.role,
      birthday: s.birthday || '', schedule: (s.schedule || []).join('|'),
      violations: violations.filter(v => v.staffId === s.id).length,
    }));
    downloadCSV(`staff-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  const del = async (id) => {
    if (!(await appConfirm({ title: t('removeStaff'), confirmLabel: t('remove'), cancelLabel: t('cancel'), danger: true }))) return;
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
          <h2>{labels.staffPlural}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal('new')}><Plus size={14} aria-hidden="true" /> {t('add')}</button>
        </div>
        <div className="search-wrap">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input className="search-input" type="search" enterKeyHint="search" placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} aria-label={t('search')} />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label={t('clearSearch')}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={12} aria-hidden="true" /> {t('exportCsv')}
          </button>
        </div>
        {filtered.length === 0 ? (
          query
            ? <div className="center-muted">{t('noResults')}</div>
            : <EmptyState
                icon={Users}
                title={t('emptyStaffTitle2').replace('{plural}', labels.staffPlural.toLowerCase())}
                body={t('emptyStaffBody2').replace('{plural}', labels.staffPlural.toLowerCase()).replace('{bookings}', labels.bookingPlural.toLowerCase())}
                ctaLabel={t('addFirstFmt').replace('{item}', labels.staffMember.toLowerCase())}
                onCta={() => setModal('new')}
              />
        ) : filtered.slice(0, visibleCount).map(s => {
          const vCount = violations.filter(v => v.staffId === s.id).length;
          return (
            <div key={s.id} className="row">
              <Avatar initial={s.avatar} color={s.color} size={44} />
              <div className="grow">
                <div className="title">{s.name}</div>
                <div className="meta">{s.role}{s.birthday ? ` · ${t('birthday').toLowerCase()} ${new Date(s.birthday).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}` : ''}</div>
                <div style={{ marginTop: 4 }}>
                  {vCount > 0 && <Badge label={`${vCount} ${vCount === 1 ? t('sopNote') : t('sopNotes')}`} type="warn" />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {waLink(s.phone) && (
                  <a className="btn-icon" href={waLink(s.phone)} target="_blank" rel="noopener noreferrer" aria-label={`${t('whatsapp')} ${s.name}`} title={t('whatsapp')}>
                    <PhoneCall size={14} aria-hidden="true" />
                  </a>
                )}
                <button type="button" className="btn-icon" onClick={() => setModal(s)} aria-label={`${t('edit')} ${s.name}`}><Edit2 size={14} aria-hidden="true" /></button>
                <button type="button" className="btn-icon" onClick={() => del(s.id)} aria-label={`${t('delete')} ${s.name}`}><Trash2 size={14} aria-hidden="true" /></button>
              </div>
            </div>
          );
        })}
        {filtered.length > visibleCount && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVisibleCount(c => c + 50)}>
              {t('loadMore')} ({filtered.length - visibleCount} {t('more')})
            </button>
          </div>
        )}
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
      <form onSubmit={save} aria-busy={saving}>
        {err && <div id="staff-error" role="alert" aria-live="assertive" className="error-banner"><AlertTriangle size={14} aria-hidden="true" />{err}</div>}
        <div className="field"><label htmlFor="staff-name">{t('name')}</label>
          <input id="staff-name" className="input" required maxLength={80} value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
            aria-invalid={!!err} aria-describedby={err ? 'staff-error' : undefined} /></div>
        <div className="field"><label htmlFor="staff-role">{t('role')}</label>
          <input id="staff-role" className="input" required maxLength={60} value={f.role} placeholder={t('rolePlaceholder')}
            onChange={e => setF({ ...f, role: e.target.value })} /></div>
        <div className="field"><label htmlFor="staff-birthday">{t('birthday')}</label>
          <input id="staff-birthday" className="input" type="date" value={f.birthday || ''} onChange={e => setF({ ...f, birthday: e.target.value })} /></div>
        <div className="field"><label htmlFor="staff-phone">{t('staffPhone')}</label>
          <input id="staff-phone" className="input" type="tel" autoComplete="tel" placeholder={t('phonePlaceholder')} value={f.phone || ''} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
        <div className="field"><label>{t('avatarColor')}</label>
          <div className="color-swatches">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                className={`swatch ${f.color === c ? 'active' : ''}`}
                style={{ background: c }}
                aria-label={COLOR_NAMES[c] || `Color ${c}`}
                aria-pressed={f.color === c}
                onClick={() => setF({ ...f, color: c })}
              />
            ))}
          </div>
        </div>
        <fieldset className="field" style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
          <legend style={{ fontSize: 12, fontWeight: 600, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{t('workingDays')}</legend>
          <div className="chip-row">
            {DAYS.map(d => (
              <button
                key={d}
                type="button"
                className={`chip ${f.schedule.includes(d) ? 'active' : ''}`}
                aria-pressed={f.schedule.includes(d)}
                onClick={() => toggleDay(d)}
              >
                {t('days')[d]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="field" style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
          <legend style={{ fontSize: 12, fontWeight: 600, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{t('permissionsLabel')}</legend>
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
        </fieldset>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Services Catalog ----------
function ServicesTab({ services, onReload, toast }) {
  const { t, lang } = useT();
  const { labels } = useBiz();
  const [modal, setModal] = useState(null);

  const grouped = useMemo(() => {
    const groups = {};
    for (const s of services) {
      const c = s.category || 'General';
      if (!groups[c]) groups[c] = [];
      groups[c].push(s);
    }
    return groups;
  }, [services]);

  const delService = async (id) => {
    if (!(await appConfirm({ title: t('removeServiceConfirm').replace('{item}', labels.service.toLowerCase()), confirmLabel: t('remove'), cancelLabel: t('cancel'), danger: true }))) return;
    try {
      await api(`/api/services/${id}`, { method: 'DELETE' });
      toast(t('removedToast').replace('{item}', labels.service));
      onReload();
    } catch (e) { toast(e.message || t('failed')); }
  };

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h2>{t('catalogOf').replace('{item}', labels.service)}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({})}>
            <Plus size={14} aria-hidden="true" /> {t('add')}
          </button>
        </div>
        {services.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t('emptyServicesTitle').replace('{plural}', labels.servicePlural.toLowerCase())}
            body={t('emptyServicesBody').replace(/\{plural\}/g, labels.servicePlural.toLowerCase()).replace('{bookings}', labels.bookingPlural.toLowerCase())}
            ctaLabel={`${t('add')} ${labels.service.toLowerCase()}`}
            onCta={() => setModal({})}
          />
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
                {cat}
              </div>
              {items.map(s => (
                <div key={s.id} className="row" style={{ marginBottom: 6 }}>
                  <div style={{ width: 10, height: 30, borderRadius: 3, background: s.color || '#2d5a4a' }} />
                  <div className="grow">
                    <div className="title" style={{ fontSize: 14 }}>{s.name}</div>
                    <div className="meta" style={{ fontSize: 11 }}>
                      {fmtDuration(s.durationMin, lang)} · {fmtMoney(s.price, lang)}
                    </div>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => setModal(s)} aria-label={`${t('edit')} ${s.name}`}>
                    <Edit2 size={14} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => delService(s.id)} aria-label={`${t('delete')} ${s.name}`}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      {modal && (
        <ServiceModal
          service={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onReload(); toast(t('savedCheck')); }}
        />
      )}
    </div>
  );
}

function ServiceModal({ service, onClose, onSaved }) {
  const { t } = useT();
  const { labels } = useBiz();
  const [f, setF] = useState(service ? {
    ...service,
    durationMin: String(service.durationMin ?? ''),
    price: String(service.price ?? ''),
  } : {
    name: '', category: 'General', durationMin: '60', price: '', color: '#2d5a4a',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const payload = {
        name: f.name,
        category: f.category,
        durationMin: f.durationMin === '' ? 0 : Number(f.durationMin),
        price: f.price === '' ? 0 : Number(f.price),
        color: f.color,
      };
      if (service) await api(`/api/services/${service.id}`, { method: 'PUT', body: payload });
      else         await api('/api/services', { method: 'POST', body: payload });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={service ? `${t('edit')} ${labels.service.toLowerCase()}` : `${t('add')} ${labels.service.toLowerCase()}`} onClose={onClose}>
      <form onSubmit={save} aria-busy={saving}>
        {err && <div id="svc-error" role="alert" aria-live="assertive" className="error-banner"><AlertTriangle size={14} aria-hidden="true" />{err}</div>}
        <div className="field"><label htmlFor="svc-name">{t('name')}</label>
          <input id="svc-name" className="input" required maxLength={120} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} aria-invalid={!!err} aria-describedby={err ? 'svc-error' : undefined} /></div>
        <div className="field"><label htmlFor="svc-category">{t('category')}</label>
          <input id="svc-category" className="input" maxLength={60} placeholder={t('categoryPh')} value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="svc-duration">{t('durationMin')}</label>
            <input id="svc-duration" className="input" type="number" min="0" max="1440" inputMode="numeric" value={f.durationMin} onChange={e => setF({ ...f, durationMin: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label htmlFor="svc-price">{t('price')}</label>
            <input id="svc-price" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} /></div>
        </div>
        <div className="field"><label>{t('colorLabel')}</label>
          <div className="color-swatches">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                className={`swatch ${f.color === c ? 'active' : ''}`}
                aria-label={COLOR_NAMES[c] || `Color ${c}`}
                aria-pressed={f.color === c}
                onClick={() => setF({ ...f, color: c })}
                style={{ background: c }}
              />
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
  const { t, lang } = useT();
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | low | out
  const [sortBy, setSortBy] = useState('name'); // name | stock-asc | stock-desc | value
  const [visibleCount, setVisibleCount] = useState(50);

  const categories = useMemo(() => {
    const set = new Set(inventory.map(i => i.category).filter(Boolean));
    return Array.from(set).sort();
  }, [inventory]);

  // Summary stats — total items, total inventory value, low + out counts.
  const summary = useMemo(() => {
    let totalValue = 0, lowCount = 0, outCount = 0;
    for (const i of inventory) {
      const stock = Number(i.stock) || 0;
      const cost = Number(i.cost) || 0;
      totalValue += stock * cost;
      if (stock <= 0) outCount += 1;
      else if (stock <= (Number(i.threshold) || 0)) lowCount += 1;
    }
    return { totalItems: inventory.length, totalValue, lowCount, outCount };
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = inventory.filter(i => {
      if (cat && i.category !== cat) return false;
      const stock = Number(i.stock) || 0;
      const thr = Number(i.threshold) || 0;
      if (statusFilter === 'low' && stock > thr) return false;
      if (statusFilter === 'out' && stock > 0) return false;
      if (!q) return true;
      return (i.name || '').toLowerCase().includes(q) || (i.supplier || '').toLowerCase().includes(q);
    });
    if (sortBy === 'name') out = [...out].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortBy === 'stock-asc') out = [...out].sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
    else if (sortBy === 'stock-desc') out = [...out].sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    else if (sortBy === 'value') out = [...out].sort((a, b) => ((Number(b.stock) || 0) * (Number(b.cost) || 0)) - ((Number(a.stock) || 0) * (Number(a.cost) || 0)));
    return out;
  }, [inventory, query, cat, statusFilter, sortBy]);
  useEffect(() => { setVisibleCount(50); }, [query, cat, statusFilter, sortBy]);

  const exportCsv = () => {
    const rows = filtered.map(i => ({
      id: i.id, name: i.name, category: i.category, stock: i.stock,
      threshold: i.threshold, unit: i.unit, supplier: i.supplier,
      cost: i.cost || 0, value: (Number(i.stock) || 0) * (Number(i.cost) || 0),
      lastOrder: i.lastOrder || '',
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
    if (!(await appConfirm({ title: t('removeItem'), confirmLabel: t('remove'), cancelLabel: t('cancel'), danger: true }))) return;
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
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {summary.totalItems} {t('inventory')}{summary.lowCount > 0 ? `, ${summary.lowCount} ${t('low')}` : ''}{summary.outCount > 0 ? `, ${summary.outCount} ${t('statOut')}` : ''}
      </div>
      {/* Summary card — total items, value, low/out counts. Quick at-a-glance status. */}
      {summary.totalItems > 0 && (
        <div className="day-stats" style={{ marginBottom: 14 }}>
          <div className="day-stat"><span className="v">{summary.totalItems}</span><span className="l">{t('inventory')}</span></div>
          {summary.totalValue > 0 && <div className="day-stat"><span className="v">{fmtMoney(summary.totalValue, lang)}</span><span className="l">{t('inventoryValue')}</span></div>}
          {summary.lowCount > 0 && <div className="day-stat day-stat-warn"><span className="v">{summary.lowCount}</span><span className="l">{t('low')}</span></div>}
          {summary.outCount > 0 && <div className="day-stat day-stat-warn"><span className="v">{summary.outCount}</span><span className="l">{t('statOut')}</span></div>}
        </div>
      )}
      <div className="card">
        <div className="card-head">
          <h2>{t('inventory')}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal('new')}><Plus size={14} aria-hidden="true" /> {t('add')}</button>
        </div>
        <div className="search-wrap">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input className="search-input" type="search" enterKeyHint="search" placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} aria-label={t('search')} />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label={t('clearSearch')}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="toolbar">
          <select className="select" value={cat} onChange={e => setCat(e.target.value)} aria-label={t('filterCategory')}>
            <option value="">{t('allCategories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label={t('filterCategory')}>
            <option value="all">{t('filterAll')}</option>
            <option value="low">{t('filterLowOnly')}</option>
            <option value="out">{t('filterOutOnly')}</option>
          </select>
          <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label={t('sortBy')}>
            <option value="name">{t('sortNameAZ')}</option>
            <option value="stock-asc">{t('sortStockAsc')}</option>
            <option value="stock-desc">{t('sortStockDesc')}</option>
            <option value="value">{t('sortValueDesc')}</option>
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={12} aria-hidden="true" /> {t('exportCsv')}
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
        ) : filtered.slice(0, visibleCount).map((i, idx) => {
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-icon" onClick={() => adjust(i.id, -1)} aria-label={`${t('decrease')} ${i.name}`}>−</button>
                  <button type="button" className="btn-icon" onClick={() => adjust(i.id, +1)} aria-label={`${t('increase')} ${i.name}`}>+</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => markOrdered(i.id)} {...(idx === 0 ? { 'data-tour': 'btn-mark-ordered' } : {})}>{t('ordered')}</button>
                  <button type="button" className="btn-icon" onClick={() => setModal(i)} aria-label={`${t('edit')} ${i.name}`}><Edit2 size={14} aria-hidden="true" /></button>
                  <button type="button" className="btn-icon" onClick={() => del(i.id)} aria-label={`${t('delete')} ${i.name}`}><Trash2 size={14} aria-hidden="true" /></button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length > visibleCount && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVisibleCount(c => c + 50)}>
              {t('loadMore')} ({filtered.length - visibleCount} {t('more')})
            </button>
          </div>
        )}
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
  // Hold numeric fields as strings so user can clear them (empty input becomes '', not 0)
  const [f, setF] = useState(item ? {
    ...item,
    stock: String(item.stock ?? ''),
    threshold: String(item.threshold ?? ''),
    cost: String(item.cost ?? ''),
  } : {
    name: '', category: '', stock: '', threshold: '5', unit: 'pcs', supplier: '', cost: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    try {
      const payload = {
        ...f,
        stock: f.stock === '' ? 0 : Number(f.stock),
        threshold: f.threshold === '' ? 0 : Number(f.threshold),
        cost: f.cost === '' || f.cost == null ? 0 : Number(f.cost),
      };
      if (item) await api(`/api/inventory/${item.id}`, { method: 'PUT', body: payload });
      else       await api('/api/inventory', { method: 'POST', body: payload });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={item ? t('editItem') : t('addItem')} onClose={onClose}>
      <form onSubmit={save} aria-busy={saving}>
        {err && <div id="inv-error" role="alert" aria-live="assertive" className="error-banner"><AlertTriangle size={14} aria-hidden="true" />{err}</div>}
        <div className="field"><label htmlFor="inv-name">{t('name')}</label>
          <input id="inv-name" className="input" required maxLength={120} value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
            aria-invalid={!!err} aria-describedby={err ? 'inv-error' : undefined} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="inv-category">{t('category')}</label>
            <input id="inv-category" className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label htmlFor="inv-unit">{t('unit')}</label>
            <input id="inv-unit" className="input" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="inv-stock">{t('stockLevel')}</label>
            <input id="inv-stock" className="input" type="number" min="0" inputMode="numeric" value={f.stock} onChange={e => setF({ ...f, stock: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="inv-threshold">{t('threshold')} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{t('alertWhenBelow')}</span></label>
            <input id="inv-threshold" className="input" type="number" min="0" inputMode="numeric" value={f.threshold} onChange={e => setF({ ...f, threshold: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}><label htmlFor="inv-supplier">{t('supplier')}</label>
            <input id="inv-supplier" className="input" value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="inv-cost">{t('price')} <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{t('costPerUnit').replace('{unit}', f.unit || t('unitFallback'))}</span></label>
            <input id="inv-cost" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} placeholder="0.00" /></div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}

function SOPTab({ sops, staff, violations, onReload, onReloadSops, toast }) {
  const { t, lang } = useT();
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  // O(1) lookups — used per row in the violations + repeat-offenders lists.
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);
  const sopById = useMemo(() => new Map(sops.map(s => [s.id, s])), [sops]);
  const [modal, setModal] = useState(false);     // 'violation' | 'sop' | null
  const counts = staff.map(s => ({
    ...s, count: violations.filter(v => v.staffId === s.id).length,
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  const delViolation = async (id) => {
    if (!(await appConfirm({ title: t('removeViolation'), confirmLabel: t('remove'), cancelLabel: t('cancel'), danger: true }))) return;
    try {
      await api(`/api/violations/${id}`, { method: 'DELETE' });
      toast(t('noteRemoved')); onReload();
    } catch (e) { toast(e.message || t('couldNotRemoveNote')); }
  };

  const delSop = async (id) => {
    if (!(await appConfirm({ title: t('removeSopRule'), confirmLabel: t('remove'), cancelLabel: t('cancel'), danger: true }))) return;
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
          <h2>{t('sopTitle')}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal('sop')}>
            <Plus size={14} aria-hidden="true" /> {t('addSopRule')}
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
            <ShieldCheck size={20} color="var(--gold)" aria-hidden="true" />
            <div className="grow">
              <div className="title">{s.title}</div>
              {(s.category || s.description) && (
                <div className="meta">{[s.category, s.description].filter(Boolean).join(' · ')}</div>
              )}
            </div>
            <button type="button" className="btn-icon" onClick={() => delSop(s.id)} aria-label={`${t('delete')} ${s.title}`}>
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* Log violation */}
      <div className="card">
        <div className="card-head">
          <h2>{t('logSopViolation')}</h2>
          <button type="button" className="btn btn-gold btn-sm" onClick={() => setModal('violation')} data-tour="action-sop">
            <Plus size={14} aria-hidden="true" /> {t('log')}
          </button>
        </div>
        {violations.length === 0 ? (
          <div className="center-muted">{t('noViolations')}</div>
        ) : violations.slice().reverse().map(v => {
          const s = staffById.get(v.staffId);
          const sop = sopById.get(v.sopId);
          return (
            <div key={v.id} className="row">
              {s && <Avatar initial={s.avatar} color={s.color} size={32} />}
              <div className="grow">
                <div className="title">{s ? s.name : '—'}</div>
                <div className="meta">{sop ? sop.title : (v.note || '—')}{v.note && sop ? ` · ${v.note}` : ''}</div>
                <div className="meta" style={{ fontSize: 11 }}>{new Date(v.createdAt).toLocaleString(locale)}</div>
              </div>
              <button type="button" className="btn-icon" onClick={() => delViolation(v.id)} aria-label={`${t('delete')} ${s ? s.name : ''}`}><Trash2 size={14} aria-hidden="true" /></button>
            </div>
          );
        })}
      </div>

      {counts.length > 0 && (
        <div className="card">
          <h2>{t('repeatOffenders')}</h2>
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
    if (!f.title.trim()) { setErr(t('ruleTitleRequired')); return; }
    setSaving(true); setErr(null);
    try {
      await api('/api/sop', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={t('addSopRule')} onClose={onClose}>
      <form onSubmit={save} aria-busy={saving}>
        {err && <div id="sop-error" role="alert" aria-live="assertive" className="error-banner"><AlertTriangle size={14} aria-hidden="true" /> {err}</div>}
        <div className="field">
          <label htmlFor="sop-title">{t('sopRuleTitle')}</label>
          <input id="sop-title" className="input" maxLength={120} value={f.title} onChange={e => setF({ ...f, title: e.target.value })}
            aria-invalid={!!err}
            aria-describedby={err ? 'sop-error' : undefined}
            placeholder={t('ruleTitlePh')} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="sop-category">{t('category')}</label>
          <input id="sop-category" className="input" maxLength={60} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}
            placeholder={t('rulePunctualityPh')} />
        </div>
        <div className="field">
          <label htmlFor="sop-body">{t('sopRuleDesc')}</label>
          <textarea id="sop-body" className="textarea" maxLength={2000} value={f.body} onChange={e => setF({ ...f, body: e.target.value })}
            placeholder={t('extraDetailPlaceholder')} rows={3} />
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
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
      </div>
    </Modal>
  );

  // Audit fix: no team members yet — silent empty-submit was possible.
  if (!staff.length) return (
    <Modal title={t('logSopViolation')} onClose={onClose}>
      <div style={{ padding: '12px 0', color: 'var(--muted)', lineHeight: 1.6 }}>
        {t('noTeamYetShort')}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
      </div>
    </Modal>
  );

  return (
    <Modal title={t('logSopViolation')} onClose={onClose}>
      <form onSubmit={save} aria-busy={saving}>
        {err && <div id="vio-error" role="alert" aria-live="assertive" className="error-banner"><AlertTriangle size={14} aria-hidden="true" />{err}</div>}
        <div className="field"><label htmlFor="vio-staff">{t('staffPerson')}</label>
          <select id="vio-staff" className="select" value={f.staffId} onChange={e => setF({ ...f, staffId: Number(e.target.value) })}
            aria-invalid={!!err} aria-describedby={err ? 'vio-error' : undefined}>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div className="field"><label htmlFor="vio-sop">{t('sopRule')}</label>
          <select id="vio-sop" className="select" value={f.sopId} onChange={e => setF({ ...f, sopId: Number(e.target.value) })}>
            {sops.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select></div>
        <div className="field"><label htmlFor="vio-note">{t('noteText')}</label>
          <textarea id="vio-note" className="textarea" maxLength={2000} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></div>
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
  const { labels } = useBiz();
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);
  const inventoryById = useMemo(() => new Map(inventory.map(i => [i.id, i])), [inventory]);
  const lowStock = useMemo(() => inventory.filter(i => i.stock <= i.threshold), [inventory]);
  const pending  = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const [reassign, setReassign] = useState(null);
  const reassignableStaff = useMemo(
    () => reassign ? staff.filter(s => s.id !== reassign.staffId) : [],
    [reassign, staff]
  );

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
        <h2>{t('stockAlerts')} ({lowStock.length})</h2>
        {lowStock.length === 0
          ? <div className="success-banner"><CheckCircle size={14} aria-hidden="true" /> {t('allStockHealthy')}</div>
          : lowStock.map(i => (
            <div key={i.id} className="row">
              <Package size={18} color="var(--warn)" aria-hidden="true" />
              <div className="grow">
                <div className="title">{i.name}</div>
                <div className="meta">{i.stock} {i.unit} {t('leftLabel')} {i.threshold}</div>
              </div>
              <Badge label={t('reorder')} type="warn" />
            </div>
          ))}
      </div>

      <div className="card">
        <h2>{t('staffRequests')} ({pending.length})</h2>
        {pending.length === 0
          ? <div className="success-banner"><CheckCircle size={14} aria-hidden="true" /> {t('noPendingReq')}</div>
          : pending.map(req => {
            const s = staffById.get(req.staffId);
            const affected = req.type === 'sick'
              ? bookings.filter(b => b.staffId === req.staffId && b.date === req.date)
              : [];
            return (
              <div key={req.id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {s && <Avatar initial={s.avatar} color={s.color} size={32} />}
                  <div className="grow">
                    <div className="title">{formatType(req.type)} · {s ? s.name : `${labels.staffMember} #${req.staffId}`}</div>
                    <div className="meta">
                      {req.type === 'stock_request'
                        ? `${inventoryById.get(req.productId)?.name || t('product')} · ${t('qtyLabel')} ${req.quantity}${req.reason ? ` · ${req.reason}` : ''}`
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
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setReassign(req)}>{t('approveReassign')}</button>
                  ) : (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => decide(req, 'approved')}>{t('approve')}</button>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => decide(req, 'declined')}>{t('decline')}</button>
                </div>
              </div>
            );
          })}
      </div>

      {reassign && (
        <ReassignModal
          request={reassign}
          staff={reassignableStaff}
          onClose={() => setReassign(null)}
          onSubmit={(toId) => decide(reassign, 'approved', toId)}
        />
      )}
    </div>
  );
}

function ReassignModal({ request, staff, onClose, onSubmit }) {
  const { t } = useT();
  const hasStaff = staff.length > 0;
  const [to, setTo] = useState(staff[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    setSaving(true);
    try { await onSubmit(to); } finally { setSaving(false); }
  };
  return (
    <Modal title={t('reassignBookings')} onClose={onClose}>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        {t('assignBookingsTo')} <strong>{request.date}</strong> {t('to')}
      </p>
      {!hasStaff ? (
        <div role="alert" aria-live="assertive" className="error-banner" style={{ marginTop: 8 }}>
          <AlertTriangle size={14} aria-hidden="true" /> {t('noOtherStaffAvailable')}
        </div>
      ) : (
        <div className="field">
          <select className="select" value={to || ''} onChange={e => setTo(Number(e.target.value))} aria-label={t('reassignBookings')}>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
          </select>
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={handle} disabled={!hasStaff || !to || saving}>
          {saving ? t('saving') : t('approveReassign')}
        </button>
      </div>
    </Modal>
  );
}

function AnnouncementsTab({ announcements, onReload, toast, user }) {
  const { t, lang } = useT();
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const [modal, setModal] = useState(false);
  const del = async (id) => {
    if (!(await appConfirm({ title: t('deleteAnnouncement'), confirmLabel: t('delete'), cancelLabel: t('cancel'), danger: true }))) return;
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
          <h2>{t('announcements')}</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Megaphone size={14} aria-hidden="true" /> {t('send')}</button>
        </div>
        {announcements.length === 0
          ? <EmptyState
              icon={Megaphone}
              title={t('nothingSent')}
              body={`${t('newAnnouncement')}…`}
              ctaLabel={t('newAnnouncement')}
              onCta={() => setModal(true)}
            />
          : announcements.map(a => (
            <div key={a.id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="grow">
                  <div className="title" style={{ fontFamily: 'Fraunces, serif', fontSize: 16 }}>{a.title}</div>
                  <div className="meta">{new Date(a.createdAt).toLocaleString(locale)} · {a.from}</div>
                </div>
                <button type="button" className="btn-icon" onClick={() => del(a.id)} aria-label={`${t('delete')} ${a.title}`}><Trash2 size={14} aria-hidden="true" /></button>
              </div>
              <div style={{ marginTop: 6, fontSize: 14 }}>{a.body}</div>
            </div>
          ))}
      </div>
      {modal && (
        <AnnouncementModal
          defaultFrom={user?.name || t('managementSig')}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); onReload(); toast(t('announcementSent')); }}
        />
      )}
    </div>
  );
}

function AnnouncementModal({ defaultFrom, onClose, onSaved }) {
  const { t } = useT();
  const [f, setF] = useState({ title: '', body: '', from: defaultFrom || t('managementSig') });
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
      <form onSubmit={save} aria-busy={saving}>
        {err && <div id="ann-error" role="alert" aria-live="assertive" className="error-banner"><AlertTriangle size={14} aria-hidden="true" />{err}</div>}
        <div className="field"><label htmlFor="ann-title">{t('title')}</label>
          <input id="ann-title" className="input" required maxLength={120} value={f.title} onChange={e => setF({ ...f, title: e.target.value })}
            aria-invalid={!!err} aria-describedby={err ? 'ann-error' : undefined} /></div>
        <div className="field"><label htmlFor="ann-body">{t('message')}</label>
          <textarea id="ann-body" className="textarea" required maxLength={4000} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} /></div>
        <div className="field"><label htmlFor="ann-from">{t('from')}</label>
          <input id="ann-from" className="input" maxLength={80} value={f.from} onChange={e => setF({ ...f, from: e.target.value })} /></div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Send size={14} aria-hidden="true" /> {saving ? t('sending') : t('send')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ================= STAFF VIEWS =================

function StaffTodayView({ staff, bookings, staffId, sops, onSubmitRequest, toast, perms }) {
  const { t, lang } = useT();
  const me = staff.find(s => s.id === staffId);
  // C2 fix: filter to today's bookings only. Was showing all bookings as "today's sessions".
  const todayStr = new Date().toISOString().slice(0, 10);
  const myBookings = bookings.filter(b => b.staffId === staffId && (b.date || todayStr) === todayStr);
  // M28 fix: respect canViewSchedule permission — staff without it shouldn't see booking list
  const canSeeSchedule = perms ? perms.canViewSchedule !== false : true;
  // Re-pick daily SOP whenever sops list size changes (first load arrives async).
  // Stable per day per session: same staff sees the same one on refreshes.
  const sop = useMemo(() => {
    if (!sops || sops.length === 0) return null;
    const day = new Date().toISOString().slice(0, 10);
    // FNV-1a-ish hash so similar staffId+date combos don't collide to same rule.
    let h = 2166136261;
    const key = `${staffId || 0}|${day}`;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return sops[h % sops.length];
  }, [sops, staffId]);
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
            <PhoneCall size={14} aria-hidden="true" /> {t('callOutSick')}
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
          <div className="card-head"><h2><ShieldCheck size={16} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('todaySopReminder')}</h2></div>
          <div className="title">{sop.title}</div>
          <div className="meta" style={{ marginTop: 4 }}>{sop.description}</div>
        </div>
      )}

      {canSeeSchedule && (
      <div className="card">
        <h2>{t('yourSessions')}</h2>
        {myBookings.length === 0
          ? <div className="center-muted">{t('noSessions')}</div>
          : myBookings.map(b => (
            <div key={b.id} className="sched-block">
              <div className="time">{b.time}</div>
              <div className="grow">
                <div className="title">{b.client}</div>
                <div className="meta">{b.treatment}{b.duration ? ` · ${fmtDuration(b.duration, lang)}` : ''}</div>
                {b.allergies && (
                  <div className="note-chip" style={{ background: '#fbecec', color: 'var(--danger)' }}>
                    <AlertTriangle size={12} aria-hidden="true" style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {t('allergies')}: {b.allergies}
                  </div>
                )}
                {b.notes && <div className="note-chip">{t('noteLabel')} {b.notes}</div>}
              </div>
            </div>
          ))}
      </div>
      )}
    </div>
  );
}

function StaffScheduleView({ staff, bookings, staffId }) {
  const { t, lang } = useT();
  // C3 fix: filter to today's bookings only; "Today's Sessions" was showing all.
  const todayStr = new Date().toISOString().slice(0, 10);
  const mine = bookings.filter(b => b.staffId === staffId && (b.date || todayStr) === todayStr);
  const me = staff.find(s => s.id === staffId);
  const others = staff.filter(s => s.id !== staffId);
  const workDays = me?.schedule || [];
  const dayDict = TRANSLATIONS[lang]?.days || TRANSLATIONS.en.days;

  return (
    <div>
      <div className="card">
        <h2>{t('myWeek')}</h2>
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
        <h2>{t('todaysSessions')}</h2>
        {mine.length === 0 ? <div className="center-muted">{t('noSessionsToday')}</div> : mine.map(b => (
          <div key={b.id} className="sched-block">
            <div className="time">{b.time}</div>
            <div className="grow">
              <div className="title">{b.client}</div>
              <div className="meta">{b.treatment} · {fmtDuration(b.duration, lang)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>{t('theTeam')}</h2>
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
  const { t, lang } = useT();
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
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
          <div className="card-head"><h2>{t('quickActions')}</h2></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {perms.canRequestTimeOff && <button type="button" className="btn btn-ghost" style={{ flex: '1 1 auto' }} onClick={() => setMode('sick')}><PhoneCall size={14} aria-hidden="true" /> {t('sick')}</button>}
            {perms.canRequestTimeOff && <button type="button" className="btn btn-ghost" style={{ flex: '1 1 auto' }} onClick={() => setMode('dayoff')}><CalendarOff size={14} aria-hidden="true" /> {t('dayOffShort')}</button>}
            {perms.canSwapShifts && <button type="button" className="btn btn-ghost" style={{ flex: '1 1 auto' }} onClick={() => setMode('swap')}><Repeat size={14} aria-hidden="true" /> {t('swap')}</button>}
            {perms.canRequestStock && <button type="button" className="btn btn-ghost" style={{ flex: '1 1 auto' }} onClick={() => setMode('stock_request')}><Package size={14} aria-hidden="true" /> {t('requestStock')}</button>}
          </div>
        </div>
      )}

      {perms.canRequestStock && lowStock.length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--warn)' }}>
          <div className="card-head">
            <h2><Package size={16} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--warn)' }} />{t('stockAlerts')} ({lowStock.length})</h2>
          </div>
          {lowStock.map(i => (
            <div key={i.id} className="row">
              <Package size={18} color="var(--warn)" aria-hidden="true" />
              <div className="grow">
                <div className="title">{i.name}</div>
                <div className="meta">{i.stock} {i.unit} {t('leftLabel')} {i.threshold}</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStockItem(i)}>{t('requestStock')}</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>{t('announcements')}</h2>
        {announcements.length === 0 ? <div className="center-muted">{t('noAnnouncements')}</div> : announcements.map(a => (
          <div key={a.id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="title" style={{ fontFamily: 'Fraunces, serif', fontSize: 16 }}>{a.title}</div>
            <div className="meta">{new Date(a.createdAt).toLocaleString(locale)} · {a.from}</div>
            <div style={{ marginTop: 4, fontSize: 14 }}>{a.body}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>{t('myRequests')}</h2>
        {mine.length === 0 ? <div className="center-muted">{t('noRequestsSubmitted')}</div> : mine.map(r => (
          <div key={r.id} className="row">
            <div className="grow">
              <div className="title">{r.type === 'sick' ? t('sickCall') : r.type === 'dayoff' ? t('dayOff') : r.type === 'stock_request' ? t('stockRequest') : t('shiftSwap')}</div>
              <div className="meta">
                {r.type === 'stock_request'
                  ? `${(inventory || []).find(i => i.id === r.productId)?.name || t('product')} · ${t('qtyLabel')} ${r.quantity}`
                  : `${r.date || '—'} · ${r.reason || '—'}`}
              </div>
            </div>
            <Badge label={t(`status${r.status.charAt(0).toUpperCase() + r.status.slice(1)}`) || r.status} type={r.status === 'approved' ? 'success' : r.status === 'declined' ? 'danger' : 'pending'} />
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
  const [saving, setSaving] = useState(false);
  const titleMap = { sick: t('callInSick'), dayoff: t('requestDayOff'), swap: t('requestSwap') };
  const others = staff.filter(s => s.id !== staffId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type === 'sick' && !f.reason.trim()) {
      setErr(t('sickReasonRequired'));
      return;
    }
    setErr(null);
    setSaving(true);
    try { await onSubmit(f); } finally { setSaving(false); }
  };

  return (
    <Modal title={titleMap[type]} onClose={onClose}>
      <form onSubmit={handleSubmit} aria-busy={saving}>
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
        {err && <div role="alert" aria-live="assertive" className="error-banner"><AlertTriangle size={14} aria-hidden="true" /> {err}</div>}
        <div className="field"><label htmlFor="req-date">{t('date')}</label>
          <input id="req-date" className="input" type="date" required min={new Date().toISOString().slice(0,10)} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
        {type === 'swap' && (
          <>
            <div className="field"><label htmlFor="req-swap-with">{t('swapWith')}</label>
              <select id="req-swap-with" className="select" value={f.swapWith} onChange={e => setF({ ...f, swapWith: e.target.value })}>
                <option value="">{t('selectColleague')}</option>
                {others.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div className="field"><label htmlFor="req-swap-day">{t('theirDay')}</label>
              <input id="req-swap-day" className="input" type="date" min={new Date().toISOString().slice(0,10)} value={f.swapDay} onChange={e => setF({ ...f, swapDay: e.target.value })} /></div>
          </>
        )}
        <div className="field">
          <label htmlFor="req-reason">{type === 'sick' ? t('reason') : t('noteOptional')}</label>
          <textarea
            id="req-reason"
            className="textarea"
            maxLength={1000}
            value={f.reason}
            onChange={e => { setErr(null); setF({ ...f, reason: e.target.value }); }}
            placeholder={type === 'sick' ? t('sickReasonPh') : ''}
            rows={type === 'sick' ? 3 : 2}
          />
          {type === 'sick' && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t('required')}</div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}><Send size={14} aria-hidden="true" /> {saving ? t('saving') : t('submit')}</button>
        </div>
      </form>
    </Modal>
  );
}

function StockRequestModal({ staffId, inventory, initialProductId, onClose, onSubmit }) {
  const { t } = useT();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    type: 'stock_request',
    staffId,
    productId: initialProductId || inventory[0]?.id || '',
    quantity: 1,
    reason: '',
  });

  return (
    <Modal title={t('requestStock')} onClose={onClose}>
      <form onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await onSubmit({ ...f, productId: Number(f.productId) }); } finally { setSaving(false); }
      }} aria-busy={saving}>
        <div className="field">
          <label htmlFor="sreq-product">{t('product')}</label>
          <select id="sreq-product" className="select" value={f.productId} onChange={e => setF({ ...f, productId: e.target.value })}>
            {inventory.length === 0
              ? <option value="">{t('emptyInventoryTitle')}</option>
              : inventory.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.stock} {i.unit} {t('stockLeftLabel')})
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sreq-qty">{t('quantityLabel')}</label>
          <input id="sreq-qty" className="input" type="number" min="1" max="10000" inputMode="numeric" required value={f.quantity}
            onChange={e => setF({ ...f, quantity: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="sreq-reason">{t('noteOptional')}</label>
          <textarea id="sreq-reason" className="textarea" maxLength={500} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving || inventory.length === 0}>
            <Send size={14} aria-hidden="true" /> {saving ? t('saving') : t('submit')}
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
  // Fix: was sessionsThisWeek but counted ALL bookings; rename + filter to today's.
  const todayStr = new Date().toISOString().slice(0, 10);
  const sessionsToday = bookings.filter(b => b.staffId === staffId && (b.date || todayStr) === todayStr).length;
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

      <div className="stats" role="group">
        <div className="stat" aria-label={`${sessionsToday} ${t('sessionsTodayStat')}`}>
          <div className="v" aria-hidden="true">{sessionsToday}</div>
          <div className="l" aria-hidden="true">{t('sessionsTodayStat')}</div>
        </div>
        <div className="stat" aria-label={`${me.schedule?.length || 0} ${t('daysWeek')}`}>
          <div className="v" aria-hidden="true">{me.schedule?.length || 0}</div>
          <div className="l" aria-hidden="true">{t('daysWeek')}</div>
        </div>
        <div className="stat" aria-label={`${myV.length} ${t('sopNotes')}`}>
          <div className="v" aria-hidden="true">{myV.length}</div>
          <div className="l" aria-hidden="true">{t('sopNotes')}</div>
        </div>
      </div>

      <div className="card">
        <h2>{t('mySopNotes')}</h2>
        {myV.length === 0
          ? <div className="success-banner"><CheckCircle size={14} aria-hidden="true" /> {t('cleanRecord')}</div>
          : myV.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(v => {
            const sop = sops.find(s => s.id === v.sopId);
            return (
              <div key={v.id} className="row">
                <AlertTriangle size={16} color="var(--warn)" aria-hidden="true" />
                <div className="grow">
                  <div className="title">{sop ? sop.title : '—'}</div>
                  <div className="meta">{v.note || '—'} · {new Date(v.createdAt).toLocaleDateString(locale)}</div>
                </div>
              </div>
            );
          })}
      </div>

      {onLogout && (
        <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={onLogout}>
          <LogOut size={14} aria-hidden="true" /> {t('signOut')}
        </button>
      )}
    </div>
  );
}

// ================= OWNER VIEW =================
function OwnerView({ staff, bookings, inventory, requests, violations, announcements }) {
  const { t, lang } = useT();
  const { labels } = useBiz();

  // Scope: this week = last 7 days inclusive of today.
  const [range, setRange] = useState('week'); // 'week' | 'month' | 'all'
  const cutoff = useMemo(() => {
    if (range === 'all') return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (range === 'week' ? 6 : 29));
    return d.toISOString().slice(0, 10);
  }, [range]);
  const scoped = useMemo(() => {
    if (!cutoff) return bookings;
    return bookings.filter(b => (b.date || '') >= cutoff);
  }, [bookings, cutoff]);

  const lowStock = useMemo(() => inventory.filter(i => i.stock <= i.threshold), [inventory]);
  const totalRevenue = useMemo(() => scoped.reduce((sum, b) => sum + (Number(b.price) || 0), 0), [scoped]);
  const oldestDate = bookings.length > 0 ? bookings[bookings.length - 1]?.date : null;
  const periodDays = range === 'week' ? 7 : range === 'month' ? 30
    : Math.max(1, Math.ceil((Date.now() - new Date(oldestDate || Date.now()).getTime()) / (24 * 60 * 60 * 1000)));
  const avgPerDay = Math.round(totalRevenue / periodDays);
  const money = (n) => fmtMoney(n, lang);

  // Inventory total cost (if cost set)
  const inventoryValue = useMemo(
    () => inventory.reduce((sum, i) => sum + ((Number(i.cost) || 0) * (Number(i.stock) || 0)), 0),
    [inventory]
  );

  // Per-staff totals + commission (scoped). Bucket bookings by staffId in one pass
  // instead of running scoped.filter() per staff (O(n*m) → O(n + m)).
  const perStaff = useMemo(() => {
    const buckets = new Map();
    for (const b of scoped) {
      if (!b.staffId) continue;
      const cur = buckets.get(b.staffId) || { sessions: 0, revenue: 0 };
      cur.sessions += 1;
      cur.revenue += Number(b.price) || 0;
      buckets.set(b.staffId, cur);
    }
    return staff.map(s => {
      const c = buckets.get(s.id) || { sessions: 0, revenue: 0 };
      const rate = Number(s.commissionRate ?? 30) / 100;
      return { ...s, sessions: c.sessions, revenue: c.revenue, commission: Math.round(c.revenue * rate) };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [staff, scoped]);
  const top = perStaff[0];

  // Top services (by booking count)
  const serviceTallies = useMemo(() => {
    const m = new Map();
    for (const b of scoped) {
      const k = (b.treatment || '').trim();
      if (!k) continue;
      const cur = m.get(k) || { name: k, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(b.price) || 0;
      m.set(k, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [scoped]);

  // Peak hour analysis (by hour of bookings)
  const peakHour = useMemo(() => {
    const buckets = new Array(24).fill(0);
    for (const b of scoped) {
      const h = parseInt(String(b.time || '').split(':')[0], 10);
      if (h >= 0 && h < 24) buckets[h] += 1;
    }
    let bestH = -1, bestC = 0;
    buckets.forEach((c, h) => { if (c > bestC) { bestC = c; bestH = h; } });
    return bestH < 0 ? null : { hour: bestH, count: bestC };
  }, [scoped]);

  const rangeLabel = range === 'week' ? t('thisWeek') : range === 'month' ? t('thisMonth') : t('allTime');

  return (
    <div>
      <div className="stats" role="group" aria-label={t('snapshot')}>
        <div className="stat" aria-label={`${scoped.length} ${labels.bookingPlural}`}>
          <div className="v" aria-hidden="true">{scoped.length}</div>
          <div className="l" aria-hidden="true">{labels.bookingPlural}</div>
        </div>
        <div className="stat" aria-label={`${staff.length} ${labels.staffPlural}`}>
          <div className="v" aria-hidden="true">{staff.length}</div>
          <div className="l" aria-hidden="true">{labels.staffPlural}</div>
        </div>
        <div className="stat" aria-label={`${violations.length} ${t('sopNotesStat')}`}>
          <div className="v" aria-hidden="true">{violations.length}</div>
          <div className="l" aria-hidden="true">{t('sopNotesStat')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{rangeLabel}</h2>
          <div role="group" aria-label={t('sortBy')} style={{ display: 'flex', gap: 4 }}>
            <button type="button" aria-pressed={range === 'week'} className={`btn btn-sm ${range === 'week' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRange('week')}>{t('range7d')}</button>
            <button type="button" aria-pressed={range === 'month'} className={`btn btn-sm ${range === 'month' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRange('month')}>{t('range30d')}</button>
            <button type="button" aria-pressed={range === 'all'} className={`btn btn-sm ${range === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRange('all')}>{t('rangeAll')}</button>
          </div>
        </div>
        <div className="row"><Calendar size={16} color="var(--gold)" aria-hidden="true" /><div className="grow"><div className="title">{t('revenue')}</div><div className="meta">{money(totalRevenue)}</div></div></div>
        <div className="row"><Calendar size={16} color="var(--gold)" aria-hidden="true" /><div className="grow"><div className="title">{t('avgPerDay')}</div><div className="meta">{money(avgPerDay)}</div></div></div>
        <div className="row"><CheckCircle size={16} color="var(--gold)" aria-hidden="true" /><div className="grow"><div className="title">{t('completed')}</div><div className="meta">{scoped.length} {labels.bookingPlural.toLowerCase()}</div></div></div>
        {peakHour && (
          <div className="row"><Calendar size={16} color="var(--gold)" aria-hidden="true" /><div className="grow"><div className="title">{t('peakHourLabel')}</div><div className="meta">{String(peakHour.hour).padStart(2,'0')}:00 · {peakHour.count} {labels.bookingPlural.toLowerCase()}</div></div></div>
        )}
        {top && top.revenue > 0 && (
          <div className="row">
            <Avatar initial={top.avatar} color={top.color} size={32} />
            <div className="grow"><div className="title">{t('topTherapist')}</div><div className="meta">{top.name} · {money(top.revenue)}</div></div>
          </div>
        )}
      </div>

      {serviceTallies.length > 0 && (
        <div className="card">
          <h2>{t('topServicesTitle')}</h2>
          {serviceTallies.map((s, idx) => {
            const max = serviceTallies[0].count;
            const pct = Math.round((s.count / max) * 100);
            return (
              <div key={s.name} className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <strong style={{ color: 'var(--ink)' }}>{idx + 1}. {s.name}</strong>
                  <span className="meta">{s.count} · {money(s.revenue)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h2>{t('snapshot')}</h2>
        <div className="row"><Package size={16} color="var(--gold)" aria-hidden="true" /><div className="grow"><div className="title">{t('lowStockItems')}</div><div className="meta">{lowStock.length} {t('flagged')}</div></div></div>
        {inventoryValue > 0 && (
          <div className="row"><Package size={16} color="var(--gold)" aria-hidden="true" /><div className="grow"><div className="title">{t('inventoryValue')}</div><div className="meta">{money(inventoryValue)}</div></div></div>
        )}
        <div className="row"><Bell size={16} color="var(--gold)" aria-hidden="true" /><div className="grow"><div className="title">{t('pendingRequestsSnap')}</div><div className="meta">{requests.filter(r => r.status === 'pending').length}</div></div></div>
        <div className="row"><Megaphone size={16} color="var(--gold)" aria-hidden="true" /><div className="grow"><div className="title">{t('announcementsSent')}</div><div className="meta">{announcements.length}</div></div></div>
      </div>

      <div className="card">
        <h2>{t('team')} · {t('commission')}</h2>
        {perStaff.length === 0 ? (
          <div className="center-muted">{t('noTeamYetShort')}</div>
        ) : perStaff.map(s => (
          <div key={s.id} className="row">
            <Avatar initial={s.avatar} color={s.color} size={32} />
            <div className="grow">
              <div className="title">{s.name}</div>
              <div className="meta">{s.sessions} {labels.bookingPlural.toLowerCase()} · {money(s.revenue)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--emerald)' }}>{money(s.commission)}</div>
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
  { id: 'services',      labelKey: 'services',      icon: Sparkles },
  { id: 'clients',       labelKey: 'clients',       icon: User },
  { id: 'staff',         labelKey: 'staff',         icon: Users },
  { id: 'inventory',     labelKey: 'stock',         icon: Package },
  { id: 'alerts',        labelKey: 'alerts',        icon: Bell },
  { id: 'sop',           labelKey: 'sop',           icon: ShieldCheck },
  { id: 'announcements', labelKey: 'send',          icon: Megaphone },
];
const STAFF_NAV = [
  { id: 'today',     labelKey: 'today',    icon: Home },
  { id: 'schedule',  labelKey: 'schedule', icon: Calendar },
  { id: 'inventory', labelKey: 'stock',    icon: Package, requiresPerm: 'canEditStock' },
  { id: 'inbox',     labelKey: 'inbox',    icon: Inbox },
  { id: 'profile',   labelKey: 'profile',  icon: User },
];
const OWNER_NAV = [
  { id: 'overview', labelKey: 'home', icon: Gem },
];

// ================= TOUR OVERLAY (data-tour DOM targeting) =================
// ================= WELCOME SLIDESHOW =================
// Runs once for every new account on first dashboard load. Five slides: app intro,
// scope ("works for any service biz"), three capability slides, then "let's go".
// User taps Next or swipes through. Skip available throughout.
// Slide icons are stable across locales; title/body resolved from translations.
const SLIDE_ICONS = ['👋', '🌐', '📅', '👥', '📦', '✨'];

function WelcomeSlideshow({ onDone }) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const slides = SLIDE_ICONS.map((icon, i) => ({
    icon,
    title: t(`slide${i + 1}Title`),
    body: t(`slide${i + 1}Body`),
  }));
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  // Keyboard navigation: Esc skips, ←/→ navigate.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onDone(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setStep(s => Math.min(s + 1, slides.length - 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setStep(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') {
        if (step === slides.length - 1) { e.preventDefault(); onDone(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone, slides.length, step]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      background: 'rgba(28, 28, 30, 0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--cream)', borderRadius: 18,
        maxWidth: 400, width: '100%',
        padding: '32px 24px 22px',
        boxShadow: '0 12px 60px rgba(0,0,0,0.4)',
        textAlign: 'center',
        animation: 'fadein 0.3s ease',
        position: 'relative',
      }}>
        {/* Skip top-right — positioned within card so it stays visible on cream bg */}
        <button
          onClick={onDone}
          aria-label={t('skipOnboardingLabel')}
          style={{
            position: 'absolute', top: 10, right: 12,
            background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--line)', borderRadius: 999,
            padding: '10px 16px', minHeight: 44,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >{t('slideshowSkip')}</button>

        <div style={{ fontSize: 56, marginBottom: 18 }}>{slide.icon}</div>
        <h2 style={{
          fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600,
          color: 'var(--emerald)', margin: 0, lineHeight: 1.2,
        }}>{slide.title}</h2>
        <p style={{
          color: 'var(--ink)', fontSize: 14, lineHeight: 1.6,
          marginTop: 14, marginBottom: 26,
        }}>{slide.body}</p>

        {/* Progress dots */}
        <div
          role="group"
          aria-label={`${step + 1} / ${slides.length}`}
          style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}
        >
          {slides.map((_, i) => (
            <div key={i} aria-hidden="true" style={{
              width: i === step ? 22 : 7, height: 7, borderRadius: 4,
              background: i <= step ? 'var(--emerald)' : 'var(--line)',
              transition: 'all 0.25s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                color: 'var(--muted)',
              }}
            >{t('slideshowBack')}</button>
          )}
          <button
            onClick={() => isLast ? onDone() : setStep(step + 1)}
            style={{
              flex: 2, padding: '14px 16px', borderRadius: 10,
              border: 'none', background: 'var(--emerald)', color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
            }}
          >
            {isLast ? t('slideshowFinish') : t('slideshowNext')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= PRIVACY POLICY =================
function PrivacyPolicyScreen({ onBack }) {
  const { t } = useT();
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui', lineHeight: 1.7, color: '#333' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2d5a4a', fontSize: 14, marginBottom: 24, padding: 0, minHeight: 44 }}>
        ← {t('back')}
      </button>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>{t('privacyPolicyTitle')}</h1>
      <p style={{ color: 'var(--muted, #6b5d4a)', fontSize: 13, marginBottom: 32 }}>{t('privacyLastUpdated')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy1Title')}</h2>
      <p>{t('privacy1Body')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy2Title')}</h2>
      <ul>
        <li>{t('privacy2Acct')}</li>
        <li>{t('privacy2Biz')}</li>
        <li>{t('privacy2Usage')}</li>
      </ul>
      <p>{t('privacy2Foot')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy3Title')}</h2>
      <ul>
        <li>{t('privacy3a')}</li>
        <li>{t('privacy3b')}</li>
        <li>{t('privacy3c')}</li>
        <li>{t('privacy3d')}</li>
      </ul>
      <p>{t('privacy3Foot')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy4Title')}</h2>
      <p>{t('privacy4Body')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy5Title')}</h2>
      <ul>
        <li>{t('privacy5a')}</li>
        <li>{t('privacy5b')}</li>
        <li>{t('privacy5c')}</li>
      </ul>
      <p>{t('privacy5Foot')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy6Title')}</h2>
      <p>{t('privacy6Body')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy7Title')}</h2>
      <p>{t('privacy7Body')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy8Title')}</h2>
      <p>{t('privacy8Body')}</p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>{t('privacy9Title')}</h2>
      <p>{t('privacy9Body')} <a href="mailto:privacy@spapilot.app" style={{ color: '#2d5a4a' }} aria-label="Email privacy@spapilot.app">privacy@spapilot.app</a></p>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #eee', fontSize: 12, color: '#aaa' }}>
        © {new Date().getFullYear()} Spapilot. {t('privacyRights')}
      </div>
    </div>
  );
}

function TourOverlay({ onDone }) {
  const { t } = useT();
  // Filter tour steps to only include tabs visible for this business type.
  // (gym hides SOP, etc — pointing at hidden tabs would hang the tour.)
  const { hiddenTabs } = useBiz();
  const visibleSteps = useMemo(
    () => TOUR_STEPS.filter(s => !hiddenTabs.includes(s.targetId.replace(/^tab-/, ''))),
    [hiddenTabs]
  );
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  // Tracks whether we've attempted to measure for the current step. Prevents the
  // dark-flash glitch where the overlay covered the whole screen for a beat
  // before the spotlight cutout was positioned.
  const [triedMeasure, setTriedMeasure] = useState(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  // Measure target element position live
  const measure = useCallback(() => {
    const target = visibleSteps[stepRef.current];
    if (!target) { setRect(null); setTriedMeasure(true); return; }
    const el = document.querySelector(`[data-tour="${target.targetId}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
    setTriedMeasure(true);
  }, [visibleSteps]);

  // Recompute on step change, resize, scroll. Reset rect on step change so we
  // don't briefly show the previous step's spotlight on the new step.
  useEffect(() => {
    setRect(null);
    setTriedMeasure(false);
    // 250ms gives the just-mounted DOM (post-slideshow or post-tab-switch) time to settle.
    const tid = setTimeout(measure, 250);
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

  // Esc key dismisses the tour. Arrow keys advance/retreat.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onDone(); }
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = stepRef.current + 1;
        if (next < visibleSteps.length) setStep(next);
        else onDone();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStep(s => Math.max(s - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone, visibleSteps]);

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
      {/* Spotlight cutout: box-shadow creates dark vignette, transparent hole reveals target.
          Only render the dark fallback after we've actually tried to measure — avoids the
          full-screen dark flash glitch on initial mount. */}
      {rect && (
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
      )}
      {!rect && triedMeasure && (
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
        <div role="status" aria-live="polite" style={{
          position: 'fixed', zIndex: 9996, pointerEvents: 'none',
          left: tipLeft, top: Math.max(tipTop, 8),
          background: '#1c1c1e',
          color: '#f5f0e8',
          fontFamily: 'Fraunces, Georgia, serif',
          fontSize: 15, lineHeight: 1.55,
          padding: '12px 16px',
          borderRadius: 14,
          maxWidth: 'min(280px, calc(100vw - 24px))',
          wordBreak: 'break-word',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {t(currentStep.messageKey)}
        </div>
      )}

      {/* No target found — fallback card. Only show after we've tried, to avoid initial flash. */}
      {!rect && triedMeasure && currentStep && (
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
            <strong style={{ color: GOLD }}>{t(currentStep.messageKey).toLowerCase()}</strong>
          </div>
          <button
            onClick={() => { const n = step + 1; if (n < visibleSteps.length) setStep(n); else onDone(); }}
            style={{
              background: GOLD, color: '#fff', border: 'none', borderRadius: 10,
              padding: '9px 20px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            }}
          >{t('skipThisStep')}</button>
        </div>
      )}

      {/* Step counter — small fixed pill at top-left so users see overall progress */}
      <div style={{
        position: 'fixed', top: 14, left: 14, zIndex: 9999,
        background: 'rgba(28,28,30,0.85)', color: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 20, padding: '6px 12px', fontSize: 12,
        fontFamily: 'inherit', letterSpacing: '0.02em', fontWeight: 600,
      }}>
        {step + 1} / {visibleSteps.length}
      </div>
      {/* Skip tour button — focus on mount so keyboard users can dismiss the tour immediately */}
      <button
        onClick={onDone}
        autoFocus
        aria-label={t('skipTour')}
        style={{
          position: 'fixed', top: 14, right: 14, zIndex: 9999,
          background: 'rgba(28,28,30,0.9)', color: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 20, padding: '12px 18px', fontSize: 13, minHeight: 44,
          cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
        }}
      >{t('skipTour')}</button>

      {/* Step progress dots — SR users get an explicit "Step N of M" label via the surrounding region */}
      <div
        role="group"
        aria-label={`${step + 1} / ${visibleSteps.length}`}
        style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, display: 'flex', gap: 7, pointerEvents: 'none',
        }}
      >
        {visibleSteps.map((_, i) => (
          <div key={i} aria-hidden="true" style={{
            width: i === step ? 22 : 7, height: 7, borderRadius: 4,
            background: i === step ? GOLD : 'rgba(255,255,255,0.3)',
            transition: 'all 0.25s',
          }} />
        ))}
      </div>
    </>
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
  const [resetToken, setResetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get('reset_token');
    // Strip the token from the URL right away so it isn't leaked via referer
    // when the user clicks any outbound link before completing the reset.
    if (tok) {
      const url = new URL(window.location.href);
      url.searchParams.delete('reset_token');
      try { window.history.replaceState({}, '', url.toString()); } catch {}
    }
    return tok || null;
  });
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'signup'
  const [signupIntent, setSignupIntent] = useState(null); // null | 'owner' | 'staff' — drives post-signup onboarding
  const [onboardingChoice, setOnboardingChoice] = useState(null); // null | 'owner' | 'staff'
  const [business, setBusiness] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tourDone, setTourDone] = useState(false);
  // Re-evaluate tour + slideshow completion when user changes (per-user keys).
  // Stored as functions so deps can be the user object itself without lint warnings.
  useEffect(() => {
    if (!user) { setTourDone(false); return; }
    setTourDone(localStorage.getItem(tourKeyFor(user)) === 'true');
  }, [user]);
  const [slidesDone, setSlidesDone] = useState(false);
  useEffect(() => {
    if (!user) { setSlidesDone(false); return; }
    setSlidesDone(localStorage.getItem(`spapilot-slides-done-u${user.id}`) === 'true');
  }, [user]);

  const authed = !!user;
  const onboarded = !!(user?.role && user?.businessType && user?.businessId);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(() => {
    const path = window.location.pathname;
    return path === '/privacy' || path === '/privacy-policy';
  });

  const staff         = useCollection('/api/staff',         authed);
  const bookings      = useCollection('/api/bookings',      onboarded);
  const inventory     = useCollection('/api/inventory',     onboarded, 120000);
  const requests      = useCollection('/api/requests',      onboarded, 60000);
  const announcements = useCollection('/api/announcements', onboarded, 120000);
  const violations    = useCollection('/api/violations',    onboarded);
  const sops          = useCollection('/api/sop',           onboarded);
  const services      = useCollection('/api/services',      onboarded);

  const reloadAll = () => {
    staff.reload(); bookings.reload(); inventory.reload();
    requests.reload(); announcements.reload(); violations.reload();
    sops.reload(); services.reload();
  };

  // Hooks must run on every render — keep before any conditional early return.
  const lowStockCount = useMemo(
    () => inventory.data.filter(i => i.stock <= i.threshold).length,
    [inventory.data]
  );
  const pendingCount = useMemo(
    () => requests.data.filter(r => r.status === 'pending').length,
    [requests.data]
  );

  const submitRequest = async (data) => {
    await api('/api/requests', { method: 'POST', body: data });
    requests.reload();
  };

  // On mount: restore session if token present.
  // Also refetch profile if returning from Stripe checkout (?subscribed=1) so the
  // PaymentRequired gate dismisses as soon as the webhook updates subscription_status.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justSubscribed = params.get('subscribed') === '1';
    const token = getToken();
    if (!token) { setAuthChecking(false); return; }
    api('/api/auth/me')
      .then(u => {
        setUser(u);
        setAuthChecking(false);
        if (justSubscribed) {
          const url = new URL(window.location.href);
          url.searchParams.delete('subscribed');
          window.history.replaceState({}, '', url.toString());
          setToastMsg(TRANSLATIONS[localStorage.getItem(LANG_KEY) || 'en']?.subscriptionActivated || TRANSLATIONS.en.subscriptionActivated);
        }
      })
      .catch(() => { setToken(null); setAuthChecking(false); });
  }, []);

  // Listen for 401s from other requests — fully reset session state.
  useEffect(() => {
    const handler = () => {
      setUser(null); setRole(null); setBusiness(null); setOnboardingChoice(null);
      setAuthMode(null);
    };
    window.addEventListener('app:unauth', handler);
    return () => window.removeEventListener('app:unauth', handler);
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

  const logout = async ({ skipConfirm = false } = {}) => {
    if (!skipConfirm && user) {
      const ok = await appConfirm({
        title: t('signOut'),
        body: t('confirmSignOut'),
        confirmLabel: t('signOut'),
        cancelLabel: t('cancel'),
      });
      if (!ok) return;
    }
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch {}
    setToken(null);
    setUser(null);
    setRole(null);
    setBusiness(null);
    setOnboardingChoice(null);
    setAuthMode(null);
    // Avoid leaking one user's checklist to the next user on a shared device.
    try { localStorage.removeItem('app_checklist'); } catch {}
  };

  // Load business when user has businessId
  useEffect(() => {
    if (!user?.businessId) { setBusiness(null); return; }
    api('/api/businesses/me').then(setBusiness).catch(() => setBusiness(null));
  }, [user?.businessId]);

  // Reflect current tab in browser tab title so multi-tab users can tell windows apart.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const allNav = [...MANAGER_NAV, ...STAFF_NAV, ...OWNER_NAV];
    const found = allNav.find(n => n.id === tab);
    document.title = found ? `${t(found.labelKey)} · Spapilot` : 'Spapilot';
  }, [tab, t]);

  // Trial / payment status
  const trialEndDate = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const trialExpired = trialEndDate ? new Date() > trialEndDate : false;
  const isPaid = user?.subscriptionStatus === 'active';
  const needsPayment = authed && trialExpired && !isPaid;

  if (showPrivacyPolicy) return (
    <PrivacyPolicyScreen onBack={() => setShowPrivacyPolicy(false)} />
  );

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
      <div className="role-screen" role="status" aria-live="polite" aria-label={t('loading')}>
        <div className="center-muted">
          <RefreshCw size={20} aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />
          <div className="sr-only">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (!authMode) {
      return <LandingPage
        onStartTrial={() => { setSignupIntent('owner'); setAuthMode('signup'); }}
        onSignIn={() => setAuthMode('login')}
        onJoinTeam={() => { setSignupIntent('staff'); setAuthMode('signup'); }}
        onShowPrivacy={() => setShowPrivacyPolicy(true)}
      />;
    }
    return <AuthScreen
      onAuthed={(u) => {
        setUser(u);
        setAuthMode(null);
        // If user came in via "Join your team", skip the role-picker screen
        if (signupIntent === 'staff' && !u.businessId) setOnboardingChoice('staff');
        if (signupIntent === 'owner' && !u.businessId) setOnboardingChoice('owner');
        setSignupIntent(null);
      }}
      initialMode={authMode}
      onBack={() => { setAuthMode(null); setSignupIntent(null); }}
    />;
  }

  if (needsPayment) return (
    <PaymentRequired user={user} onLogout={logout} />
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

  const currentStaffId = user.staffId || user.id;

  const currentStaffMember = role === 'staff' ? staff.data.find(s => s.id === currentStaffId) : null;
  const staffPerms = { ...STAFF_DEFAULT_PERMISSIONS, ...(currentStaffMember?.permissions || {}) };
  const filteredStaffNav = STAFF_NAV.filter(item => {
    if (item.id === 'schedule') return staffPerms.canViewSchedule;
    if (item.requiresPerm) return staffPerms[item.requiresPerm];
    return true;
  });
  // Filter manager nav by biz-type defaults (gym hides SOP, etc.).
  const bizType = business?.type || 'services';
  const hiddenTabs = BIZ_HIDDEN_TABS[bizType] || [];
  const filteredManagerNav = MANAGER_NAV.filter(item => !hiddenTabs.includes(item.id));
  const nav = role === 'manager' ? filteredManagerNav : role === 'staff' ? filteredStaffNav : OWNER_NAV;
  const alertBadge = lowStockCount + pendingCount;

  const anyLoading = staff.loading || bookings.loading || inventory.loading
    || requests.loading || announcements.loading || violations.loading || sops.loading || services.loading;
  const anyError = staff.error || bookings.error || inventory.error
    || requests.error || announcements.error || violations.error || sops.error || services.error;

  const navItem = nav.find(n => n.id === tab);
  const pageTitle = navItem ? t(navItem.labelKey) : tab;

  return (
    <BizProvider business={business}>
    <div className="shell">
      <a href="#main" className="skip-link">{t('skipToMain')}</a>
      <OfflineBanner />
      <TrialBanner user={user} onUpgrade={() => setShowSettings(true)} />
      <header className="topbar">
        <div>
          <div className="brand">{business?.name || 'Spapilot'}</div>
          <div className="sub">{t(role)} · {(user.email || '').split('@')[0]}</div>
        </div>
        <div className="topbar-actions">
          <LangToggle />
          {user.role === 'manager' && (
            <button type="button" className="switch" onClick={() => setRole(null)} aria-label={t('switch')} title={t('switch')}>
              <RefreshCw size={14} aria-hidden="true" />
              <span className="topbar-label">{t('switch')}</span>
            </button>
          )}
          <button type="button" className="switch" onClick={() => setShowSettings(true)} aria-label={t('settings')} title={t('settings')}>
            <SettingsIcon size={14} aria-hidden="true" />
            <span className="topbar-label">{t('settings')}</span>
          </button>
          <button type="button" className="switch" onClick={logout} aria-label={t('signOut')} title={t('signOut')}>
            <LogOut size={14} aria-hidden="true" />
            <span className="topbar-label">{t('signOut')}</span>
          </button>
        </div>
      </header>
      {showSettings && (
        <SettingsDrawer
          user={user}
          business={business}
          onClose={() => setShowSettings(false)}
          onSwitched={(u) => { setUser(u); setRole(null); setOnboardingChoice(null); }}
          onAccountDeleted={() => {
            setToken(null);
            setUser(null);
            setRole(null);
            setBusiness(null);
            setOnboardingChoice(null);
            setAuthMode(null);
            setShowSettings(false);
          }}
          toast={toast}
        />
      )}

      <main id="main" className="page fade" tabIndex={-1} aria-label={pageTitle}>
        <h1 className="page-title">{pageTitle}</h1>

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
                <ScheduleTab bookings={bookings.data} staff={staff.data} services={services.data} onReload={bookings.reload} toast={toast} />
              )}
              {tab === 'clients' && (
                <ClientsTab bookings={bookings.data} staff={staff.data} toast={toast} />
              )}
              {tab === 'staff' && (
                <StaffTab staff={staff.data} violations={violations.data} onReload={staff.reload} toast={toast} />
              )}
              {tab === 'inventory' && (
                <InventoryTab inventory={inventory.data} onReload={inventory.reload} toast={toast} />
              )}
              {tab === 'services' && (
                <ServicesTab services={services.data} onReload={services.reload} toast={toast} />
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
                  onSubmitRequest={submitRequest} toast={toast} perms={staffPerms} />
              )}
              {tab === 'schedule' && staffPerms.canViewSchedule && (
                <StaffScheduleView staff={staff.data} bookings={bookings.data} staffId={currentStaffId} />
              )}
              {tab === 'inventory' && staffPerms.canEditStock && (
                <InventoryTab inventory={inventory.data} onReload={inventory.reload} toast={toast} />
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

      <nav className="bottom-nav" aria-label={t('navPrimary')}>
        {nav.map(item => {
          const Icon = item.icon;
          const active = tab === item.id;
          const badge = item.id === 'alerts' ? alertBadge : 0;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`nav-item ${active ? 'active' : ''}`}
              data-tour={`tab-${item.id}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
              {active && <span className="dot" aria-hidden="true" />}
              {badge > 0 && <span className="badge-dot" aria-label={`${badge} ${t('alerts')}`}>{badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Welcome slideshow runs first (feature overview), then DOM-targeting tour. */}
      {!slidesDone && !tourDone && (
        <WelcomeSlideshow onDone={() => {
          setSlidesDone(true);
          if (user?.id) localStorage.setItem(`spapilot-slides-done-u${user.id}`, 'true');
        }} />
      )}
      {slidesDone && !tourDone && (
        <TourOverlay onDone={async () => {
          setTourDone(true);
          localStorage.setItem(tourKeyFor(user), 'true');
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
    <ErrorBoundary>
      <LangProvider>
        <ConfirmProvider>
          <AppInner />
        </ConfirmProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}
