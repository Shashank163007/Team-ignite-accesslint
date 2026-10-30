import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, sep } from 'node:path';

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const decodeEntities = (text) => text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, name) => {
  if (!name.startsWith('#')) {
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[name.toLowerCase()];
  }
  const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
});

/** Discover static HTML, anchor links and local sitemap URLs; no browser page is needed. */
export async function discoverPages({ rootDir, baseUrl, maxPages = 50, onError } = {}) {
  const report = async (page, message) => {
    const error = { stage: 'discovery', page, message };
    try {
      if (typeof onError === 'function') await onError(error);
      else console.error('[accesslint:discovery]', error);
    } catch (callbackError) {
      console.error('[accesslint:discovery]', error, callbackError);
    }
  };
  let base;
  let root;
  try {
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500) {
      throw new Error('maxPages must be an integer between 1 and 500');
    }
    base = new URL(baseUrl);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
      throw new Error('baseUrl must be an HTTP(S) URL without credentials');
    }
    if (typeof rootDir !== 'string' || !rootDir.trim()) throw new Error('rootDir must be a directory path');
    root = await realpath(rootDir);
    if (!(await stat(root)).isDirectory()) throw new Error('rootDir must be a directory');
  } catch (error) {
    await report('', error.message);
    return [];
  }
  const candidates = new Set();
  let skipped = 0;
  const insideRoot = (file) => {
    const path = relative(root, file);
    return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
  };
  const add = async (value, source) => {
    try {
      const href = decodeEntities(value.trim());
      const decoded = decodeURIComponent(href);
      if (/[\x00-\x1f\x7f\\]/.test(decoded)) throw new Error('Malformed URL');
      if (decoded.startsWith('/') && decoded.split('/').includes('..')) {
        throw new Error('Skipped absolute path traversal');
      }
      const url = new URL(href, new URL(source, base.origin));
      if (url.origin !== base.origin || url.username || url.password) {
        throw new Error('Skipped URL outside the scan origin or with credentials');
      }
      const extension = extname(url.pathname).toLowerCase();
      if (extension && !['.html', '.htm'].includes(extension)) {
        throw new Error('Skipped non-HTML asset link');
      }
      // Strip queries/fragments and collapse directory index aliases before deduplication.
      const pathname = url.pathname.replace(/\/index\.html?$/i, '/');
      candidates.add(pathname);
    } catch {
      skipped++;
    }
  };
  let entriesSeen = 0;
  let limitReported = false;
  const walk = async (directory, urlDirectory = '/') => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      await report(urlDirectory, error.message);
      return;
    }
    entries.sort((a, b) => compare(a.name, b.name));
    for (const entry of entries) {
      // Bound filesystem work independently of the final page count.
      if (++entriesSeen > 10_000) {
        if (!limitReported) await report(urlDirectory, 'Skipped remaining entries: discovery limit of 10000 reached');
        limitReported = true;
        return;
      }
      const pathname = `${urlDirectory}${encodeURIComponent(entry.name)}`;
      const file = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        skipped++;
        continue;
      }
      if (entry.isDirectory()) {
        await walk(file, `${pathname}/`);
        continue;
      }
      if (!entry.isFile()) continue;
      const html = /\.html?$/i.test(entry.name);
      const sitemap = /\.xml$/i.test(entry.name);
      if (!html && !sitemap) continue;
      if (html) await add(pathname, pathname);
      try {
        if ((await stat(file)).size > 2 * 1024 * 1024) {
          await report(pathname, 'Skipped link extraction: file exceeds 2 MiB');
          continue;
        }
        const text = await readFile(file, 'utf8');
        if (html) {
          // Static extraction only: ignore comments/scripts; this is not an HTML renderer.
          const markup = text.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
          const hrefOf = (tag) => {
            const attributes = tag.replace(/^<\w+\b/, '');
            for (const match of attributes.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
              if (match[1].toLowerCase() === 'href') return match[2] ?? match[3] ?? match[4] ?? '';
            }
          };
          let linkBase = pathname;
          const baseTag = markup.match(/<base\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/i)?.[0];
          const baseHref = baseTag && hrefOf(baseTag);
          if (baseHref !== undefined) linkBase = new URL(decodeEntities(baseHref), new URL(pathname, base.origin)).href;
          for (const tag of markup.matchAll(/<(?:a|area)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
            const href = hrefOf(tag[0]);
            if (href !== undefined) await add(href, linkBase);
          }
        } else if (/<(?:\w+:)?urlset\b/i.test(text)) {
          for (const match of text.matchAll(/<(?:\w+:)?loc\b[^>]*>([\s\S]*?)<\/(?:\w+:)?loc\s*>/gi)) {
            await add(match[1].trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1'), pathname);
          }
        } else if (/<(?:\w+:)?sitemapindex\b/i.test(text)) {
          skipped++;
        }
      } catch (error) {
        await report(pathname, error.message);
      }
    }
  };
  await walk(root);
  const valid = new Set();
  for (const pathname of candidates) {
    try {
      let file = join(root, decodeURIComponent(pathname));
      if (!insideRoot(file)) {
        skipped++;
        continue;
      }
      file = await realpath(file);
      if (!insideRoot(file)) {
        skipped++;
        continue;
      }
      const info = await stat(file);
      let canonical = pathname;
      if (info.isDirectory()) {
        file = await realpath(join(file, 'index.html'));
        canonical = pathname.endsWith('/') ? pathname : `${pathname}/`;
      } else if (!/\.html?$/i.test(pathname)) {
        skipped++;
        continue;
      }
      // Check again after resolving the directory index: it may itself be a symlink.
      if (!insideRoot(file) || !(await stat(file)).isFile()) {
        skipped++;
        continue;
      }
      valid.add(canonical);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) skipped++;
      else await report(pathname, error.message);
    }
  }
  const sorted = [...valid].sort(compare);
  for (const pathname of sorted.slice(maxPages)) {
    await report(pathname, `Skipped page: maxPages limit of ${maxPages} reached`);
  }
  if (skipped > 0) await report('', `Skipped ${skipped} links that are not scannable local pages`);
  return sorted.slice(0, maxPages);
}
