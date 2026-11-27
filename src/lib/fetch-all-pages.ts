/** Rows per request; Supabase caps a response at 1,000 rows by default. */
export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: unknown };

/**
 * Reads every row of a query page by page. `page(from, to)` must return the query
 * with a stable order and `.range(from, to)` applied.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
