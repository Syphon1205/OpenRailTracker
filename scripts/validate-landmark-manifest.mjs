import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = process.argv[2]
  ? path.resolve(root, process.argv[2])
  : path.resolve(root, "frontend/landmarks/models/manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const landmarks = Array.isArray(raw.landmarks) ? raw.landmarks : [];

if (!landmarks.length) {
  console.error("No landmarks found in manifest.");
  process.exit(1);
}

const isHttp = (u) => /^https?:\/\//i.test(u || "");
const isLocal = (u) => (u || "").startsWith("/");

let ok = 0;
let failed = 0;

for (const lm of landmarks) {
  const id = lm.id || "(missing-id)";
  const url = `${lm.url || ""}`.trim();

  if (!url) {
    console.log(`SKIP  ${id}  (empty url)`);
    continue;
  }

  if (isLocal(url)) {
    const localPath = path.resolve(root, `frontend${url}`);
    if (fs.existsSync(localPath)) {
      console.log(`OK    ${id}  ${url}`);
      ok += 1;
    } else {
      console.log(`FAIL  ${id}  missing local file: ${url}`);
      failed += 1;
    }
    continue;
  }

  if (isHttp(url)) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        console.log(`OK    ${id}  ${url}`);
        ok += 1;
      } else {
        console.log(`FAIL  ${id}  ${url}  HTTP ${res.status}`);
        failed += 1;
      }
    } catch (error) {
      console.log(`FAIL  ${id}  ${url}  ${error.message}`);
      failed += 1;
    }
    continue;
  }

  console.log(`FAIL  ${id}  invalid url format: ${url}`);
  failed += 1;
}

console.log(`\nSummary: ok=${ok}, failed=${failed}`);
if (failed > 0) process.exit(2);
