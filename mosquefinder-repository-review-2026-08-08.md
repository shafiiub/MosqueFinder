# MosqueFinder repository review

**Date:** 2026-08-08  
**Scope:** Read-only repository review of `/Users/shafi/.openclaw/workspace/projects/MosqueFinder`. No live-site inspection, dependency installation, build, or project-file changes were performed.

## Executive summary

MosqueFinder is a JSON-backed static-site generator deployed to S3/CloudFront. Its design is workable, but the repository has a high operational blast radius and no automated safety net. The most urgent issues are: both deployment definitions recursively erase the production bucket before upload; source data is concatenated into HTML and filesystem paths without validation or escaping; and the build uses end-of-life runtimes, global installs, and old browser libraries while `npm test` deliberately fails.

The immediate priority is to make releases non-destructive and reproducible, then add schema/content validation and output tests before presentation-layer modernisation.

## Repository snapshot

- Five generator/copy scripts run in a fixed CI order (`.travis.yml:10-15`, `buildspec.yml:24-32`).
- Local read-only checks found 178 mosque records, 17,825 suburb records, about 49 MB total, about 29 MB under `public`, 1,186 public files, and 1,173 asset files.
- Generated state/suburb/mosque directories are ignored (`.gitignore:3-12`); source templates, JSON and vendor assets are committed.
- No README, test directory, lint configuration, or supported Node version is present; package metadata is minimal (`package.json:1-19`).

## Prioritised findings

### P0 — Deployment can erase the production bucket before replacement

Both CI definitions run `aws s3 rm s3://mosque-finder.com.au --recursive` before uploads (`.travis.yml:16-31`, `buildspec.yml:38-53`). Any upload interruption or partial sync after deletion can leave production incomplete, and the command applies at bucket scope. Two deployment definitions also duplicate hazardous logic and can drift.

**Impact:** full-site outage, loss of unrelated objects, difficult rollback. **Confidence:** high.

### P0 — Data is inserted into HTML and paths without a trust boundary

`loadMosqueDetails.js` concatenates gallery URLs, features, Jummah fields and website values, then replaces title/address/content directly into HTML (`loadMosqueDetails.js:127-180`). `loadStateList.js` does the same with teaser, address, listing type, image URL and URL segment (`loadStateList.js:113-171`). Client quick view appends data-derived HTML to `<body>` (`public/assets/js/custom.js:564-596`). No escaping, protocol allow-list, schema validation or sanitisation is visible.

`URLSegment` is appended to filesystem paths (`loadMosqueDetails.js:127-128`) and suburb `url` beneath `public` (`loadDateToPage-v2.js:89-104`) without containment checks. Current data had no empty/duplicate mosque URL segments and all mosque coordinates parsed numerically, but future or compromised data could cause stored XSS, unsafe links, malformed markup or path traversal.

**Impact:** site compromise and arbitrary build-workspace writes. **Confidence:** high for missing controls; exploitability depends on data-edit access.

### P1 — Releases are not reproducible and use obsolete runtimes

Travis pins Node 13.9 and global packages (`.travis.yml:1-9`); CodeBuild pins Node 10/Python 3.7 and globally installs placeholder/core packages `fs`, `path`, and `pip` (`buildspec.yml:4-23`). The manifest pins Express 4.17.1 and Async 3.2.0, includes `fs@0.0.1-security`, and allows unbounded `json >=10.0.0` (`package.json:11-17`). The lockfile is v2 and contains old transitive packages (`package-lock.json:1-16,40-58`).

**Impact:** brittle builds, dependency drift and likely security debt. **Confidence:** high; no online vulnerability scan was performed.

### P1 — No automated verification protects data or generated output

`npm test` exits 1 with “no test specified” (`package.json:7-10`); test commands are commented out (`buildspec.yml:10,22-23,33`). Some generators catch errors and only log them (`loadDateToPage-v2.js:78-117`, `loadMosqueDetails.js:120-207`), potentially permitting incomplete output. No checks cover schema, unique slugs, state/postcode consistency, coordinate ranges, unresolved tokens, internal links, sitemap validity or expected page counts.

**Impact:** silent corruption, incomplete releases, SEO/content regressions. **Confidence:** high.

### P1 — Asynchronous orchestration is fragile and duplicated

