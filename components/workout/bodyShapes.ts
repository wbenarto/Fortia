// Hand-drawn body outline for the muscle heat map (our own artwork, no third-party
// license). viewBox 0 0 200 360, centred on x = 100. Shapes with `mirror` are drawn for
// the left half only and reflected for the right. Muscle keys match exercise_library
// primary_muscles (free-exercise-db).

export type Muscle =
	| 'abdominals'
	| 'abductors'
	| 'adductors'
	| 'biceps'
	| 'calves'
	| 'chest'
	| 'forearms'
	| 'glutes'
	| 'hamstrings'
	| 'lats'
	| 'lower back'
	| 'middle back'
	| 'quadriceps'
	| 'shoulders'
	| 'traps'
	| 'triceps';

export interface BodyShape {
	d: string;
	muscle?: Muscle; // unset = neutral body part (head, hands, knees, feet)
	mirror?: boolean;
}

export const BODY_VIEWBOX = '0 0 200 360';

const HEAD =
	'M100 8 C111 8 118 17 118 30 C118 43 111 53 100 53 C89 53 82 43 82 30 C82 17 89 8 100 8 Z';
const NECK = 'M92 48 L108 48 L111 76 L89 76 Z';
const HAND =
	'M49 182 C54 181 58 184 58 190 C58 198 55 204 51 204 C46 204 44 198 44 192 C44 186 46 183 49 182 Z';
const FOOT = 'M79 331 L90 331 C92 337 92 343 89 347 L76 347 C74 342 76 336 79 331 Z';
const SHOULDER =
	'M71 71 C62 71 55 78 53 88 C52 96 53 104 56 110 C60 102 66 94 73 89 C76 84 76 76 71 71 Z';
const UPPER_ARM =
	'M56 113 C60 104 66 97 72 94 C73 104 71 118 67 132 C63 136 57 136 54 131 C53 124 54 118 56 113 Z';
const FOREARM =
	'M53 136 C57 139 62 139 66 136 C66 150 61 165 57 179 L48 179 C47 164 49 149 53 136 Z';

export const FRONT_SHAPES: BodyShape[] = [
	{ d: HEAD },
	{ d: NECK },
	{ d: HAND, mirror: true },
	{ d: FOOT, mirror: true },
	// Groin / hip crease
	{ d: 'M83 160 L100 166 L100 190 C96 186 90 182 85 179 Z', mirror: true },
	// Knee
	{
		d: 'M76 252 C82 250 90 251 92 256 C93 262 90 270 84 271 C78 270 75 262 76 252 Z',
		mirror: true,
	},
	{ d: 'M91 60 C86 64 80 67 73 70 L91 72 Z', muscle: 'traps', mirror: true },
	{ d: SHOULDER, muscle: 'shoulders', mirror: true },
	{
		d: 'M76 73 C85 72 93 73 98 75 L98 102 C92 106 82 107 74 102 C70 99 70 93 73 88 C76 84 77 78 76 73 Z',
		muscle: 'chest',
		mirror: true,
	},
	{ d: UPPER_ARM, muscle: 'biceps', mirror: true },
	{ d: FOREARM, muscle: 'forearms', mirror: true },
	{
		d: 'M81 107 C87 109 93 110 98 110 L98 160 C92 160 86 157 83 152 C81 138 80 122 81 107 Z',
		muscle: 'abdominals',
		mirror: true,
	},
	// Obliques
	{
		d: 'M72 105 C75 108 78 110 79 112 C78 126 79 140 81 152 C76 148 72 142 70 134 C69 124 69 114 72 105 Z',
		muscle: 'abdominals',
		mirror: true,
	},
	// Hip (tensor / glute med, front)
	{
		d: 'M70 140 C73 152 78 162 83 170 C80 178 77 186 75 196 C70 186 68 172 68 156 Z',
		muscle: 'abductors',
		mirror: true,
	},
	{
		d: 'M86 176 C90 180 93 186 94 192 C94 212 92 230 90 246 C86 250 80 250 76 246 C73 232 72 216 75 200 C78 190 82 182 86 176 Z',
		muscle: 'quadriceps',
		mirror: true,
	},
	{
		d: 'M96 192 C98 194 99 198 99 202 L99 228 C96 222 95 214 95 206 C95 200 95 196 96 192 Z',
		muscle: 'adductors',
		mirror: true,
	},
	{
		d: 'M76 276 C80 273 88 273 92 277 C92 296 90 312 88 328 L80 328 C77 312 75 294 76 276 Z',
		muscle: 'calves',
		mirror: true,
	},
];

export const BACK_SHAPES: BodyShape[] = [
	{ d: HEAD },
	{ d: NECK },
	{ d: HAND, mirror: true },
	{ d: FOOT, mirror: true },
	// Back of knee
	{
		d: 'M76 254 C82 252 90 253 92 258 C93 264 90 268 84 269 C78 268 75 262 76 254 Z',
		mirror: true,
	},
	// Achilles
	{ d: 'M80 312 L90 312 L89 331 L81 331 Z', mirror: true },
	{ d: 'M100 54 C97 60 90 64 73 70 C84 76 93 86 100 104 Z', muscle: 'traps', mirror: true },
	{ d: SHOULDER, muscle: 'shoulders', mirror: true },
	{
		d: 'M76 82 C81 89 85 97 87 105 C87 117 88 128 90 138 L95 150 C86 148 79 140 75 130 C70 116 70 98 76 82 Z',
		muscle: 'lats',
		mirror: true,
	},
	{
		d: 'M89 96 C93 101 96 106 100 108 L100 134 L92 130 C90 120 89 108 89 96 Z',
		muscle: 'middle back',
		mirror: true,
	},
	{
		d: 'M92 134 L100 138 L100 164 L89 162 C89 154 90 144 92 134 Z',
		muscle: 'lower back',
		mirror: true,
	},
	{ d: UPPER_ARM, muscle: 'triceps', mirror: true },
	{ d: FOREARM, muscle: 'forearms', mirror: true },
	// Glute med (side of hip)
	{
		d: 'M72 148 C76 156 82 162 87 165 C81 167 76 171 73 177 C70 168 70 158 72 148 Z',
		muscle: 'abductors',
		mirror: true,
	},
	{
		d: 'M100 168 C92 165 81 168 75 177 C71 187 73 200 80 206 C88 211 96 209 100 205 Z',
		muscle: 'glutes',
		mirror: true,
	},
	{
		d: 'M76 210 C84 213 92 213 98 210 C98 228 96 242 92 252 C86 255 79 255 75 250 C72 236 72 222 76 210 Z',
		muscle: 'hamstrings',
		mirror: true,
	},
	{
		d: 'M76 272 C82 267 90 267 94 273 C96 287 94 299 90 311 L80 311 C74 299 72 285 76 272 Z',
		muscle: 'calves',
		mirror: true,
	},
];

export const MIRROR_TRANSFORM = 'translate(200 0) scale(-1 1)';
