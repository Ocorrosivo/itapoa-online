/** Compare the source asset, not CDN resizing/quality variants of the same image. */
export function imageIdentity(source: string): string {
  try {
    const url = new URL(source, 'https://itapoa.online');
    for (const key of ['auto', 'fit', 'w', 'h', 'q', 'dpr', 'crop', 'ixlib', 'width', 'height', 'quality']) {
      url.searchParams.delete(key);
    }
    url.hash = '';
    url.searchParams.sort();
    return url.href;
  } catch { return source.trim(); }
}