`loadDateToPage-v2.js` starts an async template read and an independent JSON read; the JSON callback uses shared `mTemplate` without waiting (`loadDateToPage-v2.js:61-73,78-99`). A timing inversion can generate empty/broken pages. Generators also repeat filesystem helpers and mix callbacks, queues, mutable state and string assembly. Build order exists only in CI lists.

**Impact:** intermittent failures and high maintenance cost. **Confidence:** high for the race; frequency is environment-dependent.

### P1 — Browser dependencies and integrations are legacy/hard-coded

Templates load jQuery 2.1.0 and Migrate 1.2.1 plus many committed plugins (`_templates/home.html:270-284`, `_templates/mosque-detail.html:384-395`). A Maps browser API key is public in templates/pages (`_templates/home.html:279`, `_templates/mosque-detail.html:386`, `public/error.html:244`); client keys are public by nature, but repository evidence cannot establish referrer/API restrictions or quota alerts. Legacy Universal Analytics is embedded (`_templates/home.html:322-330`, `_templates/mosque-detail.html:488-496`).

**Impact:** browser/security debt, possible key abuse/cost, missing analytics. **Confidence:** high for code age/exposure; cloud controls were not inspected.

### P2 — Security headers and link hardening are not represented

The dev server only serves static files (`serve.js:1-8`). Extensive inline scripts complicate CSP. Generated website links use `target="_blank"` without `rel="noopener noreferrer"` (`loadMosqueDetails.js:166`). Deployment files do not define HTTPS/HSTS/CSP/Referrer-Policy/Permissions-Policy/nosniff controls.

**Impact:** weaker defence in depth. **Confidence:** medium because cloud-side headers may exist.

### P2 — Asset/template maintenance is overly broad

Over a thousand assets include many unrelated icon categories and old plugins. Navigation/footer/script blocks are duplicated across templates, amplifying consistency and accessibility work. List-card generation emits invalid `</img>` markup (`loadStateList.js:122`).

**Impact:** maintenance overhead, excess attack surface and latent defects. **Confidence:** high.

## Phased improvement plan

Effort: **S** ≤2 focused days, **M** 3–10 days, **L** >10 days. Risk is delivery/change risk.

### Quick wins

| Item | Rationale | Dependency | Effort | Risk | Measurable acceptance criteria |
|---|---|---|---|---|---|
| Atomic/versioned deployment and rollback | Removes largest outage blast radius | S3 prefix/versioning and CloudFront strategy; AWS permissions | M | Medium | No bucket-root recursive removal; upload completes and smoke tests pass before cutover; documented rollback restores previous release in <10 minutes |
| One CI pipeline and package build command | Removes drift/global assumptions | Choose authoritative CI | S | Low | One pipeline; `npm ci`; all generation via one documented script; clean-checkout CI passes on pinned runtime |
| Pre-generation schema/path validation | Blocks unsafe/malformed data | Required fields and allowed URL schemes | M | Low | Invalid state/postcode/coordinate/slug/protocol or duplicate slug exits non-zero with record ID; every output path is inside `public`; all current records produce a validation report |
| Contextual escaping and rich-text sanitisation | Closes stored XSS/markup corruption | Decide which fields may contain HTML; choose sanitizer/renderer | M | Medium | `<script>`, attribute-breakout, `javascript:` and `../` fixtures render inert or fail; tests cover HTML text, attribute, URL and JS-string contexts |
| Fatal generator failures | Prevents partial deploys | None | S | Low | Missing template, invalid JSON or write error exits non-zero; deployment does not run; log names file/record |
| Restrict/rotate Maps key | Limits abuse/cost | Google Cloud access and domains/APIs | S | Low | Exact referrer/API restrictions, quota/billing alerts and owner/rotation documentation exist; old unrestricted key disabled |

### Near-term

