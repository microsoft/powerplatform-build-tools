// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Resolves open npm advisories into concrete fixes, and checks that those fixes reach the lock file.
 *
 * Most vulnerabilities in this repo are transitive, so they can only be pinned through
 * npm `overrides`. Dependabot does not understand `overrides`, which is why those alerts
 * are re-raised by S360/Component Governance every week and have to be fixed by hand.
 *
 * Bundled copies need extra care. Everything reachable from `bundleDependencies` is marked
 * `inBundle` in package-lock.json, and npm never re-resolves those entries: an override that
 * should move one of them is accepted, `npm ci` stays green, and the old version still ships.
 * So this script patches bundled lock entries itself, and `--check` fails when an override is
 * not reflected in the lock.
 *
 * Flow (`--write`):
 *   1. `npm audit --json` to find which packages are flagged and by which advisories.
 *   2. Resolve each GHSA against the GitHub Advisory DB for its real `first_patched_version`.
 *   3. Compare against every installed copy in package-lock.json.
 *   4. Raise the matching `overrides` range when the patched version is actually published.
 *      A package that is declared in package.json *and* bundled is pinned to an exact version:
 *      with a range, `npm ci` fails with EUSAGE as soon as a newer matching version is
 *      published, because npm resolves the range but will not touch the bundled lock entry.
 *   5. Patch bundled lock entries in place, when the patched version stays on the same major
 *      line and its own dependencies are already satisfied by the tree.
 *
 * `--check` reads only package.json and package-lock.json, and fails when:
 *   - a lock entry does not satisfy an override that applies to it,
 *   - a bundled package declared in package.json is overridden with a range,
 *   - a production dependency is forced onto another major line than its parent declares,
 *     unless KNOWN_FORCED_MAJORS says why that is safe.
 * Dev-only dependencies forced onto another major line are reported as warnings.
 *
 * Anything that cannot be fixed automatically is reported instead of guessed at:
 *   - advisories with no patched version,
 *   - advisories whose patched version is not published on the registry yet,
 *   - packages installed across several major lines, which need a nested override,
 *   - bundled copies whose fix is on another major line or needs dependencies the tree lacks.
 *
 * Usage:
 *   node scripts/audit-overrides.js           # report only, exits 0
 *   node scripts/audit-overrides.js --write   # apply changes to package.json and package-lock.json
 *   node scripts/audit-overrides.js --check   # verify the lock file, exits 1 on problems
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const semver = require('semver');

const REPO_ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(REPO_ROOT, 'package.json');
const LOCK_PATH = path.join(REPO_ROOT, 'package-lock.json');

// Advisories we knowingly carry. Keep in sync with the "Accepted risk" section of the PR template.
const ACCEPTED_RISKS = {
  'GHSA-848j-6mx2-7j84': 'elliptic - dev-only (rewiremock -> node-libs-browser -> crypto-browserify), no patched version published',
};

// Production dependencies deliberately resolved on another major line than their parent declares,
// keyed "parent > dependency". Anything else forced across a major line fails `--check`.
const KNOWN_FORCED_MAJORS = {
  'azure-pipelines-task-lib > adm-zip':
    'task-lib declares adm-zip ^0.5.10 but never requires it; the 0.6 line carries the CVE fixes',
};

// Key order npm uses when it writes package-lock.json (json-stringify-nice with these keys first).
const LOCK_KEY_ORDER = ['name', 'version', 'lockfileVersion', 'resolved', 'integrity', 'requires', 'packages', 'dependencies'];

/**
 * Quote a single argument for the Windows command line.
 *
 * Backslashes are only special immediately before a quote (or at the end of the argument,
 * where they would otherwise escape the closing quote), so those runs are doubled and the
 * quote itself is escaped. Escaping the quote alone would leave `foo\` able to break out.
 */
function quoteWinArg(value) {
  const escaped = String(value)
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\*)$/, '$1$1');
  return `"${escaped}"`;
}

