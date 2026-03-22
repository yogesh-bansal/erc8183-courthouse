/**
 * ERC-8183 Courthouse — Offline Demo
 *
 * Simulates the full job lifecycle without needing deployed contracts.
 * Shows three agents coordinating through ERC-8183 escrow.
 */

function log(agent, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  const labels = {
    client: "\x1b[36m[CLIENT]\x1b[0m",
    provider: "\x1b[33m[PROVIDER]\x1b[0m",
    evaluator: "\x1b[35m[EVALUATOR]\x1b[0m",
    system: "\x1b[32m[SYSTEM]\x1b[0m",
    hook: "\x1b[31m[HOOK]\x1b[0m",
  };
  console.log(`[${ts}] ${labels[agent] || `[${agent}]`} ${msg}`);
}

function shortAddr(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ERC-8183 Courthouse — Agent Job Board Demo");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Simulated agents
  const clientAddr = "0xC11E4700000000000000000000000000000000001";
  const providerAddr = "0xP407D300000000000000000000000000000000002";
  const evaluatorAddr = "0xE7A10800000000000000000000000000000000003";

  const job = {
    id: 0,
    description: "Analyze the current state of Ethereum L2 scaling solutions",
    budget: "0.50",
    currency: "USDC",
    expiry: "1 hour",
  };

  // ── Phase 1: Client Posts Job ──────────────────────────────────

  console.log("── Phase 1: Job Creation ─────────────────────────────\n");

  log("client", `Posting job: "${job.description}"`);
  log("client", `  Budget: ${job.budget} ${job.currency}`);
  log("client", `  Evaluator: ${shortAddr(evaluatorAddr)}`);
  log("client", `  Expiry: ${job.expiry}`);
  log("client", `  Hook: ReputationHook (tracks provider reputation)`);
  log("system", `  → createJob() → Job #${job.id} created`);
  log("system", `  → Status: Open`);
  await delay(300);
  console.log();

  // ── Phase 2: Provider Claims Job ───────────────────────────────

  console.log("── Phase 2: Provider Discovery & Claim ───────────────\n");

  log("provider", `Scanning for open jobs...`);
  log("provider", `  Found 1 open job: Job #${job.id}`);
  log("provider", `  Description: "${job.description}"`);
  log("provider", `  Claiming job...`);
  log("system", `  → Client calls setProvider(${job.id}, ${shortAddr(providerAddr)})`);
  log("provider", `  Proposing budget: ${job.budget} ${job.currency}`);
  log("system", `  → setBudget(${job.id}, ${job.budget} USDC)`);
  log("hook", `  → beforeAction: no pre-checks for setBudget`);
  log("hook", `  → afterAction: budget logged`);
  await delay(300);
  console.log();

  // ── Phase 3: Client Funds Escrow ───────────────────────────────

  console.log("── Phase 3: Escrow Funding ───────────────────────────\n");

  log("client", `Provider set and budget agreed. Funding escrow...`);
  log("client", `  Approving ${job.budget} ${job.currency} for ACP contract`);
  log("system", `  → USDC.approve(ACP, ${job.budget})`);
  log("client", `  Funding job escrow...`);
  log("system", `  → fund(${job.id}) → ${job.budget} USDC locked in escrow`);
  log("system", `  → Status: Open → Funded`);
  await delay(300);
  console.log();

  // ── Phase 4: Provider Executes Work ────────────────────────────

  console.log("── Phase 4: Work Execution (x402 Services) ──────────\n");

  log("provider", `Executing job #${job.id}...`);
  log("provider", `  Step 1: Fetching source data via x402-proxy ($0.01)`);
  await delay(200);
  log("provider", `    ✓ Fetched 3 research papers on L2 scaling`);

  log("provider", `  Step 2: Analyzing via x402-llm-bot ($0.01)`);
  await delay(200);
  log("provider", `    ✓ Generated structured analysis with 5 findings`);

  log("provider", `  Step 3: Storing deliverable via x402-pastebin ($0.01)`);
  await delay(200);
  log("provider", `    ✓ Stored at pastebin.0000402.xyz/p/demo-001`);

  const artifacts = {
    analysis: {
      summary: "Comprehensive analysis of Ethereum L2 scaling solutions",
      findings: [
        "Optimistic rollups dominate TVL with $18B across Arbitrum and Optimism",
        "ZK rollups are catching up, with zkSync and StarkNet gaining market share",
        "Blob-based data availability (EIP-4844) reduced L2 costs by 90%",
        "Cross-rollup interoperability remains the key unsolved challenge",
        "Base (Coinbase L2) shows fastest user growth at 15M monthly actives",
      ],
      confidence: 0.88,
    },
    storageUrl: "https://pastebin.0000402.xyz/p/demo-001",
    providerCost: "$0.03 (3 x402 service calls)",
  };

  log("provider", `  Total execution cost: $0.03 in x402 service fees`);
  log("provider", `  Profit if approved: $${(parseFloat(job.budget) * 0.925 - 0.03).toFixed(2)} (budget - fees - execution cost)`);
  console.log();

  // ── Phase 5: Provider Submits ──────────────────────────────────

  console.log("── Phase 5: Deliverable Submission ──────────────────\n");

  const deliverableHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  log("provider", `Submitting deliverable hash: ${deliverableHash.slice(0, 18)}...`);
  log("system", `  → submit(${job.id}, ${deliverableHash.slice(0, 18)}...)`);
  log("system", `  → Status: Funded → Submitted`);
  await delay(300);
  console.log();

  // ── Phase 6: Evaluator Reviews ─────────────────────────────────

  console.log("── Phase 6: Quality Evaluation ──────────────────────\n");

  log("evaluator", `Job #${job.id} awaiting evaluation.`);
  log("evaluator", `  Retrieving deliverable from pastebin...`);
  await delay(200);

  log("evaluator", `  Running quality checks:`);
  const checks = {
    "Has summary": true,
    "Has findings (≥2)": true,
    "Confidence > 0.5": true,
    "Has storage URL": true,
    "Relevant to job": true,
  };

  for (const [check, passed] of Object.entries(checks)) {
    log("evaluator", `    ${passed ? "✓" : "✗"} ${check}`);
  }

  const score = 10;
  log("evaluator", `  Score: ${score}/10 — PASS`);
  log("evaluator", `  Approving deliverable...`);
  await delay(200);

  const reasonHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  log("system", `  → complete(${job.id}, ${reasonHash.slice(0, 18)}...)`);
  log("system", `  → Status: Submitted → Completed`);
  console.log();

  // ── Phase 7: Payment Distribution ──────────────────────────────

  console.log("── Phase 7: Payment Distribution ────────────────────\n");

  const budget = parseFloat(job.budget);
  const platformFee = budget * 0.025;
  const evaluatorFee = budget * 0.05;
  const providerPay = budget - platformFee - evaluatorFee;

  log("system", `  Escrow: ${job.budget} ${job.currency}`);
  log("system", `    Platform fee (2.5%): $${platformFee.toFixed(4)}`);
  log("system", `    Evaluator fee (5%): $${evaluatorFee.toFixed(4)} → ${shortAddr(evaluatorAddr)}`);
  log("system", `    Provider payment: $${providerPay.toFixed(4)} → ${shortAddr(providerAddr)}`);
  log("system", `  → PaymentReleased(${job.id}, ${shortAddr(providerAddr)}, ${providerPay.toFixed(4)})`);
  log("system", `  → EvaluatorFeePaid(${job.id}, ${shortAddr(evaluatorAddr)}, ${evaluatorFee.toFixed(4)})`);
  console.log();

  // ── Phase 8: Reputation Update ─────────────────────────────────

  console.log("── Phase 8: Reputation Update (IACPHook) ─────────────\n");

  log("hook", `afterAction triggered by complete()`);
  log("hook", `  Provider: ${shortAddr(providerAddr)}`);
  log("hook", `  Action: completed`);
  log("hook", `  Jobs completed: 1`);
  log("hook", `  Jobs rejected: 0`);
  log("hook", `  Total earned: ${providerPay.toFixed(4)} USDC`);
  log("hook", `  Reputation score: 100/100`);
  log("hook", `  → ReputationUpdated(${shortAddr(providerAddr)}, "completed", 1, 0)`);
  console.log();

  // ── Summary ────────────────────────────────────────────────────

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Job Lifecycle Complete");
  console.log("═══════════════════════════════════════════════════════════\n");

  const summary = {
    jobId: job.id,
    description: job.description,
    status: "Completed",
    escrow: `${job.budget} USDC`,
    payment: {
      provider: `$${providerPay.toFixed(4)} USDC`,
      evaluator: `$${evaluatorFee.toFixed(4)} USDC`,
      platform: `$${platformFee.toFixed(4)} USDC`,
    },
    providerExecutionCost: "$0.03 (x402 services)",
    providerNetProfit: `$${(providerPay - 0.03).toFixed(4)} USDC`,
    reputation: { completed: 1, rejected: 0, score: "100/100" },
    erc8183Lifecycle: "Open → Funded → Submitted → Completed",
    x402ServicesUsed: ["x402-proxy ($0.01)", "x402-llm-bot ($0.01)", "x402-pastebin ($0.01)"],
    hookActions: ["afterAction(setBudget)", "afterAction(complete) → ReputationUpdated"],
  };

  console.log(JSON.stringify(summary, null, 2));

  // Save output
  const fs = await import("node:fs");
  const path = await import("node:path");
  const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `courthouse_demo_${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
  console.log(`\n  Output saved to: ${outFile}`);
}

main().catch(console.error);
