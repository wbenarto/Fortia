# Fortia

Expo + React Native app (Expo Router, NativeWind/Tailwind, TypeScript, Clerk auth, Neon/Postgres via `app/(api)/*+api.ts` routes).

## Design system

Reuse these rather than inventing new values. Sourced from `tailwind.config.js`, `lib/bodyFatUtils.ts`, and existing components (`CalorieBalanceCard`, `MacrosTracking`, `BmiCard`).

### Color

- **Brand accent**: `#E3BBA1` (`branding.100` / `base` in `tailwind.config.js`) — active tab/segment states, active icons, tints. Pressed/darker state: `#cd9c99` (`branding.200`).
- **Button color**: `#D4A07E` — one shade darker than the accent so white button text reads clearly. Use it for every filled (primary) button.
- **Ink (primary text)**: `#262135` — used as a literal hex throughout, not a Tailwind token.
- **Ink soft (secondary text)**: `#334155`, or warm `#574F47` in newer cards (darkened twice from `#64748B` / `#94897E` for readability — don't reintroduce the lighter greys for text). Faint chevrons / close icons: `#857869`.
- **Status colors (calorie/macro over-under)**: good `#7DB88A`, near-limit `#F2D58E`, over `#E08585`. Soft pastel set, distinct from BMI colors below — used for daily-tracking state (e.g. "Deficit"/"Surplus" balance, calorie ring).
- **Macro colors** (`MACRO_COLORS` in `lib/theme.ts`): protein `#FF6B4A`, carbs `#FFB020`, fat `#2FA8E0`. The bar track is the same color at ~18% (`${color}2E`).
- **BMI / body-fat category colors** (`lib/bodyFatUtils.ts`, more saturated): Underweight/Essential `#3B82F6`, Normal/Athletic/Fitness `#10B981`, Overweight/Average `#F59E0B`, Obese `#EF4444`.
- **Neutral surfaces**: screen background warm paper `#F1E9DE` (`SCREEN_BG` in `lib/theme.ts` — use the constant, not a literal); card fill `#F9F9F8` / `#F8F8F8`; hairline border `#F0EBE6` / `#EEEEEE`; pill/segment-switcher track `#F1F1F1`.
- Full palette (blues, grays, success/danger/warning scales) is in `tailwind.config.js` under `theme.extend.colors` — check there before picking a new color.

### Type

- Font family: Plus Jakarta Sans, exposed as NativeWind classes — `font-Jakarta`, `font-JakartaMedium`, `font-JakartaSemiBold`, `font-JakartaBold`, `font-JakartaExtraBold`, `font-JakartaLight`, `font-JakartaExtraLight`.
- Big numeric readouts (BMI, calories) use `JakartaExtraBold`/`JakartaBold` at 24–40px; labels/captions use `JakartaSemiBold` or `JakartaMedium` at 10–13px, often uppercase with slight letter-spacing for eyebrows.

### Icons

`@expo/vector-icons` Ionicons. `-outline` variants at rest, filled/solid for emphasis or the active tab.

### Cards & layout

- Radius: `rounded-2xl`/`rounded-3xl`. Fill white or `#F9F9F8`, `1px` border `#F0EBE6`/`#EEEEEE`. Shadows are used sparingly (e.g. `CalorieWaterCircle`'s orb), not stamped on every card.
- Status/category tinting: a subtle `expo-linear-gradient` wash from `${color}0F–17` fading to solid white by ~40–50% of the card — the tint should read as a hint, not dominate the card (see `BmiCard.tsx`).
- **Marker-on-bar pattern**: a thin (5–6px) rounded horizontal bar, optionally segmented by color, with a small circular marker (~8px, dark fill, 2px white border) positioned via `position: absolute; left: {pct}%; marginLeft: -{half-width}`. Used in `CalorieBalanceCard` and `BmiCard` — reuse this instead of a new gauge style for any "value along a range" visualization.
- Primary button: `bg-[#D4A07E] rounded-xl py-3`, centered white `JakartaBold` 17px text with a slight shadow (`textShadowColor: 'rgba(110,60,30,0.35)'`, offset 0/1, radius 2) so it reads bright. Use the button color above, not the lighter accent.

### Full-screen pages — two conventions coexist

- **Legacy pages** (`help-support.tsx`, `edit-profile.tsx`): dark navy background `#262135`, card fill `#2D2A3F`, white text, `#E3BBA1` accent icons. Being migrated to light.
- **Current/primary pages** (`home.tsx`, `bmi-calculator.tsx`, `account-settings.tsx`, anything wrapped in `ScreenBackground`): paper `SCREEN_BG` background, `useSafeAreaInsets()` for top padding, back chevron and body text in ink `#262135`.
- Default to the **current (light)** convention for new screens; when redesigning a legacy page, move it to light (see `account-settings.tsx` as the reference).
- **Sub-page header**: `chevron-back` (26, ink) left, centered `JakartaSemiBold` base title, 26px spacer right, `px-5 py-3`.

### Settings / list patterns (`account-settings.tsx`)

- **Section label**: 11px `JakartaSemiBold` `#574F47`, uppercase, 0.6 letter-spacing, above each card.
- **Grouped list card**: white `rounded-3xl`, `1px #F0EBE6` border, rows `px-4 py-3.5` separated by hairlines. Row = 36px circular icon chip (`#F9F9F8` fill, hairline border, ink outline icon) + title (`JakartaSemiBold` 14, ink) + subtitle (12, `#574F47`) + `chevron-forward` `#857869` when tappable.
- **Detail rows** (label/value): label `JakartaMedium` `#574F47`, value `JakartaSemiBold` ink, hairline between rows.
- **Segmented switch**: track `#F1F1F1` `rounded-full p-1`; active segment `#E3BBA1` with white text, inactive `#475569`.
- **Destructive**: use the soft over color `#E08585` (text, icon, button fill), in its own card below other actions — not saturated red.
- **Bottom sheet modal**: white `rounded-t-3xl p-6`, bottom inset padding; secondary button `#F1F1F1` with ink text beside the primary/destructive one.

### Units & data

- Height stored in **cm** in the DB; UI collects it as feet/inches (see `edit-profile.tsx`'s `convertFeetInchesToCm`).
- Weight stored and displayed in **lb**.
- `useUserProfile()` (`lib/userUtils.ts`) exposes weight/height/target weight/etc. from the DB, merged with Clerk. Call `triggerUserProfileRefresh()` after any mutation that changes profile-derived data (e.g. logging weight) so every screen using the hook refetches.

### Visual libraries available

- `expo-linear-gradient` — gradients/shading.
- `react-native-svg` — custom gauges/charts (see the BMI semicircular gauge and trend sparkline in `app/bmi-calculator.tsx`).
- `react-native-reanimated` — used for animated fills/orbs. **Any version bump requires rebuilding the native dev client** (`npx expo run:ios`) — a JS-only reload will throw `[Reanimated] Native part of Reanimated doesn't seem to be initialized`.

### Tab bar

Floating pill (`_layout.tsx`), blurred translucent background, no labels, Ionicons only, active icon gets a white circle + accent border.

### Activities / workout builder

- Home → **Activities** (`components/ActivitiesSection.tsx`) → `app/workout-builder.tsx` → plan `app/training/[id]/index.tsx` → player `app/training/[id]/play.tsx`. Option keys/labels and the calorie estimate live in `lib/workoutBuilder.ts` and must match fortia-api `src/lib/exerciseLibrary.ts` / `src/lib/workoutBuilder.ts`.
- Cost rules: exercises and instructions come from the seeded `exercise_library` (free-exercise-db, public domain) — Gemini only picks/orders from a short candidate list, and results are cached in `workout_templates` by input key (max 3 variants, 10 Gemini builds/user/day, rules fallback). Swaps are DB-only; demo videos are fetched only on tap.
- A finished workout is saved as **one `activities` row** (that's what feeds calories out) — never also post it to `/api/workouts`, or calories are double counted. Calories use (MET − 1) because BMR is already in calories out.
- **Today's workout** (`components/workout/TodayWorkoutCard.tsx`, top of both Activities sections) comes from `GET /api/workout-suggestion` (fortia-api `src/lib/workoutSuggestion.ts`): pure DB analytics over the last 14 days — per-area recency/volume (48h recovery), weekly cardio minutes vs 150, training streak, and preferences from recent builder inputs; goal-based starter rotation under 3 training days. It returns builder inputs only; the workout is built (cache-first) when the user taps Start.

### Progress (history & consistency)

- `app/progress.tsx` (tabs Overview / Nutrition / Weight / Activity in a swipeable pager, range Week / Month / 3 months; `?tab=` deep link). **Week = the current calendar week so far (Sunday → today)**, with the Overview calendar padded to Saturday and meal / weigh-in / workout counts; month and 3 months roll back from today. The Home recap uses the previous Sunday–Saturday week On Home, `components/progress/HomeCalendar.tsx` shows today's date, the streak and a `>` button to Progress (the `WeeklyCalendar` week strip with dots is hidden for now); `components/progress/WeeklyRecapCard.tsx` (last week's recap) is hidden for now — not rendered on Home. Home section titles use `components/progress/SectionTitle.tsx` to open the matching tab.
- Data: `GET /api/progress?clerkId&from&to&today` (`progressUrl` adds the user's local `today` so past days in the range count as finished; in week view a missed-day reminder names days with nothing logged) (fortia-api `src/lib/progress.ts`, max 120 days) — per-day aggregates, summaries, streaks and rule-based insight sentences (no AI). Days are judged against the user's **current** targets; today only counts once it's on/over target. Insight text may contain `{w}`/`{w2}` weight tokens (lb) — format them with `formatInsight` in `lib/progress.ts` so units follow the user's setting.
- Charts here are plain views / SVG (`components/progress/Charts.tsx`), not gifted-charts.

### Muscle heat map

- `components/workout/MuscleHeatmap.tsx` (top of the Activity tab, under the title): front/back body drawn from our own SVG paths in `components/workout/bodyShapes.ts` (no third-party artwork), drag sideways or use the Front / Back switch to turn it (reanimated rotateY; tab swiping is paused while a finger is on the body). Week / Month / All time.
- Data: `GET /api/muscle-heatmap?clerkId&range=week|month|all&date` (fortia-api `src/lib/muscleHeatmap.ts`), built on `loadSessions` `muscleSets`: primary muscles count full sets, secondary half, cardio activities light set-equivalents by type. Week/month heat = average sets per week (10+ = full); all time is relative to the most-trained muscle. Muscle keys are free-exercise-db `primary_muscles`.