function run(cmd, args) {
  // On Windows npm/gh are .cmd shims, which Node refuses to spawn without a shell.
  // Every argument here is repo-controlled (package names, advisory ids), but quote
  // them anyway so a shell never re-splits or interprets them.
  const useShell = process.platform === 'win32';
  const res = useShell
    ? spawnSync(`${cmd} ${args.map(quoteWinArg).join(' ')}`, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        shell: true,
        maxBuffer: 64 * 1024 * 1024,
      })
    : spawnSync(cmd, args, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
  return res.stdout || '';
}

/** `npm audit` exits non-zero when it finds anything, so the exit code is deliberately ignored. */
function readAudit() {
  let failure = 'npm audit produced no JSON output';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},15000)']);
    const raw = run('npm', ['audit', '--json']);
    const start = raw.indexOf('{');
    if (start < 0) continue;
    const audit = JSON.parse(raw.slice(start));
    // When the registry's audit endpoint fails, npm still prints JSON - an error object with no
    // `vulnerabilities`. Reading that as "nothing to fix" would pass silently, so retry and then stop.
    if (audit.vulnerabilities) return audit;
    failure = `npm audit failed: ${audit.message || (audit.error && audit.error.summary) || 'no vulnerabilities in its output'}`;
  }
  throw new Error(failure);
}

/** Walks the `via` graph and returns every GHSA id npm reported, keyed by package name. */
function collectAdvisories(audit) {
  const byPackage = new Map();
  for (const vuln of Object.values(audit.vulnerabilities || {})) {
    for (const via of vuln.via || []) {
      if (typeof via === 'string' || !via.url) continue;
      const ghsa = (via.url.match(/GHSA-[\w-]+/) || [])[0];
      if (!ghsa) continue;
      const pkg = via.name || vuln.name;
      if (!byPackage.has(pkg)) byPackage.set(pkg, new Set());
      byPackage.get(pkg).add(ghsa);
    }
  }
  return byPackage;
}

const advisoryCache = new Map();

/**
 * The unauthenticated Advisory API is rate limited to 60 requests/hour, which this script
 * blows through easily, so a token is used whenever one is available. Results are cached
 * because the same GHSA is normally reported against several installed copies.
 */
function fetchAdvisory(ghsa) {
  if (advisoryCache.has(ghsa)) return advisoryCache.get(ghsa);

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || run('gh', ['auth', 'token']).trim();
  const args = ['-sS', `https://api.github.com/advisories/${ghsa}`, '-H', 'Accept: application/vnd.github+json'];
  if (token) args.push('-H', `Authorization: Bearer ${token}`);

  let result = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = run('curl', args);
    try {
      const json = JSON.parse(raw);
      if (json && json.ghsa_id) {
        result = json;
        break;
      }
      // A rate-limit or transient 5xx comes back as a message body rather than an advisory.
      if (!json || !/rate limit|abuse|secondary/i.test(json.message || '')) break;
    } catch {
      // fall through to retry
    }
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},2000)']);
  }

  advisoryCache.set(ghsa, result);
  return result;
}

/**
 * The Advisory DB writes bounded ranges as `>= 1.16.0, < 1.16.1`. node-semver rejects the comma,
 * and `satisfies` then quietly returns false, which hid every advisory with an upper bound.
 */
function toSemverRange(advisoryRange) {
  return String(advisoryRange).replace(/\s*,\s*/g, ' ').trim();
}

/** Versions actually published on whichever registry npm is pointed at. */
function publishedVersions(pkg, cache) {
  if (!cache.has(pkg)) {
    const raw = run('npm', ['view', pkg, 'versions', '--json']);
    try {
      const parsed = JSON.parse(raw);
      cache.set(pkg, Array.isArray(parsed) ? parsed : [parsed]);
    } catch {
      cache.set(pkg, []);
    }
  }
  return cache.get(pkg);
}

