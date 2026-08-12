import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import test from "node:test";

const outputRoot = resolve("dist/client");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveOutputFile(pathname) {
  if (pathname === "/") return join(outputRoot, "index.html");
  const direct = join(outputRoot, pathname.replace(/^\//, ""));
  if (extname(pathname)) return direct;
  const html = `${direct}.html`;
  if (await exists(html)) return html;
  return join(direct, "index.html");
}

test("every rendered internal link points to an exported page or asset", async () => {
  const htmlFiles = (await walk(outputRoot)).filter((path) => path.endsWith(".html"));
  const failures = [];

  for (const sourceFile of htmlFiles) {
    const source = await readFile(sourceFile, "utf8");
    for (const match of source.matchAll(/href="([^"]+)"/g)) {
      const href = match[1].replaceAll("&amp;", "&");
      if (/^(?:https?:|mailto:|tel:|javascript:|\/\/)/.test(href)) continue;

      const url = new URL(href, "https://springseed-park.github.io/");
      const targetFile = href.startsWith("#") ? sourceFile : await resolveOutputFile(url.pathname);
      if (!(await exists(targetFile))) {
        failures.push(`${relative(outputRoot, sourceFile)} -> ${href} (target missing)`);
        continue;
      }

      const isGenerated404SkipLink =
        relative(outputRoot, sourceFile) === "404.html" && url.hash === "#content";

      if (url.hash && !isGenerated404SkipLink) {
        const fragment = decodeURIComponent(url.hash.slice(1));
        const target = await readFile(targetFile, "utf8");
        if (!target.includes(`id="${fragment}"`)) {
          failures.push(`${relative(outputRoot, sourceFile)} -> ${href} (anchor missing)`);
        }
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("static Pages build does not use client-side Next links", async () => {
  const appFiles = (await walk(resolve("app"))).filter((path) => path.endsWith(".tsx"));
  const offenders = [];
  for (const file of appFiles) {
    const source = await readFile(file, "utf8");
    if (source.includes('from "next/link"') || /router\.(?:push|replace)\(/.test(source)) {
      offenders.push(relative(resolve("app"), file));
    }
  }
  assert.deepEqual(offenders, []);
});

test("mobile header keeps the account entry point visible", async () => {
  const css = await readFile(resolve("app/globals.css"), "utf8");
  assert.match(css, /\.icon-utilities a:nth-child\(1\), \.icon-utilities a:nth-child\(3\) \{ display: none; \}/);
  assert.doesNotMatch(css, /\.icon-utilities a:nth-child\(2\)[^{]*\{ display: none; \}/);
});

test("Google sign-in uses Firebase popup auth on static hosting", async () => {
  const provider = await readFile(resolve("app/components/AuthProvider.tsx"), "utf8");
  const firebase = await readFile(resolve("app/lib/firebase.ts"), "utf8");
  const button = await readFile(resolve("app/components/GoogleSignInButton.tsx"), "utf8");
  assert.match(provider, /signInWithPopup\(firebaseAuth, provider, browserPopupRedirectResolver\)/);
  assert.match(firebase, /popupRedirectResolver:\s*browserPopupRedirectResolver/);
  assert.doesNotMatch(button, /use_fedcm_for_button/);
});

test("Toss redirect result pages are included in the static Pages build", async () => {
  assert.equal(await exists(await resolveOutputFile("/payment/success")), true);
  assert.equal(await exists(await resolveOutputFile("/payment/fail")), true);
});
