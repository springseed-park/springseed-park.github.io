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
  assert.match(provider, /signInWithPopup\(firebaseAuth, googleProvider, browserPopupRedirectResolver\)/);
  assert.match(firebase, /popupRedirectResolver:\s*browserPopupRedirectResolver/);
  assert.doesNotMatch(button, /use_fedcm_for_button/);
});

test("Toss redirect result pages are included in the static Pages build", async () => {
  assert.equal(await exists(await resolveOutputFile("/payment/success")), true);
  assert.equal(await exists(await resolveOutputFile("/payment/fail")), true);
});

test("GitHub Pages test checkout has no auxiliary payment server dependency", async () => {
  const workflow = await readFile(resolve(".github/workflows/deploy-pages.yml"), "utf8");
  const checkout = await readFile(resolve("app/checkout/page.tsx"), "utf8");
  const toss = await readFile(resolve("app/lib/tossPayments.ts"), "utf8");
  assert.doesNotMatch(workflow, /NEXT_PUBLIC_TOSS_API_ORIGIN/);
  assert.doesNotMatch(checkout, /api\/payments\/prepare/);
  assert.match(toss, /test_gck_docs_/);
});

test("limited socks product and every supplied color image are exported", async () => {
  assert.equal(await exists(await resolveOutputFile("/product/signature-rib-socks")), true);
  for (const color of ["brown", "beige", "white", "black"]) {
    assert.equal(await exists(join(outputRoot, "products", "signature-rib-socks", `${color}-worn.png`)), true);
    assert.equal(await exists(join(outputRoot, "products", "signature-rib-socks", `${color}-detail.png`)), true);
  }
});

test("account sign-in keeps only the centered authentication panel", async () => {
  const account = await readFile(resolve("app/account/page.tsx"), "utf8");
  const css = await readFile(resolve("app/globals.css"), "utf8");
  assert.doesNotMatch(account, /className="auth-intro"/);
  assert.match(css, /\.account-auth-layout \{ display: block; width: min\(100%, 620px\); margin-inline: auto;/);
});

test("customer payment screens use standard order-completion language", async () => {
  const checkout = await readFile(resolve("app/checkout/page.tsx"), "utf8");
  const success = await readFile(resolve("app/payment/success/page.tsx"), "utf8");
  assert.doesNotMatch(checkout, /테스트 모드|실제 금액은 청구되지 않습니다/);
  assert.doesNotMatch(success, /TEST PAYMENT|Test complete|테스트 결제|테스트 주문|Toss Payments Test|TEST_COMPLETED/);
  assert.match(success, /ORDER COMPLETE/);
  assert.match(success, /주문이 정상적으로 완료되었습니다/);
  assert.match(success, /주문·배송 내역 확인/);
});

test("Google sign-in avoids forced account selection and redundant persistence waits", async () => {
  const provider = await readFile(resolve("app/components/AuthProvider.tsx"), "utf8");
  const layout = await readFile(resolve("app/layout.tsx"), "utf8");
  assert.doesNotMatch(provider, /prompt:\s*["']select_account/);
  const googleFlow = provider.slice(provider.indexOf("const signInWithGoogle"), provider.indexOf("const resetPassword"));
  assert.doesNotMatch(googleFlow, /setPersistence/);
  assert.doesNotMatch(layout, /accounts\.google\.com\/gsi\/client/);
  assert.match(layout, /maison-elan-shop\.firebaseapp\.com/);
});

test("admin orders synchronize across tabs and completed orders retain a recovery snapshot", async () => {
  const admin = await readFile(resolve("app/admin/page.tsx"), "utf8");
  const success = await readFile(resolve("app/payment/success/page.tsx"), "utf8");
  assert.match(admin, /addEventListener\("storage", syncFromAnotherTab\)/);
  assert.match(success, /syncAdminCache\(pending, payment\)/);
  assert.match(success, /order: pending/);
  assert.match(success, /readCompletedOrder\(orderId\)/);
  assert.match(admin, /auth\.orders\.filter/);
  assert.match(admin, /order\.shippingAddress/);
});

test("AI shopping assistant keeps Groq credentials in the relay only", async () => {
  const chatbot = await readFile(resolve("app/components/AIChatbot.tsx"), "utf8");
  const worker = await readFile(resolve("chatbot-worker/src/index.ts"), "utf8");
  const workflow = await readFile(resolve(".github/workflows/deploy-pages.yml"), "utf8");
  assert.doesNotMatch(chatbot, /GROQ_API_KEY|gsk_/);
  assert.match(worker, /openai\/gpt-oss-20b/);
  assert.match(worker, /env\.GROQ_API_KEY/);
  assert.match(worker, /CHAT_RATE_LIMITER/);
  assert.match(worker, /reasoning_effort:\s*"low"/);
  assert.doesNotMatch(worker, /테스트 모드|실제 금액이 청구되지/);
  assert.match(chatbot, /X-Chat-Session/);
  assert.match(chatbot, /http:\/\/localhost:8787/);
  assert.match(chatbot, /productIds\.has\(slug\)/);
  assert.match(chatbot, /개인정보·결제정보를 입력하지 마세요/);
  assert.match(chatbot, /role="log"/);
  assert.match(worker, /entry\.role === "assistant" \? 1_500 : 500/);
  assert.match(worker, /!env\.CHAT_RATE_LIMITER/);
  assert.match(worker, /CHAT_IP_RATE_LIMITER/);
  assert.match(worker, /CHAT_BUDGET_LIMITER/);
  assert.match(workflow, /NEXT_PUBLIC_CHATBOT_API_URL:\s*\$\{\{ vars\.CHATBOT_API_URL \}\}/);
});