/** Full manifest of one published version, as the registry reports it. */
function fetchManifest(pkg, version) {
  const raw = run('npm', ['view', `${pkg}@${version}`, '--json']);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
  } catch {
    return null;
  }
}

function readJsonFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return { data: JSON.parse(raw), eol: raw.includes('\r\n') ? '\r\n' : '\n' };
}

function writeJsonFile(file, data, eol) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`.replace(/\n/g, eol));
}

/** Package name of a lock entry, e.g. `node_modules/a/node_modules/@scope/b` -> `@scope/b`. */
function nameFromLockPath(lockPath) {
  const idx = lockPath.lastIndexOf('node_modules/');
  return idx < 0 ? '' : lockPath.slice(idx + 'node_modules/'.length);
}

/** Every installed copy of `pkg`, from the lock file. */
function installedCopies(lock, pkg) {
  return Object.entries(lock.packages || {})
    .filter(([p, meta]) => p && !meta.link && meta.version && nameFromLockPath(p) === pkg)
    .map(([p, meta]) => ({ path: p, version: meta.version, inBundle: !!meta.inBundle, dev: !!meta.dev }));
}

/** The lock entry Node would load when the package at `fromPath` requires `name`. */
function resolveFrom(lock, fromPath, name) {
  let base = fromPath;
  for (;;) {
    const candidate = `${base ? `${base}/` : ''}node_modules/${name}`;
    if (lock.packages[candidate]) return candidate;
    if (!base) return null;
    const idx = base.lastIndexOf('/node_modules/');
    base = idx < 0 ? '' : base.slice(0, idx);
  }
}

/**
 * Bundled entries of this repo are installed from the registry like any other dependency, so
 * patching them in the lock file works. Entries bundled inside a dependency's own tarball are
 * extracted from that tarball instead, and only upgrading that dependency changes them.
 */
function isPatchableBundledCopy(lock, lockPath) {
  if (!lock.packages[lockPath] || !lock.packages[lockPath].inBundle) return false;
  return !Object.entries(lock.packages).some(
    ([p, meta]) => p && Array.isArray(meta.bundleDependencies) && meta.bundleDependencies.length > 0 &&
      lockPath.startsWith(`${p}/node_modules/`)
  );
}

/** `foo`, `foo@^1`, `@scope/foo`, `@scope/foo@^1` -> `{ name, spec }`. */
function parseOverrideKey(key) {
  const at = key.indexOf('@', key.startsWith('@') ? 1 : 0);
  return at < 0 ? { name: key, spec: null } : { name: key.slice(0, at), spec: key.slice(at + 1) || null };
}

/** One rule per overridden package. Only the immediate parent of a nested override is tracked. */
function overrideRules(overrides, rootDeps) {
  const rules = [];
  const resolveValue = (value) => (value.startsWith('$') ? rootDeps[value.slice(1)] : value);
  const walk = (obj, parent) => {
    for (const [key, value] of Object.entries(obj || {})) {
      if (key === '.') continue;
      const { name, spec } = parseOverrideKey(key);
      if (typeof value === 'string') {
        rules.push({ name, spec, range: resolveValue(value), parent });
      } else if (value && typeof value === 'object') {
        if (typeof value['.'] === 'string') rules.push({ name, spec, range: resolveValue(value['.']), parent });
        walk(value, { name, spec });
      }
    }
  };
  walk(overrides, null);
  return rules.filter((r) => r.range && semver.validRange(r.range));
}

function matchesSpec(version, spec) {
  return !spec || semver.satisfies(version, spec, { includePrerelease: true });
}

function declaredDeps(meta) {
  return { ...(meta.dependencies || {}), ...(meta.optionalDependencies || {}), ...(meta.peerDependencies || {}) };
}

/** Lock entries that an override applies to but that do not satisfy it. */
function findIneffectiveOverrides(pkgJson, lock) {
  const rootDeps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
  const rules = overrideRules(pkgJson.overrides, rootDeps);
  const problems = [];
  const coveredByNested = new Map();
  const report = (lockPath, rule, label) => {
    const meta = lock.packages[lockPath];
    if (!matchesSpec(meta.version, rule.spec)) return;
    if (semver.satisfies(meta.version, rule.range, { includePrerelease: true })) return;
    problems.push({ path: lockPath, name: rule.name, version: meta.version, range: rule.range, inBundle: !!meta.inBundle, rule: label });
  };

  for (const rule of rules.filter((r) => r.parent)) {
    const label = `${rule.parent.name}${rule.parent.spec ? `@${rule.parent.spec}` : ''} > ${rule.name}`;
    const children = new Set();
    for (const parent of installedCopies(lock, rule.parent.name)) {
      if (!matchesSpec(parent.version, rule.parent.spec)) continue;
      if (!(rule.name in declaredDeps(lock.packages[parent.path]))) continue;
      const at = resolveFrom(lock, parent.path, rule.name);
      if (at) children.add(at);
    }
    if (!coveredByNested.has(rule.name)) coveredByNested.set(rule.name, new Set());
    for (const at of children) {
      coveredByNested.get(rule.name).add(at);
      report(at, rule, label);
    }
  }

  for (const rule of rules.filter((r) => !r.parent)) {
    const covered = coveredByNested.get(rule.name) || new Set();
    for (const copy of installedCopies(lock, rule.name)) {
      if (!covered.has(copy.path)) report(copy.path, rule, `${rule.name}${rule.spec ? `@${rule.spec}` : ''}`);
    }
  }
  return problems;
}

/**
 * Bundled packages that are also declared in package.json and overridden with a range. npm
 * resolves that range against the registry, but never re-resolves the bundled lock entry, so
 * `npm ci` fails with EUSAGE as soon as a newer matching version is published.
 */
function findDriftProneOverrides(pkgJson, lock) {
  const declared = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
  const found = [];
  for (const [key, value] of Object.entries(pkgJson.overrides || {})) {
    if (typeof value !== 'string') continue;
    const { name } = parseOverrideKey(key);
    if (!(name in declared)) continue;
    const node = lock.packages[`node_modules/${name}`];
    if (!node || !node.inBundle) continue;
    const effective = value.startsWith('$') ? declared[value.slice(1)] : value;
    if (semver.valid(effective)) continue;
    found.push({ name, range: effective, version: node.version });
  }
  return found;
}

/** True when `version` sits on another major line than `range` asks for (minor line for 0.x). */
function crossesMajor(version, range) {
  const min = semver.minVersion(range);
  const v = semver.parse(version);
  if (!min || !v) return false;
  if (v.major !== min.major) return true;
  return v.major === 0 && v.minor !== min.minor;
}

/** Dependencies resolved outside the range their parent declares, onto another major line. */
function findForcedMajors(lock) {
  const found = [];
  for (const [lockPath, meta] of Object.entries(lock.packages || {})) {
    if (!lockPath || meta.link) continue;
    const parent = nameFromLockPath(lockPath);
    for (const field of ['dependencies', 'optionalDependencies']) {
      for (const [name, range] of Object.entries(meta[field] || {})) {
        if (!semver.validRange(range)) continue;
        const at = resolveFrom(lock, lockPath, name);
        const dep = at && lock.packages[at];
        if (!dep || !dep.version) continue;
        if (semver.satisfies(dep.version, range, { includePrerelease: true }) || !crossesMajor(dep.version, range)) continue;
        found.push({ key: `${parent} > ${name}`, parentPath: lockPath, path: at, range, version: dep.version, dev: !!(meta.dev || meta.devOptional) });
      }
    }
  }
  return found;
}

/** Same ordering json-stringify-nice gives package-lock.json: scalars, then objects, preferred keys first. */
function lockOrder(value) {
  if (Array.isArray(value)) return value.map(lockOrder);
  if (!value || typeof value !== 'object') return value;
  const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const compare = (a, b) => {
    const ia = LOCK_KEY_ORDER.indexOf(a);
    const ib = LOCK_KEY_ORDER.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, 'en');
  };
  const keys = Object.keys(value);
  const scalars = keys.filter((k) => !isObject(value[k])).sort(compare);
  const objects = keys.filter((k) => isObject(value[k])).sort(compare);
  return Object.fromEntries([...scalars, ...objects].map((k) => [k, lockOrder(value[k])]));
}

/** npm stores `bin` as an object with paths relative to the package root. */
function normalizeBin(name, bin) {
  if (!bin) return undefined;
  const entries = typeof bin === 'string' ? [[name.replace(/^@[^/]+\//, ''), bin]] : Object.entries(bin);
  return Object.fromEntries(entries.map(([k, v]) => [k, String(v).replace(/^\.\//, '')]));
}

/**
 * Builds the lock entry for a bundled copy moved to `manifest.version`, or explains why it
 * cannot be patched in place. The new version's dependencies must already be satisfied by the
 * entries Node would resolve from that location; otherwise the tree itself has to change.
 */
function planBundledPatch(lock, lockPath, manifest) {
  const current = lock.packages[lockPath];
  const dist = manifest && manifest.dist;
  if (!current || !dist || !dist.tarball) {
    return { ok: false, reason: 'registry metadata has no tarball' };
  }
  if (!dist.integrity || !dist.integrity.startsWith('sha512-')) {
    return { ok: false, reason: `registry metadata for ${manifest.version} has no sha512 integrity` };
  }
  for (const field of ['dependencies', 'optionalDependencies']) {
    for (const [dep, range] of Object.entries(manifest[field] || {})) {
      const at = resolveFrom(lock, lockPath, dep);
      if (!at) {
        if (field === 'optionalDependencies') continue;
        return { ok: false, reason: `${manifest.version} needs ${dep}@${range}, which the tree does not provide there` };
      }
      const have = lock.packages[at].version;
      if (semver.validRange(range) && !semver.satisfies(have, range, { includePrerelease: true })) {
        return { ok: false, reason: `${manifest.version} needs ${dep}@${range}, but ${at} is ${have}` };
      }
    }
  }

  const entry = { version: manifest.version, resolved: dist.tarball, integrity: dist.integrity };
  for (const flag of ['dev', 'optional', 'devOptional', 'peer', 'inBundle', 'extraneous']) {
    if (current[flag]) entry[flag] = current[flag];
  }
  const scripts = manifest.scripts || {};
  if (manifest.hasInstallScript || scripts.preinstall || scripts.install || scripts.postinstall) entry.hasInstallScript = true;
  const fields = {
    license: typeof manifest.license === 'object' && manifest.license ? manifest.license.type : manifest.license,
    deprecated: manifest.deprecated,
    funding: manifest.funding,
    bin: normalizeBin(manifest.name || nameFromLockPath(lockPath), manifest.bin),
    engines: manifest.engines,
    os: manifest.os,
    cpu: manifest.cpu,
    dependencies: manifest.dependencies,
    optionalDependencies: manifest.optionalDependencies,
    peerDependencies: manifest.peerDependencies,
    peerDependenciesMeta: manifest.peerDependenciesMeta,
  };
  for (const [key, value] of Object.entries(fields)) {
    const empty = value === undefined || value === null || (typeof value === 'object' && Object.keys(value).length === 0);
    if (!empty) entry[key] = value;
  }
  return { ok: true, entry: lockOrder(entry) };
}

/** Everything `--check` verifies. Reads only package.json and package-lock.json. */
function checkLock(pkgJson, lock, knownForcedMajors = KNOWN_FORCED_MAJORS) {
  const ineffective = findIneffectiveOverrides(pkgJson, lock);
  const driftProne = findDriftProneOverrides(pkgJson, lock);
  const forced = findForcedMajors(lock);
  const prodForced = forced.filter((f) => !f.dev);
  const unexplained = prodForced.filter((f) => !knownForcedMajors[f.key]);
  const explained = prodForced.filter((f) => knownForcedMajors[f.key]);
  const devForced = forced.filter((f) => f.dev);
  const staleAllowances = Object.keys(knownForcedMajors).filter((k) => !prodForced.some((f) => f.key === k));
  return {
    ok: ineffective.length === 0 && driftProne.length === 0 && unexplained.length === 0,
    ineffective,
    driftProne,
    unexplained,
    explained,
    devForced,
    staleAllowances,
  };
}

function formatCheck(result, knownForcedMajors = KNOWN_FORCED_MAJORS) {
  const lines = ['## Lock file check', ''];
  const section = (title, items) => {
    lines.push(`### ${title}`, '');
    if (items.length === 0) lines.push('- none');
    lines.push(...items, '');
  };
  section(
    'Overrides not reflected in package-lock.json',
    result.ineffective.map((p) =>
      `- \`${p.name}@${p.version}\` at \`${p.path}\` does not satisfy override \`${p.rule}: ${p.range}\`` +
      (p.inBundle ? ' - bundled entry, npm never re-resolves it: run `node scripts/audit-overrides.js --write` or patch the lock entry' : ' - run `npm install`')
    )
  );
  section(
    'Bundled packages overridden with a range',
    result.driftProne.map((d) =>
      `- \`${d.name}\`: \`${d.range}\` - pin it to \`${d.version}\` in both the dependency and the override, or \`npm ci\` fails as soon as a newer matching version is published`
    )
  );
  section(
    'Production dependencies forced onto another major line',
    [
      ...result.unexplained.map((f) => `- \`${f.key}\`: declares \`${f.range}\`, gets \`${f.version}\` - verify the API is compatible, then add it to KNOWN_FORCED_MAJORS with the reason`),
      ...result.explained.map((f) => `- \`${f.key}\`: declares \`${f.range}\`, gets \`${f.version}\` (allowed: ${knownForcedMajors[f.key]})`),
    ]
  );
  section(
    'Dev dependencies forced onto another major line (warning only)',
    result.devForced.map((f) => `- \`${f.key}\`: declares \`${f.range}\`, gets \`${f.version}\``)
  );
  if (result.staleAllowances.length > 0) {
    section('KNOWN_FORCED_MAJORS entries that no longer apply', result.staleAllowances.map((k) => `- \`${k}\``));
  }
  lines.push(result.ok ? 'Lock file check passed.' : 'Lock file check FAILED.');
  return lines.join('\n');
}

