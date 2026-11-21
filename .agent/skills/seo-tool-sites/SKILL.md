---
name: seo-tool-sites
description: SEO for a static calculator-tool site. Use when creating landing pages, titles and meta descriptions, structured data, sitemap, robots.txt or internal links for each tool and search term.
---

# SEO for tool sites

Reference: https://developers.google.com/search/docs

## Strategy
- Target specific long-tail searches first (for example "pipe cutting length calculator", "plywood cut list with kerf"). Generic head terms are dominated by big sites.
- One landing page per search intent, each with its own working tool state or preset, not thin duplicate pages. Pages must be genuinely useful and distinct.
- SEO takes months. Do not trade usability for keyword stuffing.

## Per-page requirements
- Unique `<title>` (about 60 characters, keyword first, brand last) and meta description (about 150 characters, says what the tool does).
- One h1 matching the intent, then the tool immediately (tool first). A one-line promise only above the tool. Below it: a short "how to use" (#how-to), assumptions and limits, a few real FAQs, related tools. Keep each page genuinely useful but short; deeper articles live in Help and Guides and are linked.
- Tool-only pages with almost no text rank poorly. Keep the below-tool text real and specific to that page's intent (about 300 to 500 words total), not copied between pages.
- Canonical link, `lang` attribute, Open Graph and Twitter card tags with a proper preview image.
- Structured data (JSON-LD): `SoftwareApplication` or `WebApplication` for the tool, `FAQPage` only when the FAQ is visible on the page, `BreadcrumbList`.
- Descriptive internal links between tools. Clean lowercase URLs with hyphens.
- Images have alt text and explicit dimensions.

## Site-level files
- `sitemap.xml` listing all pages. `robots.txt` pointing to it. Both use the real GitHub Pages URL (or custom domain) and the correct base path.
- 404 page that links back to the tools.
- Optionally verify the site in Google Search Console and submit the sitemap.

## Technical basics for static hosting
- Server-rendered or pre-rendered HTML for content so crawlers see text without running JavaScript. Core Web Vitals in the green (fast load, no layout shift).
- With GitHub Pages project sites, all URLs are under `/repo-name/`. Keep canonical and sitemap URLs consistent with that.

## Content rules
- Plain, accurate language. State limits honestly ("results are an efficient layout, not guaranteed optimal").
- English only at launch. If a language is added later, use proper `hreflang` and real human-checked translations, not machine-dumped text.
- Track what each page targets in a table in plan.txt (page, keyword, status).
