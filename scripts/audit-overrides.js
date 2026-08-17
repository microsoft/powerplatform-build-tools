// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Resolves open npm advisories into concrete `overrides` entries in package.json.
 *
 * Most vulnerabilities in this repo are transitive, so they can only be pinned through
 * npm `overrides`. Dependabot does not understand `overrides`, which is why those alerts
 * are re-raised by S360/Component Governance every week and have to be fixed by hand.
 *
 * Flow:
 *   1. `npm audit --json` to find which packages are flagged and by which advisories.
 *   2. Resolve each GHSA against the GitHub Advisory DB for its real `first_patched_version`.
 *   3. Compare against every installed copy in package-lock.json.
 *   4. Raise the matching `overrides` range when the patched version is actually published.
 *
 * Anything that cannot be fixed automatically is reported instead of guessed at:
 *   - advisories with no patched version,
 *   - advisories whose patched version is not published on the registry yet,
 *   - packages installed across several major lines, which need a nested override,
 *   - copies marked `inBundle`, which `overrides` cannot reach at all.
 *
 * Usage:
 *   node scripts/audit-overrides.js           # report only, exits 0
 *   node scripts/audit-overrides.js --write   # apply changes to package.json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const semver = require('semver');

const REPO_ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(REPO_ROOT, 'package.json');
const LOCK_PATH = path.join(REPO_ROOT, 'package-lock.json');
const WRITE = process.argv.includes('--write');

// Advisories we knowingly carry. Keep in sync with the "Accepted risk" section of the PR template.
const ACCEPTED_RISKS = {
  'GHSA-848j-6mx2-7j84': 'elliptic - dev-only (rewiremock -> node-libs-browser -> crypto-browserify), no patched version published',
};

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
  const raw = run('npm', ['audit', '--json']);
  const start = raw.indexOf('{');
  if (start < 0) throw new Error('npm audit produced no JSON output');
  return JSON.parse(raw.slice(start));
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

/** Every installed copy of `pkg`, from the lock file. */
function installedCopies(lock, pkg) {
  return Object.entries(lock.packages || {})
    .filter(([p]) => p.endsWith(`node_modules/${pkg}`))
    .map(([p, meta]) => ({ path: p, version: meta.version, inBundle: !!meta.inBundle }))
    .filter((c) => !!c.version);
}

function main() {
  const pkgJson = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const audit = readAudit();
  const advisoriesByPackage = collectAdvisories(audit);

  const versionCache = new Map();
  const changes = [];
  const manual = [];
  const accepted = [];

  for (const [pkg, ghsaIds] of [...advisoriesByPackage].sort()) {
    const copies = installedCopies(lock, pkg);
    if (copies.length === 0) continue;

    // A package declared in the manifest can always be raised there, even when npm marks a
    // copy as `inBundle`. Only nested bundled copies are genuinely out of reach.
    const isDirect = Boolean(
      (pkgJson.dependencies && pkgJson.dependencies[pkg]) ||
      (pkgJson.devDependencies && pkgJson.devDependencies[pkg])
    );

    // Highest version this package must reach, per major line.
    const requiredByMajor = new Map();

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
          (v) => v.vulnerable_version_range && semver.satisfies(copy.version, v.vulnerable_version_range)
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
        if (copy.inBundle && !isDirect && copy.path !== `node_modules/${pkg}`) {
          manual.push(`${pkg}@${copy.version} at ${copy.path}: ${ghsa} - bundled dependency, npm overrides cannot reach it; patch package-lock.json directly`);
          continue;
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
    const range = `^${target}`;

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
    // and `npm update` is enough - no manifest edit required.
    if (existing && semver.satisfies(target, existing)) {
      changes.push({ pkg, from: existing, to: existing, target, staleLockOnly: true });
      continue;
    }

    changes.push({ pkg, from: existing, to: range, target, staleLockOnly: false });
    if (WRITE) {
      pkgJson.overrides = pkgJson.overrides || {};
      pkgJson.overrides[pkg] = range;
      if (pkgJson.dependencies && pkgJson.dependencies[pkg]) pkgJson.dependencies[pkg] = range;
      if (pkgJson.devDependencies && pkgJson.devDependencies[pkg]) pkgJson.devDependencies[pkg] = range;
    }
  }

  const manifestEdits = changes.filter((c) => !c.staleLockOnly);
  const staleLock = changes.filter((c) => c.staleLockOnly);

  console.log('## Automatic fixes\n');
  if (manifestEdits.length === 0 && staleLock.length === 0) {
    console.log('- none required\n');
  }
  for (const c of staleLock) {
    console.log(`- \`${c.pkg}\`: range \`${c.from}\` already allows ${c.target}; refreshed by \`npm update\` alone`);
  }
  for (const c of manifestEdits) {
    console.log(`- \`${c.pkg}\`: \`${c.from || '(none)'}\` -> \`${c.to}\``);
  }

  console.log('\n## Needs a human\n');
  if (manual.length === 0) console.log('- none\n');
  for (const m of [...new Set(manual)].sort()) console.log(`- ${m}`);

  console.log('\n## Accepted risk\n');
  if (accepted.length === 0) console.log('- none\n');
  for (const a of [...new Set(accepted)].sort()) console.log(`- ${a}`);

  if (WRITE && manifestEdits.length > 0) {
    fs.writeFileSync(PKG_PATH, `${JSON.stringify(pkgJson, null, 2)}\n`);
    console.log(`\nUpdated package.json with ${manifestEdits.length} override change(s).`);
  }
}

main();
