/** Resolve a public asset path for GitHub Pages subpath (`/Benchmark-Hub/`) or local `/`. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
