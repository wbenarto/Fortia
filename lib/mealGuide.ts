// Meal guide: what to eat to close a macro gap today.
// A built-in list of everyday foods (approximate USDA values per portion) plus the user's
// own recent / favorite meals, ranked against what's left of today's targets. No AI calls.

export type GuideMacro = 'protein' | 'carbs' | 'fats';
export type GuideKind = 'snack' | 'meal';

export interface GuideMacros {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
}

export interface GuideFood extends GuideMacros {
	id: string;
	name: string;
	portion: string;
	kind: GuideKind;
	emoji: string;
	// Set for the user's own meals (recent / favorites)
	ingredients?: string[][] | null;
	own?: boolean;
}

export const GUIDE_MACROS: GuideMacro[] = ['protein', 'carbs', 'fats'];

export const GUIDE_MACRO_LABELS: Record<GuideMacro, string> = {
	protein: 'Protein',
	carbs: 'Carbs',
	fats: 'Fat',
};

const KCAL_PER_GRAM: Record<GuideMacro, number> = { protein: 4, carbs: 4, fats: 9 };

const food = (
	id: string,
	emoji: string,
	name: string,
	portion: string,
	kind: GuideKind,
	calories: number,
	protein: number,
	carbs: number,
	fats: number
): GuideFood => ({ id, emoji, name, portion, kind, calories, protein, carbs, fats });

