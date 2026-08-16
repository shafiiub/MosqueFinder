# MosqueFinder remediation — 2026-08-16

## Result

The approved first remediation slice is implemented and verified on Node v26.5.0 and npm 12.0.2. `npm test` exits 0 (10/10 tests). The top-level temporary-output build exits 0 after a no-write preflight and produces 178/178 non-empty mosque detail pages. The five-command documented build sequence also exits 0 in a clean temporary repository copy. Two clean builds are byte-identical.

No repository `public` output was generated or overwritten during verification. No AWS, S3, CloudFront, deployment, production, external-contact, secret, git commit, push, or merge action was performed.

## Finding-to-change mapping

| Finding / acceptance risk | Change |
| --- | --- |
| Template-read race allowed exit 0 with 178 zero-byte mosque pages | Replaced callback queues with an awaited promise pipeline in `generator-core.js`. Required templates and JSON are read before rendering; every mkdir/write/rename/stat is awaited; CLI wrappers use one rejected-promise-to-nonzero contract. Writes use a same-directory temporary file plus atomic rename and post-write non-empty verification. |
| A later generator error could occur after earlier top-level writes | Added `build.js`: it dry-preflights all five generators (all required input reads, validation, renders, destinations, unresolved tokens) before the first output write, then runs the documented generator order. `npm run build` invokes this top-level contract. |
| Routes were concatenated into filesystem paths | Added centralized `safeDestination` containment. It rejects absolute paths, `.`/`..`, empty components, backslashes, NUL/newlines, and any resolved destination outside `MOSQUE_FINDER_OUTPUT_ROOT`. All plans are preflighted before writes. Internal asset/generated paths reject traversal and unsafe forms. |
| `Suburblist.json` contains 17,825 records but only 16,490 destinations | Added deterministic rendered-identity deduplication. The 1,335 duplicate route records differ only in irrelevant IDs and are reported/deduplicated. Any conflicting rendered fields for one route fail with route, record indexes, and IDs before writes. |
| Mosque route collisions could overwrite pages | Added strict URL-segment validation and unconditional rejection of duplicate mosque destinations, with record indexes, before mosque writes. |
| Inputs were used without shape validation | Added array/object/string/null checks for fields used by active generators, supported-state checks, suburb four-digit postcode/route agreement, mosque postcode shape, finite coordinates, string arrays, and validated gallery paths. All three copied JSON inputs are parsed and validated before copying. |
| Plain data was concatenated into HTML, attributes, JS and XML | Added HTML/attribute escaping for plain fields, XML escaping for sitemap locations, and JSON serialization with HTML-significant character neutralization for inline JavaScript values. Templates now use separate `stateJson`, `latitudeJson`, and `longitudeJson` contexts. |
| External links accepted arbitrary schemes and `_blank` lacked isolation | Only credential-free `http:`/`https:` website values become links. New-window links include `rel="noopener noreferrer"`. Existing schemeless website strings remain visible as escaped, non-clickable text rather than becoming unsafe links. |
| Required placeholder/empty output could be reported as success | Rendering rejects unresolved required `{{token}}` values and empty output. Every required artifact is stat-checked after writing. Tests exclude repository runtime partial templates/comments by inspecting generated artifacts only. |
| No executable regression suite/build script | Added Node-native `node:test` fixtures and package scripts: `npm test` and `npm run build`. Tests never write repository `public`. |

## Affected files

Remediation files:

