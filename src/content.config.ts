import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const recipes = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './recipes' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		prep: z.string().optional(),
		cook: z.string().optional(),
		// Total time shown on cards. Worked out from prep + cook when left out.
		time: z.string().optional(),
		serves: z.union([z.number(), z.string()]).optional(),
		// Use instead of `serves` for things like "1 loaf" or "12 cookies".
		makes: z.string().optional(),
		featured: z.boolean().default(false),
	}),
});

export const collections = { recipes };