export const GUIDE_FOODS: GuideFood[] = [
	// Protein-forward snacks
	food('greek-yogurt', '🥣', 'Plain Greek yogurt (nonfat)', '170 g cup', 'snack', 100, 17, 6, 1),
	food('skyr', '🥣', 'Skyr', '150 g cup', 'snack', 90, 15, 6, 0),
	food('cottage-cheese', '🧀', 'Cottage cheese (2%)', '1 cup', 'snack', 180, 24, 10, 5),
	food('boiled-eggs', '🥚', 'Hard-boiled eggs', '2 large', 'snack', 155, 13, 1, 11),
	food('protein-shake', '🥤', 'Whey protein shake', '1 scoop, with water', 'snack', 120, 24, 3, 2),
	food('jerky', '🥩', 'Beef jerky', '1 oz', 'snack', 115, 9, 3, 7),
	food('string-cheese', '🧀', 'String cheese', '1 stick', 'snack', 80, 7, 1, 5),
	food('turkey-slices', '🦃', 'Deli turkey slices', '3 oz', 'snack', 90, 15, 3, 2),
	food('tuna-can', '🐟', 'Tuna in water', '1 can (5 oz)', 'snack', 120, 26, 0, 1),
	food('edamame', '🫛', 'Edamame (shelled)', '1 cup', 'snack', 190, 18, 14, 8),
	food('protein-bar', '🍫', 'Protein bar', '1 bar (60 g)', 'snack', 200, 20, 22, 7),
	food('chocolate-milk', '🥛', 'Low-fat chocolate milk', '1 cup', 'snack', 190, 8, 30, 5),
	// Carb-forward snacks
	food('banana', '🍌', 'Banana', '1 medium', 'snack', 105, 1, 27, 0),
	food('apple', '🍎', 'Apple', '1 medium', 'snack', 95, 1, 25, 0),
	food('grapes', '🍇', 'Grapes', '1 cup', 'snack', 105, 1, 27, 0),
	food('dates', '🌴', 'Medjool dates', '3 dates', 'snack', 200, 1, 54, 0),
	food('rice-cakes', '🍘', 'Rice cakes with honey', '2 cakes + 1 tbsp', 'snack', 135, 2, 32, 1),
	food('pretzels', '🥨', 'Pretzels', '1 oz', 'snack', 110, 3, 23, 1),
	food('oatmeal', '🥣', 'Oatmeal', '1 cup cooked', 'snack', 150, 5, 27, 3),
	food('bagel', '🥯', 'Plain bagel', '1 medium', 'snack', 275, 11, 54, 2),
	food(
		'toast-jam',
		'🍞',
		'Whole wheat toast with jam',
		'2 slices + 1 tbsp',
		'snack',
		210,
		8,
		40,
		2
	),
	food('sweet-potato', '🍠', 'Baked sweet potato', '1 medium', 'snack', 105, 2, 24, 0),
	food('granola-bar', '🌾', 'Granola bars', '2 bars', 'snack', 190, 4, 29, 7),
	// Fat-forward snacks
	food('almonds', '🌰', 'Almonds', '1 oz (about 23)', 'snack', 165, 6, 6, 14),
	food('walnuts', '🌰', 'Walnuts', '1 oz', 'snack', 185, 4, 4, 18),
	food('mixed-nuts', '🥜', 'Mixed nuts', '1 oz', 'snack', 170, 5, 7, 15),
	food('peanut-butter', '🥜', 'Peanut butter', '2 tbsp', 'snack', 190, 7, 7, 16),
	food('apple-pb', '🍎', 'Apple with peanut butter', '1 apple + 2 tbsp', 'snack', 285, 8, 32, 16),
	food('avocado', '🥑', 'Avocado', '1/2 medium', 'snack', 120, 2, 6, 11),
	food('avocado-toast', '🥑', 'Avocado toast', '1 slice + 1/2 avocado', 'snack', 200, 6, 20, 12),
	food('cheddar', '🧀', 'Cheddar cheese', '1 oz', 'snack', 115, 7, 0, 10),
	food('dark-chocolate', '🍫', 'Dark chocolate (70–85%)', '1 oz', 'snack', 170, 2, 13, 12),
	food('trail-mix', '🥜', 'Trail mix', '1/4 cup', 'snack', 175, 5, 16, 11),
	food('hummus', '🥕', 'Hummus with veggies', '1/4 cup + carrots', 'snack', 185, 6, 18, 10),
	food(
		'chia-pudding',
		'🥥',
		'Chia pudding (unsweetened)',
		'2 tbsp chia + almond milk',
		'snack',
		155,
		5,
		11,
		10
	),
	// Meals
	food('chicken-breast', '🍗', 'Grilled chicken breast', '6 oz', 'meal', 280, 53, 0, 6),
	food('shrimp', '🍤', 'Grilled shrimp', '6 oz', 'meal', 170, 36, 0, 2),
	food('egg-whites', '🍳', 'Egg white scramble', '1 cup egg whites', 'meal', 125, 26, 2, 0),
	food('tofu', '🍱', 'Firm tofu, pan-seared', '150 g', 'meal', 215, 26, 4, 13),
	food(
		'chicken-rice-bowl',
		'🍚',
		'Chicken, rice & broccoli',
		'6 oz + 1 cup + 1 cup',
		'meal',
		540,
		59,
		56,
		7
	),
	food('burrito-bowl', '🌯', 'Chicken burrito bowl', 'rice, beans, salsa', 'meal', 630, 48, 70, 16),
	food(
		'turkey-sandwich',
		'🥪',
		'Turkey sandwich on whole wheat',
		'1 sandwich',
		'meal',
		350,
		26,
		38,
		10
	),
	food('tuna-wrap', '🌯', 'Tuna salad wrap', '1 wrap', 'meal', 400, 30, 32, 16),
	food('salmon-quinoa', '🐟', 'Salmon, quinoa & greens', '5 oz + 1 cup', 'meal', 530, 40, 42, 22),
	food(
		'steak-potato',
		'🥩',
		'Sirloin steak & baked potato',
		'6 oz + 1 medium',
		'meal',
		480,
		54,
		37,
		12
	),
	food('omelette', '🍳', 'Veggie omelette with toast', '3 eggs + 1 slice', 'meal', 315, 23, 17, 16),
	food('caesar-salad', '🥗', 'Chicken Caesar salad', '1 large bowl', 'meal', 470, 40, 15, 28),
	food('yogurt-bowl', '🫐', 'Greek yogurt, berries & granola', '1 bowl', 'meal', 260, 20, 38, 4),
	food('overnight-oats', '🥣', 'Protein overnight oats', '1 jar', 'meal', 380, 26, 54, 9),
	food('shrimp-stir-fry', '🍤', 'Shrimp stir-fry with rice', '1 plate', 'meal', 545, 42, 55, 16),
	food('pasta-marinara', '🍝', 'Pasta with marinara', '1 cup cooked', 'meal', 290, 9, 55, 3),
	food('lentil-soup', '🍲', 'Lentil soup', '1.5 cups', 'meal', 280, 18, 44, 4),
	food(
		'salmon-avocado',
		'🥗',
		'Salmon & avocado salad',
		'5 oz + 1/2 avocado',
		'meal',
		450,
		33,
		12,
		30
	),
];

