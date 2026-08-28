import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseAllDocuments } from 'yaml';

/**
 * Reads an apidoc/ tree into raw type documents, hashing every source file.
 *
 * The hashes drive incremental regeneration — see manifest.ts. Nothing here
 * interprets the content; that is resolve.ts.
 */

export type RawType = {
  name: string;
  /** Path relative to the apidoc root, e.g. `Titanium/UI/View.yml`. */
  source: string;
  extends?: string;
  /** Everything else, untouched. The apidoc corpus is 15 years of hand-written
   *  YAML and normalising it here would lose information. */
  doc: Record<string, unknown>;
};

export type SourceFile = { path: string; hash: string; types: string[] };

export type LoadResult = {
  types: Map<string, RawType>;
  sources: SourceFile[];
  /** Files that parsed but declared no `name`, or failed outright. */
  problems: { path: string; reason: string }[];
};

const sha256 = (s: string) => `sha256:${createHash('sha256').update(s).digest('hex')}`;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.yml') || entry.endsWith('.yaml')) out.push(full);
  }
  return out;
}

export function loadApiDocs(root: string): LoadResult {
  const types = new Map<string, RawType>();
  const sources: SourceFile[] = [];
  const problems: LoadResult['problems'] = [];

  for (const file of walk(root).sort()) {
    const rel = relative(root, file).split(sep).join('/');
    const text = readFileSync(file, 'utf8');
    const declared: string[] = [];

    let docs;
    try {
      // Multi-document: many apidoc files declare several types separated by ---
      docs = parseAllDocuments(text);
    } catch (err) {
      problems.push({ path: rel, reason: `parse failed: ${(err as Error).message}` });
      continue;
    }

    for (const doc of docs) {
      if (doc.errors.length) {
        problems.push({ path: rel, reason: doc.errors[0].message });
        continue;
      }
      const value = doc.toJS() as Record<string, unknown> | null;
      if (!value || typeof value !== 'object') continue;

      const name = value.name;
      if (typeof name !== 'string' || !name) {
        problems.push({ path: rel, reason: 'document has no `name`' });
        continue;
      }

      if (types.has(name)) {
        problems.push({ path: rel, reason: `duplicate type ${name}` });
        continue;
      }

      declared.push(name);
      types.set(name, {
        name,
        source: rel,
        extends: typeof value.extends === 'string' ? value.extends : undefined,
        doc: value,
      });
    }

    sources.push({ path: rel, hash: sha256(text), types: declared });
  }

  return { types, sources, problems };
}