| Item | Rationale | Dependency | Effort | Risk | Measurable acceptance criteria |
|---|---|---|---|---|---|
| Current supported Node LTS; remove fake/core packages | Restores update path | Test baseline and CI | M | Medium | Node pinned; `fs`, `path`, `pip`, unused `json` absent; clean install/generation pass; no unaccepted high/critical audit finding |
| Deterministic output suite | Protects data, HTML, links and sitemaps | Fatal errors/schema checks | M | Low | Unit and fixture tests deterministic; zero unresolved tokens, duplicate paths, invalid XML/critical HTML errors, missing internal targets or count mismatches; `npm test` passes in CI |
| Shared pure helpers and awaited I/O | Removes race and duplication | Tests | M | Medium | One safe writer/renderer reused; no shared async template race; completion awaits every write; repeated race test passes |
| Documentation and ownership | Makes releases/data edits operable | Runtime/CI/data ownership decisions | S | Low | README covers architecture, validation/generation, schema, deploy/rollback and troubleshooting; approvers identified |
| Browser/security regression checks | Creates evidence for headers/client behaviour | Staging config access later | M | Low | CI lints links/CSP compatibility; staging confirms HTTPS, HSTS, CSP/reporting, nosniff, Referrer-Policy and Permissions-Policy; exceptions documented |
| Accessibility and SEO audit of fixtures | Search/navigation templates amplify defects | Representative fixtures | M | Low | Zero critical/serious automated a11y issues on key templates; keyboard flows pass; titles, canonicals, structured data, robots and sitemaps validate |

### Strategic

| Item | Rationale | Dependency | Effort | Risk | Measurable acceptance criteria |
|---|---|---|---|---|---|
| Maintained static-site/template architecture | Default escaping, layouts and maintainability | Requirements, migration, golden tests | L | High | Shared layouts replace duplication; escaping default; URL contracts retained or tested redirects provided; content parity approved |
| Modernise frontend and prune assets | Reduces attack surface/payload | Usage inventory, a11y baseline | L | Medium | No unsupported libraries; traced unused assets removed; performance budgets pass; agreed maps/search/modal behaviour retained |
| Governed content lifecycle/provenance | Data correctness is the product | Content owner, sources and cadence | L | Medium | Records have provenance/review date; stale/invalid report; validated approval workflow; correction SLA/audit trail documented |
| Staged delivery and observability | Enables safe release/recovery | Atomic deploy, staging, monitoring owner | L | Medium | Mandatory preview; synthetic checks cover representative routes/assets; alerts have owners; rollback exercised quarterly |

## Testing and validation recommendations

1. **Data contract:** schema for all datasets; required fields, enums, coordinate ranges, postcode/state mapping, unique IDs/slugs, URL policy and path containment.
2. **Unit:** escaping/sanitisation, slugs, output paths, state routing, fragments, sitemap encoding and prayer-time inputs.
3. **Golden fixtures:** small dataset covering missing optionals, gallery/Jummah variants, punctuation/Unicode, malicious strings and all states/territories.
4. **Output checks:** unresolved tokens, counts, duplicate/case-colliding paths, internal links/assets, XML, canonical URLs and structural HTML errors.
5. **Security:** stored-XSS corpus, unsafe schemes, traversal, tabnabbing, secret scanning, dependency scanning and CSP evaluation.
6. **Accessibility/UX:** automated WCAG plus keyboard/manual search, modal, navigation, map alternative and prayer-table checks on mobile/desktop.
7. **Deployment:** isolated preview prefix, manifest/checksums, representative routes, failed-upload injection proving production remains intact, and rollback drill.
8. **Post-deploy:** availability/content, sitemap, critical assets and analytics checks in an authorised environment.

## Decisions needed from Shafi

1. Which CI/deployment system is authoritative, and may the other be removed?
2. Versioned S3 prefixes/cutover or staged root sync? What rollback-time objective applies?
3. Who may edit source data, and may `Content`, Jummah and feature fields contain HTML?
4. Must current URL paths remain byte-for-byte stable for SEO, or are redirects/canonical changes acceptable?
5. What is the source of truth and review cadence for mosque details, coordinates and prayer calculation policy?
6. Is the Maps key restricted, and who owns quota/billing/rotation?
7. Is analytics required? If so, what privacy/consent position and supported implementation; if not, remove legacy UA.
8. Prefer incremental hardening or migration after the safety baseline?

## Limitations

This bounded repository-only static review did not inspect cloud configuration, CI secrets/settings, S3/CloudFront headers/versioning, Google key restrictions, the live site, runtime behaviour, online vulnerability databases, generated builds, browser performance/accessibility, or prayer-time correctness. Validate these in authorised staging after P0 controls.