- `generator-core.js` (new centralized generation, validation, escaping, planning, and writing boundary)
- `build.js` (new all-generator preflight and top-level failure contract)
- `test/generator.test.js` (new Node-native fixture/integration suite)
- `loadDateToPage-v2.js`
- `copyDataFiles.js`
- `loadStatePrayerTimeSitemap.js`
- `loadStateList.js`
- `loadMosqueDetails.js`
- `_templates/suburb-prayertime.html`
- `_templates/mosque-detail.html`
- `package.json` (adds `build`, replaces placeholder `test`; preserves Shafi's dependency edits)

Pre-existing user-owned changes, deliberately preserved and not overwritten by repository builds:

- `package-lock.json`
- `public/assets/json/mosque_home.json`
- `public/assets/json/mosque_json.json`
- `public/mosque/artarmon-hampden-road-mosque/index.html`
- `public/mosque/ashfield-holden-street-musalla/index.html`
- `public/mosque/ashfield-liverpool-road-musalla/index.html`
- `public/mosque/asquith-hornsby-musalla/index.html`
- `public/mosque/darul-imaan-wolli-creek-mosque/index.html`
- `public/mosque/sitemap.xml`
- `public/mosque/university-of-new-england-masque/index.html`
- untracked `how-to-run.md`
- untracked `mosquefinder-repository-review-2026-08-08.md`

## Preservation evidence

Initial status captured before edits:

```text
## master...origin/master
 M package-lock.json
 M package.json
 M public/assets/json/mosque_home.json
 M public/assets/json/mosque_json.json
 M public/mosque/artarmon-hampden-road-mosque/index.html
 M public/mosque/ashfield-holden-street-musalla/index.html
 M public/mosque/ashfield-liverpool-road-musalla/index.html
 M public/mosque/asquith-hornsby-musalla/index.html
 M public/mosque/darul-imaan-wolli-creek-mosque/index.html
 M public/mosque/sitemap.xml
 M public/mosque/university-of-new-england-masque/index.html
?? how-to-run.md
?? mosquefinder-repository-review-2026-08-08.md
```

Final status retains every baseline path above. Additional status is limited to the remediation files listed in the affected-files section. Builds used `/tmp/MosqueFinder-remediation.iHmHnQ/repo/public` and `/tmp/MosqueFinder-top-level.LqGGf2/public`; repository `public` was not a build destination.

The scoped remediation diff passes `git diff --check` (exit 0). Whole-worktree `git diff --check` remains nonzero only because pre-existing user-owned generated HTML changes contain trailing whitespace; those files were preserved.

## Commands, versions, and results

Authoritative setup read before action:

```sh
cat how-to-run.md
git status --short --branch
```

Environment:

```text
node --version  -> v26.5.0 (exit 0)
npm --version   -> 12.0.2 (exit 0)
```

Syntax checks (all exit 0):

```sh
node --check generator-core.js
node --check build.js
node --check loadDateToPage-v2.js
node --check copyDataFiles.js
node --check loadStatePrayerTimeSitemap.js
node --check loadStateList.js
node --check loadMosqueDetails.js
node --check test/generator.test.js
```

Tests:

```sh
npm test
```

Result: exit 0; 10 tests, 10 pass, 0 fail, duration about 0.70 s.

Top-level build against a fresh temporary output root:

```sh
MOSQUE_FINDER_OUTPUT_ROOT=/tmp/MosqueFinder-top-level.LqGGf2/public npm run build
```

Result: exit 0. Preflight explicitly reported no files written, then 16,490 suburb pages, 1,335 identical-route deduplications, 3 validated JSON copies, 16,506 suburb/state artifacts in the combined generator, 8 state listing pages, 178 verified non-empty mosque pages, and 1 mosque sitemap. Independent count: 178 mosque pages; 0 zero-byte mosque pages.

Documented sequence in a clean temporary repository copy (`/tmp/MosqueFinder-remediation.iHmHnQ/repo`):

```sh
node loadDateToPage-v2.js
node copyDataFiles.js
node loadStatePrayerTimeSitemap.js
node loadStateList.js
node loadMosqueDetails.js
```

Each command exited 0 in that order. Output audit:

```text
unique suburb index pages: 16,490
mosque detail pages: 178
zero-byte mosque detail pages: 0
total generated files: 16,696
generated HTML files with unresolved required tokens: 0
JSON files parsed successfully: 3/3
XML sitemap files structurally parsed/balanced: 9/9
second clean build hash comparison: byte-identical (cmp exit 0)
```

Final inspection:

```sh
git diff --check -- generator-core.js build.js test package.json loadDateToPage-v2.js copyDataFiles.js loadStatePrayerTimeSitemap.js loadStateList.js loadMosqueDetails.js _templates/suburb-prayertime.html _templates/mosque-detail.html
git diff --stat
git status --short --branch
```

Scoped diff check: exit 0. No commit or remote operation performed.

## Closeout re-verification

The final handoff audit re-ran only the approved syntax checks, `npm test`, and the top-level build with `MOSQUE_FINDER_OUTPUT_ROOT=/tmp/MosqueFinder-closeout.2RmXbA/public`. All eight syntax checks exited 0; `npm test` exited 0 with 10/10 passing; and `npm run build` exited 0 after its no-write preflight.

Independent inspection of that temporary output confirmed 178 mosque detail pages, all 178 non-empty, zero zero-byte files anywhere in the generated output tree, and zero unresolved required tokens in generated HTML/XML. Source validation independently confirmed 17,825 suburb records, 16,490 unique rendered routes, 1,335 identical-route deduplications, 178 mosque records, and 178 unique mosque destinations.

Before and after hashes for every modified or untracked worktree file were identical, confirming that the checks did not alter repository `public` or any pre-existing user change. The final status contains exactly the captured baseline paths plus the approved remediation files and this report. No AWS, S3, CloudFront, deployment, production, git commit, push, merge, or source-data-edit action was performed during closeout.

## Test coverage

The executable fixture suite covers:

- delayed template reads and the zero-byte/race regression;
- missing template and invalid JSON producing nonzero exit with no partial output;
- top-level all-generator preflight producing no output when a later generator is invalid;
- path traversal, absolute paths, backslashes, encoded traversal, and valid containment;
- identical suburb route deduplication and actionable conflicting-route failure;
- duplicate mosque destination rejection before mosque writes;
- non-empty mosque pages;
- exact fixture artifact counts and invariants;
- unresolved generated placeholder rejection;
- parseable copied JSON and structurally well-formed generated XML;
- HTML/attribute escaping, safe inline serialization, rich-content preservation, safe website protocols, and `noopener noreferrer`;
- two clean fixture builds being byte-identical.

## Limitations and remaining risks

- `Content` is intentionally treated as trusted rich HTML to preserve current product semantics, as explicitly required. It is not fully sanitized. If editorial data can be supplied by untrusted actors, a product-approved allowlist policy is still needed. The same policy should decide how links already embedded inside rich content are rewritten or isolated.
- Nine current schemeless website values are preserved visibly but are deliberately not made clickable; safely normalizing them to HTTPS would be a source-data/product decision.
- Current source data contains three oddly formatted mosque postcodes and one apparent latitude/longitude reversal. Validation requires the current generator-needed string/finite-number shapes without editorially correcting these records. These remain data-quality risks.
- Atomic per-file replacement prevents zero-byte published artifacts, and build preflight prevents known input/render/path failures before any top-level write. A low-level filesystem failure partway through the write phase still returns nonzero but cannot provide a transactional rollback across 16,696 independent files on an existing output tree.
- XML verification is Node-native structural/well-formedness checking for these controlled sitemap documents; no external XML schema validator was added.

## Report path

`/Users/shafi/.openclaw/workspace-cody/reports/MosqueFinder-remediation-2026-08-16.md`
