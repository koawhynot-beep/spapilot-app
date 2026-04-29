# SpaPilot — React Native Conversion Plan

This document maps every web component to its React Native equivalent and flags the work required to port the app to iOS/Android.

## 0. Toolchain

- **Framework**: Expo (SDK 51+) for the fastest path to TestFlight. Use `expo-router` for file-based routing.
- **Language**: keep JavaScript; no TypeScript migration required for MVP.
- **State**: keep current hook-based state (`useState`/`useEffect`). No Redux needed.
- **API**: backend stays as-is on Railway. Use `fetch` exactly like the web app.

Install:
```
npx create-expo-app spapilot-mobile
cd spapilot-mobile
npx expo install expo-secure-store expo-haptics expo-font @expo-google-fonts/fraunces @expo-google-fonts/inter react-native-safe-area-context lucide-react-native
```

## 1. Primitive mapping

| Web                                   | React Native                              | Notes |
|---------------------------------------|-------------------------------------------|-------|
| `<div>`                               | `<View>`                                  | Flex is the default; no block layout. |
| `<span>`, text nodes                  | `<Text>`                                  | **All** text must be wrapped in `<Text>`. |
| `<button>`                            | `<Pressable>`                             | Wrap with `onPressIn`/`onPressOut` for the active-scale animation. |
| `<input>`, `<textarea>`               | `<TextInput>`                             | Use `multiline` prop for textarea. |
| `<select>`                            | `@react-native-picker/picker`             | Or a custom bottom-sheet picker for a nicer feel. |
| `<form>` + `onSubmit`                 | just call the submit handler on button press | No form element exists. |
| `<input type="date">`                 | `@react-native-community/datetimepicker`  | Native picker modal. |
| `<input type="time">`                 | same package, `mode="time"`               | |
| `<input type="checkbox">`             | `<Switch>` or custom `<Pressable>` check  | |
| CSS classes                           | `StyleSheet.create({...})`                | Convert `App.css` one-to-one. |
| CSS Grid                              | `flexWrap: 'wrap'` or `FlatList numColumns` | No grid in RN core. |
| Hover                                 | — (remove)                                | Already not used; touch-only. |
| `window.confirm`                      | `Alert.alert(title, msg, [buttons])`      | |
| `localStorage`                        | `expo-secure-store`                       | Store JWT in secure storage, not AsyncStorage. |
| `position: fixed`                     | `position: 'absolute'` + SafeAreaView     | |
| Google Fonts `@import`                | `@expo-google-fonts/*`                    | Load via `useFonts` hook at app root. |
| `lucide-react`                        | `lucide-react-native`                     | Same API. |
| `fetch`                               | `fetch`                                   | Works unchanged. |

## 2. Component-by-component port

| Current file (src/App.js section) | RN conversion                              | Effort |
|-----------------------------------|--------------------------------------------|--------|
| `Avatar`                          | `View` + `Text`. Drop the color prop style → `backgroundColor`. | 5 min |
| `Badge`                           | `Text` with `Pressable` wrapper optional.  | 5 min |
| `LoadState`                       | `ActivityIndicator` from `react-native`. Remove CSS `animation: spin`. | 10 min |
| `Modal`                           | `<Modal animationType="slide" presentationStyle="pageSheet">` from `react-native`. **Best ergonomic: `@gorhom/bottom-sheet`**. | 30 min |
| `Toast`                           | `react-native-toast-message` or build via Animated API. | 20 min |
| `LoginScreen` (keypad)            | **Custom** — replace CSS grid with `View` rows. Keep 3×4 grid using `flexDirection: 'row'` + `flexWrap`. Add `Haptics.impactAsync(Light)` on each tap. | 1 hr |
| `RoleSelector`                    | Straight port. `Pressable` rows.           | 20 min |
| `ManagerDashboard`                | Straight port.                             | 45 min |
| `ScheduleTab`                     | Replace list with `FlatList` for performance on long schedules. | 45 min |
| `BookingModal`, `StaffModal`, etc | Wrap each in `<Modal>` or bottom sheet.    | 30 min each (~4 modals) |
| `InventoryTab` (+/- buttons)      | Add `Haptics` on stock adjust.             | 30 min |
| `StaffTodayView` / `StaffScheduleView` / `StaffInboxView` / `StaffProfileView` | Straight port. | 1.5 hr total |
| Bottom nav                        | `expo-router` tabs OR `@react-navigation/bottom-tabs`. | 45 min |

