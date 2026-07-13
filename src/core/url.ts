export type TrailingSlash = 'always' | 'never' | 'preserve';

/**
 * Convert a content file's path (relative to the content directory) to a site
 * pathname: strip the extension and collapse `index` files to their directory.
 *
 *   index.md            -> /
 *   features/audit.mdx  -> /features/audit
 *   guide/index.md      -> /guide
 */
export function contentFileToPathname(relativePath: string): string {
  const p = relativePath
    .replace(/\.(md|mdx|html)$/i, '')
    .replace(/(^|\/)index$/i, '')
    .replace(/^\/+/, '');
  return p ? `/${p}` : '/';
}

/**
 * Build an absolute page URL from a base URL and a pathname, applying the
 * trailing-slash policy:
 *   - 'preserve' (default): keep the pathname's own trailing slash
 *   - 'always': force a trailing slash
 *   - 'never': strip any trailing slash
 * The site root maps to the bare base URL, or to `base + '/'` when 'always'.
 */
export function buildPageUrl(baseUrl: string, pathname: string, trailingSlash: TrailingSlash = 'preserve'): string {
  const base = baseUrl.replace(/\/+$/, '');

  if (pathname === '/' || pathname === '') {
    return trailingSlash === 'always' ? `${base}/` : base;
  }

  let path = `/${pathname.replace(/^\/+/, '')}`;
  if (trailingSlash === 'always') path = `${path.replace(/\/+$/, '')}/`;
  else if (trailingSlash === 'never') path = path.replace(/\/+$/, '');
  // 'preserve': leave the trailing slash exactly as provided

  return base + path;
}
