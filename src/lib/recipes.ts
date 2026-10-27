import { getCollection, type CollectionEntry } from 'astro:content';

export type Recipe = CollectionEntry<'recipes'>;

// Card colours, cycled in list order. `tint` is a CSS variable from global.css.
const PALETTE = [
	{ tint: 'var(--tint-tomato)', dot: '#F04E23' },
	{ tint: 'var(--tint-mustard)', dot: '#E8B21C' },
	{ tint: 'var(--tint-sage)', dot: '#6E9E52' },
	{ tint: 'var(--tint-plum)', dot: '#9A6BB8' },
	{ tint: 'var(--tint-sky)', dot: '#4F8DBF' },
	{ tint: 'var(--tint-rose)', dot: '#D9596F' },
];

const TAG_TINTS: Record<string, string> = {
	breakfast: 'var(--tint-mustard)',
	mains: 'var(--tint-tomato)',
	quick: 'var(--tint-sky)',
	vegetarian: 'var(--tint-sage)',
	baking: 'var(--tint-plum)',
};

export async function getRecipes() {
	const recipes = await getCollection('recipes');
	return recipes.sort(
		(a, b) => Number(b.data.featured) - Number(a.data.featured) || a.data.title.localeCompare(b.data.title),
	);
}

export function colourFor(index: number) {
	return PALETTE[index % PALETTE.length];
}

export function tagTint(tag: string, index = 0) {
	return TAG_TINTS[tag.toLowerCase()] ?? PALETTE[index % PALETTE.length].tint;
}

export function tagLabel(tag: string) {
	return tag.charAt(0).toUpperCase() + tag.slice(1);
}

export function slugify(tag: string) {
	return tag.toLowerCase().trim().replace(/\s+/g, '-');
}

/** "1 h 15 min" → 75. Returns null for anything it can't read, like "overnight". */
function toMinutes(value?: string) {
	if (!value) return null;
	const match = value.trim().match(/^(?:(\d+)\s*h(?:rs?|ours?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?$/i);
	if (!match || (!match[1] && !match[2])) return null;
	return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

function formatMinutes(total: number) {
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (!h) return `${m} min`;
	return m ? `${h} h ${m} min` : `${h} h`;
}

export function totalTime({ time, prep, cook }: Recipe['data']) {
	if (time) return time;
	const p = toMinutes(prep);
	const c = toMinutes(cook);
	if (p !== null && c !== null) return formatMinutes(p + c);
	return cook ?? prep;
}

export function yieldLabel({ serves, makes }: Recipe['data']) {
	if (makes) return makes;
	if (serves === undefined) return undefined;
	return typeof serves === 'number' ? `Serves ${serves}` : serves;
}

export type Ingredient = { quantity?: string; name: string };

export type RecipeBody = {
	ingredients: Ingredient[];
	steps: string[];
	notes: string[];
};

const QUANTITY =
	/^((?:about\s+)?[\d½¼¾⅓⅔⅛.,/–-]+(?:\s*(?:g|kg|mg|ml|l|tsp|tbsp|cups?|oz|lbs?|pinch(?:es)?|handfuls?|bunch(?:es)?|cloves?|tins?|cans?|sprigs?|slices?))?)\s+(.+)$/i;

function parseIngredient(line: string): Ingredient {
	const bold = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
	if (bold) return { quantity: bold[1], name: bold[2] };
	const match = line.match(QUANTITY);
	if (match) return { quantity: match[1], name: match[2] };
	return { name: line };
}

/**
 * Splits a recipe's Markdown into its `## Ingredients`, `## Method` and `## Notes` sections.
 * Ingredients are `-` list items, method steps are `1.` list items, notes are paragraphs.
 */
export function parseBody(markdown = ''): RecipeBody {
	const sections: Record<string, string[]> = {};
	let current = '';
	for (const line of markdown.split('\n')) {
		const heading = line.match(/^##\s+(.+?)\s*$/);
		if (heading) {
			current = heading[1].toLowerCase();
			sections[current] = [];
		} else if (current) {
			sections[current].push(line);
		}
	}

	const ingredients = (sections.ingredients ?? [])
		.map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1])
		.filter((line): line is string => !!line)
		.map(parseIngredient);

	const steps: string[] = [];
	for (const line of sections.method ?? []) {
		const step = line.match(/^\s*\d+[.)]\s+(.+)$/);
		if (step) steps.push(step[1]);
		else if (line.trim() && steps.length) steps[steps.length - 1] += ` ${line.trim()}`;
	}

	const notes = (sections.notes ?? [])
		.join('\n')
		.split(/\n\s*\n/)
		.map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
		.filter(Boolean);

	return { ingredients, steps, notes };
}

/** Bold, italics, code and links — enough for a recipe line. Escapes everything else. */
export function inline(text: string) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/`(.+?)`/g, '<code>$1</code>')
		.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
}