// A food only counts as a source of a macro when that macro is a real part of it
const isSourceOf = (item: GuideMacros, macro: GuideMacro) => {
	const share = (item[macro] * KCAL_PER_GRAM[macro]) / Math.max(item.calories, 1);
	const minGrams = macro === 'fats' ? 6 : 8;
	return share >= 0.25 || item[macro] >= minGrams * 2 || (share >= 0.15 && item[macro] >= minGrams);
};

export interface RankedFood {
	food: GuideFood;
	score: number;
	// Calories past what's left today (0 = fits)
	caloriesOver: number;
	// Other macros this pushes over their target
	pushesOver: GuideMacro[];
}

/**
 * Ranks foods for closing the `macro` gap. `left` is target − eaten (can be ≤ 0).
 * Rewards foods dense in the macro (share of calories) that close a good part of the gap,
 * and penalises going over the calorie target or another macro's target.
 */
export const rankFoods = (
	foods: GuideFood[],
	macro: GuideMacro,
	left: GuideMacros,
	targets: GuideMacros,
	options: { keto?: boolean } = {}
): RankedFood[] => {
	const gap = Math.max(left[macro], 1);
	const others = GUIDE_MACROS.filter(m => m !== macro);

	return foods
		.filter(f => isSourceOf(f, macro))
		.filter(f => !options.keto || macro === 'carbs' || f.carbs <= 15)
		.map(f => {
			const density = (f[macro] * KCAL_PER_GRAM[macro]) / Math.max(f.calories, 1);
			const closes = Math.min(f[macro], gap) / gap;
			// Big overshoot of the focus macro itself is wasteful, mildly
			const overshoot = Math.max(0, f[macro] - gap) / gap;

			const caloriesOver = left.calories > 0 ? Math.max(0, f.calories - left.calories) : f.calories;
			const pushesOver = others.filter(m => f[m] > Math.max(left[m], 0) + 2);
			const otherPenalty = others.reduce(
				(sum, m) => sum + Math.max(0, f[m] - Math.max(left[m], 0)) / Math.max(targets[m], 1),
				0
			);
			const caloriePenalty = caloriesOver / Math.max(targets.calories, 1);

			const score =
				0.55 * density +
				0.45 * closes -
				0.15 * Math.min(overshoot, 2) -
				1.5 * otherPenalty -
				3 * caloriePenalty;
			return { food: f, score, caloriesOver, pushesOver };
		})
		.sort((a, b) => b.score - a.score);
};

/** Short hint under the gap: how many of the top picks it'd roughly take. */
export const gapHint = (macro: GuideMacro, gapGrams: number, caloriesLeft: number) => {
	const label = GUIDE_MACRO_LABELS[macro].toLowerCase();
	if (gapGrams <= 0) return `You've hit your ${label} target for the day.`;
	if (caloriesLeft <= 0)
		return `You're at your calorie target, so these are the leanest ways to add ${label}.`;
	const perCal = Math.round(((gapGrams * KCAL_PER_GRAM[macro]) / caloriesLeft) * 100);
	if (perCal >= 60)
		return `That's a lot of ${label} for the calories left. Pick the most ${label}-dense options.`;
	if (perCal >= 35) return `Lean toward foods where ${label} is most of the calories.`;
	return `Plenty of room. A snack or a meal from below will get you there.`;
};