function main(argv) {
  const write = argv.includes('--write');
  const pkgFile = readJsonFile(PKG_PATH);
  const lockFile = readJsonFile(LOCK_PATH);
  const pkgJson = pkgFile.data;
  const lock = lockFile.data;

  if (argv.includes('--check')) {
    const result = checkLock(pkgJson, lock);
    console.log(formatCheck(result));
    return result.ok ? 0 : 1;
  }

  const audit = readAudit();
  const advisoriesByPackage = collectAdvisories(audit);

  const versionCache = new Map();
  const changes = [];
  const manual = [];
  const accepted = [];
  // Bundled lock entry -> version it has to be patched to.
  const lockTargets = new Map();

  for (const [pkg, ghsaIds] of [...advisoriesByPackage].sort()) {
    const copies = installedCopies(lock, pkg);
    if (copies.length === 0) continue;

    const isDirect = Boolean(
      (pkgJson.dependencies && pkgJson.dependencies[pkg]) ||
      (pkgJson.devDependencies && pkgJson.devDependencies[pkg])
    );
    const topLevel = lock.packages[`node_modules/${pkg}`];
    // Declared and bundled: a range here breaks `npm ci` whenever a newer version is published.
    const pinExact = isDirect && Boolean(topLevel && topLevel.inBundle);

    // Highest version this package must reach, per major line.
    const requiredByMajor = new Map();
    let unbundledHit = false;

    for (const ghsa of [...ghsaIds].sort()) {
      if (ACCEPTED_RISKS[ghsa]) {
        accepted.push(`${pkg}: ${ghsa} - ${ACCEPTED_RISKS[ghsa]}`);
        continue;
      }

      const advisory = fetchAdvisory(ghsa);
      if (!advisory) {
        manual.push(`${pkg}: ${ghsa} - could not be resolved against the GitHub Advisory DB`);
        continue;
      }

      const affected = (advisory.vulnerabilities || []).filter(
        (v) => v.package && v.package.ecosystem === 'npm' && v.package.name === pkg
      );

      for (const copy of copies) {
        const hit = affected.find(
          (v) => v.vulnerable_version_range && semver.satisfies(copy.version, toSemverRange(v.vulnerable_version_range))
        );
        if (!hit) continue;

        const patched = hit.first_patched_version;
        if (!patched) {
          manual.push(`${pkg}@${copy.version}: ${ghsa} - no patched version exists (accept the risk or drop the dependency)`);
          continue;
        }
        if (!publishedVersions(pkg, versionCache).includes(patched)) {
          manual.push(`${pkg}@${copy.version}: ${ghsa} - patched version ${patched} is not on the configured registry yet (it may already exist upstream; cross-check Dependabot before calling this an accepted risk)`);
          continue;
        }
        if (copy.inBundle) {
          // npm never re-resolves bundled entries, so an override alone leaves this copy as it is.
          if (!isPatchableBundledCopy(lock, copy.path)) {
            manual.push(`${pkg}@${copy.version} at ${copy.path}: ${ghsa} - bundled inside another package's tarball; upgrade that package`);
            continue;
          }
          if (!semver.satisfies(patched, `^${copy.version}`)) {
            manual.push(`${pkg}@${copy.version} at ${copy.path}: ${ghsa} - fixed only in ${patched}, another major line than this bundled copy; upgrade its parent instead`);
            continue;
          }
          const scheduled = lockTargets.get(copy.path);
          if (!scheduled || semver.gt(patched, scheduled)) lockTargets.set(copy.path, patched);
          // A nested bundled copy is fixed by the lock patch alone; a flat override would reach every other copy.
          if (!isDirect && copy.path !== `node_modules/${pkg}`) continue;
        } else {
          unbundledHit = true;
        }

        const major = semver.major(patched);
        const current = requiredByMajor.get(major);
        if (!current || semver.gt(patched, current)) requiredByMajor.set(major, patched);
      }
    }

    if (requiredByMajor.size === 0) continue;

    if (requiredByMajor.size > 1) {
      const lines = [...requiredByMajor.values()].join(', ');
      manual.push(`${pkg}: installed across multiple major lines and needs ${lines}; add a nested override rather than a flat one`);
      continue;
    }

    const target = [...requiredByMajor.values()][0];
    const range = pinExact ? target : `^${target}`;

    // A flat override rewrites *every* copy of the package, so it is only safe when all
    // installed copies live on the same major line as the target. Otherwise it would
    // silently downgrade the other lines.
    const installedMajors = new Set(copies.map((c) => semver.major(c.version)));
    if (installedMajors.size > 1 || !installedMajors.has(semver.major(target))) {
      manual.push(
        `${pkg}: needs ${target}, but copies are installed on major line(s) ${[...installedMajors].sort().join(', ')}; ` +
        'a flat override would downgrade them - add a nested override under each parent instead'
      );
      continue;
    }

    const existing =
      (pkgJson.overrides && typeof pkgJson.overrides[pkg] === 'string' && pkgJson.overrides[pkg]) ||
      (pkgJson.dependencies && pkgJson.dependencies[pkg]) ||
      (pkgJson.devDependencies && pkgJson.devDependencies[pkg]) ||
      null;

    // A range that already allows the patched version means the lock file is simply stale,
    // and `npm update` is enough - no manifest edit required. That does not hold for bundled
    // copies (patched in the lock below) or for exact pins, which must name the new version.
    if (existing && !pinExact && semver.satisfies(target, existing)) {
      if (unbundledHit) changes.push({ pkg, from: existing, to: existing, target, staleLockOnly: true });
      continue;
    }
    if (existing === range) continue;

    changes.push({ pkg, from: existing, to: range, target, staleLockOnly: false });
    if (write) {
      pkgJson.overrides = pkgJson.overrides || {};
      pkgJson.overrides[pkg] = range;
      const rootEntry = lock.packages[''] || {};
      for (const field of ['dependencies', 'devDependencies']) {
        if (pkgJson[field] && pkgJson[field][pkg]) pkgJson[field][pkg] = range;
        if (rootEntry[field] && rootEntry[field][pkg]) rootEntry[field][pkg] = range;
      }
    }
  }

  const lockPatches = [];
  for (const [lockPath, version] of [...lockTargets].sort()) {
    const name = nameFromLockPath(lockPath);
    const from = lock.packages[lockPath].version;
    const manifest = fetchManifest(name, version);
    const plan = manifest
      ? planBundledPatch(lock, lockPath, manifest)
      : { ok: false, reason: `could not read ${name}@${version} from the registry` };
    if (!plan.ok) {
      manual.push(`${name}@${from} at ${lockPath}: bundled copy cannot be patched in place - ${plan.reason}`);
      continue;
    }
    lockPatches.push({ path: lockPath, name, from, to: version });
    if (write) lock.packages[lockPath] = plan.entry;
  }

  const manifestEdits = changes.filter((c) => !c.staleLockOnly);
  const staleLock = changes.filter((c) => c.staleLockOnly);

  console.log('## Automatic fixes\n');
  if (manifestEdits.length === 0 && staleLock.length === 0 && lockPatches.length === 0) {
    console.log('- none required\n');
  }
  for (const c of staleLock) {
    console.log(`- \`${c.pkg}\`: range \`${c.from}\` already allows ${c.target}; refreshed by \`npm update\` alone`);
  }
  for (const c of manifestEdits) {
    console.log(`- \`${c.pkg}\`: \`${c.from || '(none)'}\` -> \`${c.to}\``);
  }
  for (const p of lockPatches) {
    console.log(`- \`${p.name}\` bundled at \`${p.path}\`: ${p.from} -> ${p.to} (lock entry patched; npm never re-resolves bundled entries)`);
  }

  console.log('\n## Needs a human\n');
  if (manual.length === 0) console.log('- none\n');
  for (const m of [...new Set(manual)].sort()) console.log(`- ${m}`);

  console.log('\n## Accepted risk\n');
  if (accepted.length === 0) console.log('- none\n');
  for (const a of [...new Set(accepted)].sort()) console.log(`- ${a}`);

  if (write && manifestEdits.length > 0) {
    writeJsonFile(PKG_PATH, pkgJson, pkgFile.eol);
    console.log(`\nUpdated package.json with ${manifestEdits.length} override change(s).`);
  }
  if (write && (manifestEdits.length > 0 || lockPatches.length > 0)) {
    writeJsonFile(LOCK_PATH, lock, lockFile.eol);
    console.log(`Updated package-lock.json (${lockPatches.length} bundled entr${lockPatches.length === 1 ? 'y' : 'ies'} patched).`);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = {
  KNOWN_FORCED_MAJORS,
  checkLock,
  crossesMajor,
  findDriftProneOverrides,
  findForcedMajors,
  findIneffectiveOverrides,
  formatCheck,
  isPatchableBundledCopy,
  lockOrder,
  nameFromLockPath,
  parseOverrideKey,
  planBundledPatch,
  resolveFrom,
  toSemverRange,
};
