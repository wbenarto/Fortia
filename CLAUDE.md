# Fortia

Expo + React Native app (Expo Router, NativeWind/Tailwind, TypeScript, Clerk auth, Neon/Postgres via `app/(api)/*+api.ts` routes).

## Design system

Reuse these rather than inventing new values. Sourced from `tailwind.config.js`, `lib/bodyFatUtils.ts`, and existing components (`CalorieBalanceCard`, `MacrosTracking`, `BmiCard`).

### Color

- **Brand accent**: `#E3BBA1` (`branding.100` / `base` in `tailwind.config.js`) — active tab/segment states, active icons, tints. Pressed/darker state: `#cd9c99` (`branding.200`).
- **Button color**: ink `#262135` — every filled (primary) button, white text. (Was `#D4A07E` tan; switched for contrast on the paper background. Tan stays for accents, selected chips/segments, progress fills.)
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
- Primary button: `bg-[#262135] rounded-xl py-3`, centered white `JakartaBold` 15–17px text. `CustomButton` primary uses the same ink. The Home quick-log FAB is an ink gradient (`#3B3352 → #262135`) with white option badges.

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

- Home → **Activities** (`components/ActivitiesSection.tsx`) → `app/workout-builder.tsx` (multi-step: type → focus → where/equipment → time → review, reanimated slide/stagger transitions) → plan `app/training/[id]/index.tsx` → player `app/training/[id]/play.tsx`. Option keys/labels and the calorie estimate live in `lib/workoutBuilder.ts` and must match fortia-api `src/lib/exerciseLibrary.ts` / `src/lib/workoutBuilder.ts`.
- Cost rules: exercises and instructions come from the seeded `exercise_library` (free-exercise-db, public domain) — Gemini only picks/orders from a short candidate list, and results are cached in `workout_templates` by input key (max 3 variants, 10 Gemini builds/user/day, rules fallback). Swaps are DB-only; demo videos are fetched only on tap. Focus can be a broad area (`focus_tags`) or a specific muscle (biceps, quads… — `SPECIFIC_MUSCLES` in fortia-api `exerciseLibrary.ts`, matched on `primary_muscles`, no reseed needed); keep the app's `FocusKey` / `FOCUS_GROUPS` in sync.
- The Workouts section (`ActivitiesSection`, Home only — removed from the Activity tab) shows only **today's unfinished** workouts; completed ones live in the exercise list as logged activities. Today's in-progress workout gets its own card at the top (`components/workout/InProgressWorkoutCard.tsx`: current exercise, sets/exercises done, time, Resume → workout page) and is left out of the list below (planned only). The recommended workout card always shows, even while a workout is in progress.
- A finished workout is saved as **one `activities` row** (that's what feeds calories out) — never also post it to `/api/workouts`, or calories are double counted. Calories use (MET − 1) because BMR is already in calories out. The finish screen estimates from ticked sets (`estimateCaloriesFromSets` in `lib/workoutBuilder.ts`: reps × 3s at the exercise's MET + rest at net MET 1.5 + load work at 25% efficiency); time-based `estimateWorkoutCalories` only when no set is ticked (and as the API fallback).
- **Today's workout** (`components/workout/TodayWorkoutCard.tsx`, top of the Home Workouts section) comes from `GET /api/workout-suggestion` (fortia-api `src/lib/workoutSuggestion.ts`): pure DB analytics over the last 14 days — per-area recency/volume (48h recovery), weekly cardio minutes vs 150, training streak, and preferences from recent builder inputs; goal-based starter rotation under 3 training days. It returns builder inputs only. Labelled "Today's recommended workout"; "Show exercises" calls `POST /api/workout-builder` with `preview: true`, which resolves the template cache-first and creates no workout. Start then passes that `templateId`, so it builds what was shown. The card's banner image is the first main exercise's photo: from the preview once loaded, otherwise `image` on each suggestion (looked up from cached templates only, never triggers a build), otherwise the `back-exercise.png` placeholder.

### Progress (history & consistency)

