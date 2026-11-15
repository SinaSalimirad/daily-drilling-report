import { z } from 'zod';

// Building blocks shared by API routes and web forms (docs/04-api-conventions.md).
// zod inside Elysia does not coerce, so query schemas use z.coerce.

/** UUID primary key. */
export const idSchema = z.uuid();

/** Report date: Gregorian `YYYY-MM-DD` on the wire (docs/04, "Data formats"). */
export const reportDateSchema = z.iso.date();

/** `page` (from 1) and `pageSize` (default 20, maximum 100). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type Sort<F extends string> = { field: F; direction: 'asc' | 'desc' };

/** `sort=field:asc|desc`; only the fields a route declares are accepted. */
export function sortSchema<const F extends readonly [string, ...string[]]>(fields: F) {
  const field = z.enum(fields);
  return z
    .string()
    .regex(/^[A-Za-z]+:(asc|desc)$/, 'Use field:asc or field:desc')
    .transform((value, ctx): Sort<F[number]> | typeof z.NEVER => {
      const [name, direction] = value.split(':') as [string, 'asc' | 'desc'];
      const parsed = field.safeParse(name);
      if (!parsed.success) {
        ctx.addIssue({ code: 'custom', message: `Sort by one of: ${fields.join(', ')}` });
        return z.NEVER;
      }
      return { field: parsed.data, direction };
    });
}
