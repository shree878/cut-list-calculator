/**
 * base.ts — base-path helper
 * Returns the Astro base path prepended to a site-root-relative path.
 * Always use this for hrefs and src attributes so the site works both
 * on GitHub Pages (/cut-list-calculator/) and locally (/).
 *
 * Usage:  import { base } from '../lib/base';
 *         <a href={base('/about')}>About</a>
 */

const BASE = import.meta.env.BASE_URL ?? '/';

/**
 * Prepend the Astro base URL to a root-relative path.
 * @param path  Must start with '/'.
 */
export function base(path: string): string {
  // BASE_URL ends with '/' in Astro static builds.
  // path starts with '/', so strip the leading slash to avoid double '/'.
  return BASE.replace(/\/$/, '') + path;
}