- `app/progress.tsx` (tabs Overview / Nutrition / Weight / Activity in a swipeable pager, range Week / Month / 3 months; `?tab=` deep link). **Week = the current calendar week so far (Sunday → today)**, with the Overview calendar padded to Saturday and meal / weigh-in / workout counts; month and 3 months roll back from today. The Home recap uses the previous Sunday–Saturday week On Home, `components/progress/HomeCalendar.tsx` (date, streak, `>` to Progress) is hidden for now — Home uses `HomeHeader.tsx` (greeting + avatar) with `components/DateNavigator.tsx` as its small eyebrow (‹ Today · date ›, tap the date for a calendar sheet, max today) driving `selectedDate` for Nutrition and Body (the same eyebrow switcher heads the Food log — `FoodLogCard` `date`/`onDateChange` — and the Activity page, where device step sync still always writes today); the Workouts section only shows on today; `components/progress/WeeklyRecapCard.tsx` (last week's recap) is hidden for now — not rendered on Home. Home section titles use `components/progress/SectionTitle.tsx` to open the matching tab.
- Data: `GET /api/progress?clerkId&from&to&today` (`progressUrl` adds the user's local `today` so past days in the range count as finished; in week view a missed-day reminder names days with nothing logged) (fortia-api `src/lib/progress.ts`, max 120 days) — per-day aggregates, summaries, streaks and rule-based insight sentences (no AI). Days are judged against the user's **current** targets; today only counts once it's on/over target. Insight text may contain `{w}`/`{w2}` weight tokens (lb) — format them with `formatInsight` in `lib/progress.ts` so units follow the user's setting.
- Charts here are plain views / SVG (`components/progress/Charts.tsx`), not gifted-charts.

### Meal guide

- Tapping a macro (Protein / Carbs / Fat — `MacroBar` `onPress`, on Home and the Food log) opens `app/macro-guide.tsx?macro=&date=`: the gap card (g to go, cal left), then "From your meals" (recent + favorites), Snacks and Meals ranked for that gap, each with + to log straight to that day (snack, or the time-of-day meal type), with an Undo toast.
- Foods and ranking live in `lib/mealGuide.ts` (`GUIDE_FOODS`, approximate USDA values per portion; `rankFoods`): macro density + share of the gap closed, penalised for going over calories or another macro's target; keto hides foods over 15 g carbs. No AI calls.

### Camera logging (Log a meal → Scan barcode / Snap a photo)

- `components/camera/CameraSheet.tsx`: `expo-camera` `CameraView` (MIT, built-in EAN/UPC scanning, no paid SDK) drawn as an absolute-fill layer **inside** the Log meal modal (not a second modal). Photo / label modes resize to 1024px JPEG base64 (`expo-image-manipulator`), with a library pick (`expo-image-picker`). Native modules: rebuild the dev client after installing.
- **Barcode** → `GET /api/food-barcode?clerkId&code` (fortia-api `src/lib/foodBarcode.ts`): cache `barcode_products` (migration 021, misses cached 7 days) → Open Food Facts → USDA FoodData Central Branded (`FDC_API_KEY`). Free. Values per 100 g plus the label serving; the `'barcode'` view has a ½-serving stepper. **Licenses:** Open Food Facts is ODbL, so always show "Data from Open Food Facts (ODbL)" where its data appears (and in the App Store listing), keep its rows unmerged with other sources, never show its product photos (CC-BY-SA), send a User-Agent (`OFF_CONTACT`). USDA is public domain.
- Not found → **Snap the label** (photo endpoint, `mode: 'label'`) or enter manually.
- **Photo** → `POST /api/meal-photo-analysis` (Gemini, image `inline_data`, medium media resolution): ONE call returns `items` (ingredient, amount, macros) + totals; they prefill the `'new'` ingredient form. Saving unchanged rows uses those totals with no second AI call; edited rows go through `recipe-analysis`. ≈ $0.003–0.006 per photo (~1k in / ~600 out tokens; token counts are logged). 10 photos per user per day in `ai_usage` (DB, since the in-memory limiter resets per serverless instance). Photos are never stored. Gemini must be on the paid tier (free tier may train on inputs).

### Muscle heat map

- `components/workout/MuscleHeatmap.tsx` (Activity tab, below the Burned summary): front/back body drawn from our own SVG paths in `components/workout/bodyShapes.ts` (no third-party artwork), drag sideways or use the Front / Back switch to turn it (reanimated rotateY; tab swiping is paused while a finger is on the body). Week / Month / All time.
- Data: `GET /api/muscle-heatmap?clerkId&range=week|month|all&date` (fortia-api `src/lib/muscleHeatmap.ts`), built on `loadSessions` `muscleSets`: primary muscles count full sets, secondary half, cardio activities light set-equivalents by type. Week/month heat = average sets per week (10+ = full); all time is relative to the most-trained muscle. Muscle keys are free-exercise-db `primary_muscles`.

### Challenges (Challenges tab)

- `components/challenges/ChallengesPanel.tsx` (Challenges tab in `social.tsx`): the active challenge with a mini grid, or a "Start a challenge" card, plus past challenges. `app/challenge-setup.tsx` sets the start (today / tomorrow / a date), the length (4 weeks / 30 / 60 / 100 days or an end date, 7–120 days), the diet and workouts per week (1–7). `app/challenge.tsx?id=` shows the GitHub-style grid (`components/challenges/ChallengeGrid.tsx`: weeks as columns, Sun–Sat rows), tap-a-day details, stats, weekly workouts and End challenge.
- Rules (fortia-api `src/lib/challenges.ts`, table `challenges`, migration 019):
  - A day succeeds when calories, carbs and fat are all ≤ target. Protein ≥ 90% only counts toward the shade; there are no bonus points or saves.
  - No meals logged = missed. Today is never judged.
  - Shade = number of the 4 targets hit (`LEVEL_COLORS`).
  - Starting a challenge switches the user's real diet (recalculated targets across the app) and stores a copy of the targets, so later changes don't recolor past days.
  - One active challenge per user. It completes automatically after the end date.
