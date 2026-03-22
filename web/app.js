let running = false;

function setStage(stage) {
  const stages = ["open", "funded", "submitted", "completed"];
  const idx = stages.indexOf(stage);
  stages.forEach((s, i) => {
    const el = document.getElementById(`stage-${s}`);
    el.className = i < idx ? "stage done" : i === idx ? "stage active" : "stage";
  });
  const badge = document.getElementById("jobStatus");
  badge.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);
  badge.className = `status-badge ${stage}`;
}

function setAgentStatus(agent, status, isWorking) {
  const el = document.getElementById(`${agent}Status`);
  el.textContent = status;
  el.className = isWorking ? "agent-status working" : status === "Idle" ? "agent-status" : "agent-status done";
  const card = document.getElementById(`agent-${agent}`);
  card.className = isWorking ? "agent-card active" : "agent-card";
}

function addLog(agent, message) {
  const container = document.getElementById("logContainer");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const ts = new Date().toISOString().slice(11, 19);
  entry.innerHTML = `<span class="timestamp">[${ts}]</span> <span class="agent ${agent}">[${agent.toUpperCase()}]</span> ${message}`;
  container.prepend(entry);
}

function setChecks(checks) {
  const container = document.getElementById("checksContainer");
  container.innerHTML = "";
  const labels = { hasSummary: "Summary", hasFindings: "Findings", hasConfidence: "Confidence", hasStorage: "Storage", relevantToJob: "Relevant" };
  for (const [key, label] of Object.entries(labels)) {
    const passed = checks ? checks[key] : false;
    const div = document.createElement("div");
    div.className = `check-item ${checks ? "pass" : "pending"}`;
    div.innerHTML = `<span class="icon">${checks && passed ? "&#10003;" : "&#9711;"}</span>${label}`;
    container.appendChild(div);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runDemo() {
  if (running) return;
  running = true;
  document.getElementById("runDemo").disabled = true;
  document.getElementById("logContainer").innerHTML = "";
  setChecks(null);

  // Phase 1: Job Creation
  setStage("open");
  setAgentStatus("client", "Posting job...", true);
  addLog("client", 'Posting job: "Analyze Ethereum L2 scaling solutions"');
  addLog("client", "Budget: 0.50 USDC | Expiry: 1 hour");
  await sleep(600);
  addLog("system", "createJob() -> Job #0 created");
  setAgentStatus("client", "Job posted", false);
  await sleep(400);

  // Phase 2: Provider Claims
  setAgentStatus("provider", "Scanning...", true);
  addLog("provider", "Scanning for open jobs...");
  await sleep(400);
  addLog("provider", "Found Job #0 — claiming...");
  addLog("system", "setProvider(0, 0xP407...0002)");
  addLog("provider", "Proposing budget: 0.50 USDC");
  addLog("system", "setBudget(0, 500000)");
  addLog("hook", "afterAction: budget logged");
  setAgentStatus("provider", "Job claimed", false);
  await sleep(400);

  // Phase 3: Escrow Funding
  setAgentStatus("client", "Funding...", true);
  addLog("client", "Funding escrow: 0.50 USDC");
  addLog("system", "USDC.approve(ACP, 500000)");
  await sleep(300);
  addLog("system", "fund(0) -> 0.50 USDC locked");
  setStage("funded");
  setAgentStatus("client", "Escrow funded", false);
  await sleep(400);

  // Phase 4: Work Execution
  setAgentStatus("provider", "Executing...", true);
  addLog("provider", "Executing job #0...");

  addLog("provider", "Step 1: Fetching via x402-proxy ($0.01)");
  await sleep(500);
  addLog("provider", "Fetched 3 research papers on L2 scaling");

  addLog("provider", "Step 2: Analyzing via x402-llm-bot ($0.01)");
  await sleep(500);
  addLog("provider", "Generated structured analysis with 5 findings");

  addLog("provider", "Step 3: Storing via x402-pastebin ($0.01)");
  await sleep(400);
  addLog("provider", "Stored at pastebin.0000402.xyz/p/demo-001");
  addLog("provider", "Total execution cost: $0.03");
  await sleep(300);

  // Phase 5: Submit
  addLog("provider", "Submitting deliverable hash...");
  addLog("system", "submit(0, 0x7a8b9c...) -> Status: Funded -> Submitted");
  setStage("submitted");
  setAgentStatus("provider", "Submitted", false);
  await sleep(500);

  // Phase 6: Evaluation
  setAgentStatus("evaluator", "Reviewing...", true);
  addLog("evaluator", "Job #0 awaiting evaluation");
  addLog("evaluator", "Retrieving deliverable...");
  await sleep(400);

  addLog("evaluator", "Running quality checks:");
  const checks = { hasSummary: true, hasFindings: true, hasConfidence: true, hasStorage: true, relevantToJob: true };
  setChecks(checks);

  const checkLabels = ["Has summary", "Has findings (>=2)", "Confidence > 0.5", "Has storage URL", "Relevant to job"];
  for (const label of checkLabels) {
    addLog("evaluator", `  &#10003; ${label}`);
    await sleep(200);
  }

  document.getElementById("score").textContent = "10/10";
  addLog("evaluator", "Score: 10/10 — PASS");
  addLog("evaluator", "Approving deliverable...");
  await sleep(300);

  addLog("system", "complete(0, 0x1234...) -> Status: Submitted -> Completed");
  setStage("completed");
  setAgentStatus("evaluator", "Approved", false);
  await sleep(400);

  // Phase 7: Payment
  document.getElementById("providerPay").textContent = "$0.4625";
  document.getElementById("evalFee").textContent = "$0.0250";
  addLog("system", "Escrow: 0.50 USDC");
  addLog("system", "Platform fee (2.5%): $0.0125");
  addLog("system", "Evaluator fee (5%): $0.0250 -> 0xE7A1...0003");
  addLog("system", "Provider payment: $0.4625 -> 0xP407...0002");
  await sleep(400);

  // Phase 8: Reputation
  document.getElementById("repCompleted").textContent = "1";
  document.getElementById("repEarned").textContent = "0.4625";
  document.getElementById("repScore").textContent = "100/100";
  addLog("hook", "afterAction triggered by complete()");
  addLog("hook", "Provider: 0xP407...0002 | Completed: 1 | Score: 100/100");
  addLog("hook", "ReputationUpdated(0xP407...0002, completed, 1, 0)");

  running = false;
  document.getElementById("runDemo").disabled = false;
}

// Initial state
setStage("open");
setChecks(null);
