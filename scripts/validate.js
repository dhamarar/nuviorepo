#!/usr/bin/env node

/**
 * Repo validator.
 *
 * Run locally with `node scripts/validate.js`, or automatically on every push and pull
 * request via `.github/workflows/validate.yml`.
 *
 * The app reads `providers/` straight from this branch, so a mistake here reaches users
 * immediately — there is no staging step to catch it. These checks are deliberately local
 * and offline (no network), so they are fast and safe to run in CI.
 *
 * Checks:
 *   1. manifest.json parses, has unique ids, and every entry carries the fields the app needs.
 *   2. every entry's file exists, loads, and exports getStreams.
 *   3. hasSettings is true if and only if onSettings is exported.
 *   4. every committed bundle is up to date with its src/ (no stale builds).
 *   5. no provider uses a timer primitive — the Nuvio sandbox has none, so
 *      `Promise.race([fetch(url), new Promise((_, r) => setTimeout(...))])` throws
 *      `setTimeout is not defined` synchronously and every request fails with status 0.
 *      This shipped in four providers and made them return nothing on-device while
 *      passing locally (Node has timers). Never again.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const problems = [];
const warnings = [];

function ok(message) {
    console.log('  \u2713 ' + message);
}

function fail(message) {
    problems.push(message);
    console.log('  \u2717 ' + message);
}

function section(title) {
    console.log('\n' + title);
}

function readManifest() {
    section('manifest.json');
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.json'), 'utf8'));
    } catch (error) {
        fail('manifest.json is not valid JSON: ' + error.message);
        return null;
    }

    if (!Array.isArray(manifest.scrapers) || manifest.scrapers.length === 0) {
        fail('manifest.json has no scrapers array');
        return null;
    }
    ok(manifest.scrapers.length + ' entries, version ' + manifest.version);
    return manifest;
}

function checkEntries(manifest) {
    section('provider entries');
    const seen = new Set();

    for (const entry of manifest.scrapers) {
        const label = entry.id || '(missing id)';

        if (!entry.id) fail('an entry has no id');
        if (seen.has(entry.id)) fail(label + ': duplicate id');
        seen.add(entry.id);

        if (!Array.isArray(entry.supportedTypes) || entry.supportedTypes.length === 0) {
            fail(label + ': no supportedTypes');
        }
        if (entry.enabled === true && !entry.logo) fail(label + ': enabled but no logo');
        if (!entry.filename) {
            fail(label + ': no filename');
            continue;
        }

        const file = path.join(REPO, entry.filename);
        if (!fs.existsSync(file)) {
            fail(label + ': file missing (' + entry.filename + ')');
            continue;
        }

        let mod;
        try {
            delete require.cache[require.resolve(file)];
            mod = require(file);
        } catch (error) {
            fail(label + ': does not load (' + error.message.split('\n')[0] + ')');
            continue;
        }

        if (typeof mod.getStreams !== 'function') {
            fail(label + ': does not export getStreams');
        }

        const hasSettings = entry.hasSettings === true;
        const exportsSettings = typeof mod.onSettings === 'function';
        if (hasSettings && !exportsSettings) {
            fail(label + ': manifest says hasSettings but the provider exports no onSettings');
        }
        if (!hasSettings && exportsSettings) {
            fail(label + ': exports onSettings but the manifest omits hasSettings');
        }
    }

    if (problems.length === 0) ok('every entry resolves, loads and matches its settings flag');
}

/** Remove comments so prose about `setTimeout` is not mistaken for a call. */
function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * The Nuvio sandbox is QuickJS with no timer primitives, so any `setTimeout(...)`
 * call is a hard bug: it throws synchronously and the request fails with status 0.
 * Scan both the sources and the generated bundles.
 */
function checkSandboxSafety() {
    section('sandbox safety (no timers)');

    const banned = [
        ['setTimeout', /\bsetTimeout\s*\(/],
        ['setInterval', /\bsetInterval\s*\(/],
        ['clearTimeout', /\bclearTimeout\s*\(/],
        ['clearInterval', /\bclearInterval\s*\(/],
        ['setImmediate', /\bsetImmediate\s*\(/],
        ['queueMicrotask', /\bqueueMicrotask\s*\(/]
    ];

    const targets = [];

    function collect(dir, filter) {
        let names;
        try {
            names = fs.readdirSync(dir);
        } catch (error) {
            return;
        }
        names.forEach(function (name) {
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) collect(full, filter);
            else if (filter(name)) targets.push(full);
        });
    }

    collect(path.join(REPO, 'src'), function (n) { return n.endsWith('.js'); });
    collect(path.join(REPO, 'providers'), function (n) { return n.endsWith('.js'); });

    let hits = 0;
    targets.forEach(function (file) {
        const code = stripComments(fs.readFileSync(file, 'utf8'));
        const rel = path.relative(REPO, file).replace(/\\/g, '/');
        banned.forEach(function (pair) {
            const matches = code.match(new RegExp(pair[1].source, 'g'));
            if (matches) {
                hits += matches.length;
                fail(rel + ': uses ' + pair[0] + '() \u2014 the sandbox has no timers, ' +
                    'so this throws and the request fails with status 0');
            }
        });
        if (/\bnew\s+AbortController\s*\(/.test(code)) {
            warnings.push(rel + ': uses AbortController, but the fetch polyfill ignores ' +
                'options.signal, so it cannot cancel anything');
        }
    });

    if (hits === 0) {
        ok('no timer primitives in ' + targets.length + ' file(s) (src/ + providers/)');
    }
}

function checkBundleFreshness() {
    section('bundle freshness');

    let statusBefore;
    try {
        statusBefore = execFileSync('git', ['status', '--porcelain', 'providers'], { cwd: REPO })
            .toString().trim();
    } catch (error) {
        console.log('  \u26a0 skipped: git is not available');
        return;
    }

    if (statusBefore) {
        console.log('  \u26a0 skipped: providers/ already has uncommitted changes, so staleness cannot be judged');
        return;
    }

    try {
        execFileSync(process.execPath, ['build.js'], { cwd: REPO, stdio: 'ignore' });
    } catch (error) {
        fail('`node build.js` failed, so freshness could not be checked');
        return;
    }

    const statusAfter = execFileSync('git', ['status', '--porcelain', 'providers'], { cwd: REPO })
        .toString().trim();

    if (!statusAfter) {
        ok('every committed bundle matches its src/');
        return;
    }

    statusAfter.split('\n').forEach(function (line) {
        fail('stale bundle: ' + line.trim() + ' \u2014 run `node build.js` and commit the result');
    });
}

function main() {
    const manifest = readManifest();
    if (manifest) checkEntries(manifest);
    checkSandboxSafety();
    checkBundleFreshness();

    console.log('');
    if (warnings.length > 0) {
        warnings.forEach(function (w) { console.log('  \u26a0 ' + w); });
        console.log('');
    }
    if (problems.length === 0) {
        console.log('All checks passed.');
        return;
    }
    console.log(problems.length + ' problem(s) found.');
    process.exit(1);
}

main();
