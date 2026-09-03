import { anchorAllocator } from '../src/lib/docs/links.ts';
import { apiIndexAt, apiTypeAt, latestSdkVersion } from '../src/lib/docs/registry.ts';
import { viewOf } from '../src/lib/docs/type-view.ts';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync } from 'node:zlib';

/**
 * The symbol payload behind the exact-name lookup (TI-70).
 *
 * Pagefind ranks pages, and TI-46 measured the two failures that follow from
 * that — both of them the most common shapes of query on an API reference:
 * `addEventListener` returns 205 results and nothing relevant, because every
 * proxy inherits it; and Pagefind has no typo tolerance at all, so
 * `creatWindow` returns nothing useful. Neither is fixable by tuning the index.
 *
 * So symbol matching is done separately, in the browser, against every name in
 * the corpus. Names are small — this is a list of identifiers, not of prose —
 * which is what makes shipping all of them viable.
 *
 * ## Shape
 *
 *   { sdk, t: [[type, [member, ...]], ...], m: [[moduleId, [type, ...]], ...] }
 *
 * Hrefs are derived rather than stored, since they are mechanical: a type is
 * `/docs/sdk/<sdk>/<name>`, a member is that plus `#<anchor>`. The anchor is
 * usually the member's name, so it is written bare; where it is not — Window
 * has a method `open()` and an event `open`, and 41 types collide this way —
 * the member is written `name>anchor`. One character of overhead, only where
 * the collision is real.
 *
 * Scoped to the latest SDK release and each module's latest released version.
 * The SDK is 96% of the corpus, so indexing every compiled version would
 * roughly triple this for symbols nobody searches by version.
 *
 *   node scripts/generate-symbol-index.ts
 */

const OUT = join(process.cwd(), 'public/symbols.json');
/** Past this the payload stops being something to ship to every visitor. */
const BUDGET_BROTLI = 40 * 1024;

const version = latestSdkVersion();
if (!version) throw new Error('no SDK version in the registry; nothing to index');

const sdkDir = join(process.cwd(), 'registry/sdk', version);
const index = apiIndexAt(sdkDir);
if (!index) throw new Error(`no API index at registry/sdk/${version}`);

const types: [string, string[]][] = [];
let memberCount = 0;

for (const entry of index.types) {
  const type = apiTypeAt(sdkDir, entry.name);
  if (!type) continue;

  const view = viewOf((name) => apiTypeAt(sdkDir, name), type);
  const groups = [view.properties, view.methods, view.events];
  const anchor = anchorAllocator(groups, ['property', 'method', 'event']);

  const members: string[] = [];
  for (const group of groups) {
    // Declared only. Indexing the inherited copies is what makes
    // `addEventListener` useless in the first place — it would put the same
    // name on 200 types here too, and the whole point is to answer with one.
    for (const member of group.filter((m) => !m.inheritedFrom)) {
      const id = anchor(member);
      members.push(id === member.name ? member.name : `${member.name}>${id}`);
      memberCount++;
    }
  }
  types.push([entry.name, members]);
}

const modules: [string, string[]][] = [];
const MODULES = join(process.cwd(), 'registry/modules');
for (const id of readdirSync(MODULES)) {
  const dir = join(MODULES, id);
  if (!statSync(dir).isDirectory()) continue;
  const descriptor = join(dir, 'index.json');
  if (!existsSync(descriptor)) continue;

  const meta = JSON.parse(readFileSync(descriptor, 'utf8')) as { latest?: Record<string, string> };
  const names = new Set<string>();
  // Latest released version per platform. `main` is the unreleased tree and is
  // left out: search should return what someone can install (TI-46).
  for (const released of new Set(Object.values(meta.latest ?? {}).map(String))) {
    for (const entry of apiIndexAt(join(dir, released))?.types ?? []) names.add(entry.name);
  }
  if (names.size) modules.push([id, [...names].sort()]);
}

const payload = { sdk: version, t: types, m: modules };
const body = JSON.stringify(payload);
const compressed = brotliCompressSync(Buffer.from(body)).length;

mkdirSync(join(process.cwd(), 'public'), { recursive: true });
writeFileSync(OUT, body);

// +1 per module for the id itself, which the table adds when it flattens.
const symbols = types.length + memberCount + modules.reduce((n, [, ns]) => n + ns.length + 1, 0);
console.log(
  `symbols: ${symbols} (${types.length} SDK types, ${memberCount} members, ` +
    `${modules.reduce((n, [, ns]) => n + ns.length, 0)} module types across ${modules.length} modules)\n` +
    `  ${(body.length / 1024).toFixed(0)} KB raw, ${(compressed / 1024).toFixed(1)} KB brotli -> public/symbols.json`
);

if (compressed > BUDGET_BROTLI) {
  console.error(
    `\nover budget: ${(compressed / 1024).toFixed(1)} KB brotli against ${BUDGET_BROTLI / 1024} KB.\n` +
      'Every visitor who opens search downloads this. Narrow what goes in, or\n' +
      'record in TI-70 why the budget moved.'
  );
  process.exit(1);
}