## 3. Global concerns

### 3.1 Fonts
Replace the `@import url(...Fraunces...)` in `index.css` with:
```js
import { useFonts, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
```
Gate the root render on `fontsLoaded`.

### 3.2 Colors — copy into `theme.js`
```js
export const theme = {
  cream: '#f5f0e8', creamSoft: '#faf6ef', creamDeep: '#ece3d3',
  emerald: '#2d5a4a', emeraldDark: '#1e3f33', emeraldSoft: '#e6ede9',
  gold: '#b8956a', goldSoft: '#e7d8c2',
  ink: '#2b2623', muted: '#8a7f74', line: '#e8dfd1',
  danger: '#b84a4a', success: '#5a8f6c', warn: '#c9872a',
};
```

### 3.3 Auth + token storage
- Web uses `localStorage`. RN: `SecureStore.setItemAsync('spapilot_token', token)`.
- 401 handling: on fetch → if 401, clear token, navigate to `/login`.
- Session persists across app restarts via SecureStore.

### 3.4 Safe areas
- Wrap each screen in `<SafeAreaView edges={['top']}>`.
- Bottom tab bar handles its own bottom inset.
- Already added `env(safe-area-inset-*)` CSS — RN equivalent is `react-native-safe-area-context`.

### 3.5 Keyboard handling
- Login and all modals with inputs → wrap in `<KeyboardAvoidingView behavior="padding">`.
- Use `keyboardType="number-pad"` on PIN input if keypad gets replaced with native keypad.

### 3.6 Gestures & haptics
- Add `Haptics.selectionAsync()` on: PIN key tap, nav tab change, modal open.
- `Haptics.notificationAsync(Success)` on: login success, save success, violation logged.

### 3.7 Deep links / notifications (phase 2)
- Expo push notifications for announcements.
- Deep link `spapilot://request/123` to jump manager to the pending request.

## 4. Known blockers and workarounds

1. **`<form onSubmit>`** — doesn't exist in RN. Refactor every form to call the save handler from button `onPress`. Validation stays in JS.
2. **CSS Grid in `.stats` and `.week-grid` and `.keypad`** — convert to flex rows. For 7-day week: `flexDirection: 'row'` with `flex: 1` children.
3. **`alert()` / `window.confirm()`** — replace with `Alert.alert()`. Already isolated to `del()` handlers in `ScheduleTab`, `StaffTab`, `InventoryTab`, `AnnouncementsTab`.
4. **`localStorage`** in `getToken`/`setToken` — two functions. Change to `expo-secure-store` (async — adjust callers).
5. **`window.addEventListener('spapilot:unauth')`** — no DOM events in RN. Replace with a simple pub-sub or `zustand` store for auth state.
6. **`window.dispatchEvent`** inside `api()` — same fix.
7. **CSS variables (`var(--emerald)`)** — not supported. Inline from `theme.js`.
8. **Animations** — `@keyframes fadein/slideup/spin` don't port. Use `Animated` API or `react-native-reanimated`. For simple fades, `Animated.View` with opacity interpolation is enough.

## 5. Estimated effort

| Phase                           | Time        |
|---------------------------------|-------------|
| Project scaffolding + fonts     | 1 hr        |
| Auth + navigation shell         | 2 hr        |
| Shared UI (Avatar, Badge, Modal, Toast, Cards, Buttons) | 3 hr  |
| Login keypad                    | 1 hr        |
| All Manager tabs                | 6 hr        |
| All Staff tabs                  | 4 hr        |
| Owner view                      | 1 hr        |
| Polish, haptics, empty states   | 3 hr        |
| TestFlight build + submission   | 2 hr        |
| **Total (one developer)**       | **~23 hr**  |

## 6. What NOT to port

- Nothing on the **backend** changes — same Express server, same endpoints. The mobile app points its `API_URL` at the Railway URL.
- SQL schema and seed are identical.
- Demo credentials, JWT logic, role-based access, SOP/booking/inventory business rules — all stay server-side.

## 7. Next steps after MVP ships

1. Offline queue for stock adjustments + request submissions (SQLite via `expo-sqlite`).
2. Biometric unlock in addition to PIN (`expo-local-authentication`).
3. Push notifications on new announcement / approved request.
4. Haptic + sound for booking start times (gentle chime).
