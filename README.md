# ERC-8183 Courthouse

**Multi-agent job coordination system built on the Agentic Commerce Protocol (ERC-8183).**

ERC-8183 Courthouse demonstrates how three autonomous agents — Client, Provider, and Evaluator — can coordinate through ERC-8183's on-chain escrow to manage the full job lifecycle: posting, funding, execution, evaluation, and payment distribution. A custom ReputationHook tracks provider performance across jobs.

The Client agent opens jobs and funds escrow. The Provider agent discovers open jobs and can self-claim the provider slot by calling `setProvider(jobId, self)` when it is empty, then proposes budget and submits a deliverable. The Evaluator agent reviews deliverables and triggers payout or rejection. The current repo uses deterministic simulated x402-shaped work artifacts in the demo so the ERC-8183 lifecycle remains the center of gravity.

## Track Alignment

### Primary: ERC-8183 Open Build — Best Overall

Track UUID: `49c3d90b1f084c44a3585231dc733f83`

Why it fits:

| Track requirement | How Courthouse fits |
|---|---|
| Build on top of ERC-8183 | The repo ships a full AgenticCommerce.sol implementation built around the ERC-8183 lifecycle |
| Demonstrate the standard's value | Three agents use the complete lifecycle: create → fund → submit → evaluate → pay |
| Novel extension | ReputationHook implements IACPHook to track provider scores across jobs |
| Real agent coordination | Client opens jobs, provider self-claims or is assigned into the provider slot, evaluator judges quality independently |
| Payment handling | USDC escrow with platform fee (2.5%) and evaluator fee (5%) in basis points |

### Secondary: Synthesis Open Track

Track UUID: `fdb76d08812b43f6a5f454744b66f590`

Why it fits:

- Multi-agent coordination product with on-chain settlement
- Demonstrates how AI agents can participate in trustless commerce
- Demonstrates ERC-8183 escrow as the coordination primitive for multi-agent work

## Problem

AI agents can generate value, but there is no trustless way for them to hire each other:

- **No escrow** — if Agent A pays Agent B upfront, B can disappear with the funds
- **No quality assurance** — who decides if the work is good enough?
- **No reputation** — how do you know which agent to hire?
- **No standard** — every agent-to-agent payment is a bespoke integration

## Solution

ERC-8183 defines a job-based escrow protocol with three roles. Courthouse operationalizes it into a coordinated agent system:

1. **Client Agent** posts a job with description, evaluator, and expiry, then funds USDC escrow after a provider slot is filled and a budget is agreed.
2. **Provider Agent** discovers open jobs, self-claims the provider slot when it is empty, proposes budget, executes the work in the demo via deterministic x402-shaped artifacts, and submits a deliverable hash on-chain.
3. **Evaluator Agent** retrieves the deliverable, runs quality checks, and calls `complete()` or `reject()`. On completion, escrow releases payment to provider and evaluator.
4. **ReputationHook** fires on every state transition, tracking completed/rejected counts and total earnings per provider.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client      │     │  Provider    │     │  Evaluator   │
│  Agent       │     │  Agent       │     │  Agent       │
│ (posts jobs) │     │ (does work)  │     │ (judges)     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────┬───────┴────────────────────┘
                    │
             ┌──────┴───────┐      ┌──────────────┐
             │ AgenticCommerce│────>│ ReputationHook│
             │  (ERC-8183)  │     │  (IACPHook)  │
             │  USDC Escrow │     │  Score 0-100 │
             └──────────────┘     └──────────────┘
```

### Components

| Component | Path | Purpose |
|---|---|---|
| AgenticCommerce.sol | `chain/contracts/` | ERC-8183 reference implementation with USDC escrow |
| ReputationHook.sol | `chain/contracts/` | IACPHook that tracks provider reputation scores |
| IACP.sol | `chain/contracts/interfaces/` | Full ERC-8183 interface |
| IACPHook.sol | `chain/contracts/interfaces/` | Hook interface extending ERC-165 |
| Client Agent | `src/client-agent.mjs` | Posts jobs, funds escrow, monitors completion |
| Provider Agent | `src/provider-agent.mjs` | Discovers jobs, self-claims open work, simulates execution, submits deliverables |
| Evaluator Agent | `src/evaluator-agent.mjs` | Reviews deliverables, scores quality, approves/rejects |
| Config | `src/config.mjs` | Chain config, ABIs, and optional future execution settings |
| Demo | `src/demo.mjs` | Offline simulation of full 8-phase job lifecycle |

### ERC-8183 State Machine

```
Open ──fund()──> Funded ──submit()──> Submitted ──complete()──> Completed
  │                │                      │
  │ reject()       │ reject()             │ reject()
  v                v                      v
Rejected         Rejected              Rejected
```

### Payment Distribution

On `complete()`, escrow splits the budget:

- **Provider**: budget - platform fee - evaluator fee
- **Evaluator**: configurable fee (default 5%)
- **Platform**: configurable fee (default 2.5%)

### ReputationHook (IACPHook)

The novel contribution: a hook contract that implements `beforeAction()` and `afterAction()` from the ERC-8183 hook interface.

On every `complete()` or `reject()`, the hook:
- Increments the provider's completed/rejected counter
- Updates total earnings
- Records last active timestamp
- Exposes `getScore(address) → uint256` returning 0-100

This enables future job clients to filter providers by track record.

## Quick Start

### Prerequisites

- Node.js 18+
- A Base RPC endpoint (default: `https://mainnet.base.org`)

### Run the Demo

```bash
npm install
node src/demo.mjs
```

This runs an offline simulation of the full job lifecycle across 8 phases with colored output.

### Deploy Contracts

```bash
cd chain
npm install
cp ../.env.example ../.env  # fill in private keys
npx hardhat compile
npx hardhat run scripts/deploy.js --network base
```

### Run Individual Agents

```bash
# Client: post and fund a job
node -e "import('./src/client-agent.mjs').then(m => m.createClientAgent(process.env.CLIENT_PRIVATE_KEY))"

# Provider: discover, claim, and execute jobs
node -e "import('./src/provider-agent.mjs').then(m => m.createProviderAgent(process.env.PROVIDER_PRIVATE_KEY))"

# Evaluator: review and judge deliverables
node -e "import('./src/evaluator-agent.mjs').then(m => m.createEvaluatorAgent(process.env.EVALUATOR_PRIVATE_KEY))"
```

## Demo Output

```
═══════════════════════════════════════════════════════════
  ERC-8183 Courthouse — Agent Job Board Demo
═══════════════════════════════════════════════════════════

── Phase 1: Job Creation
   [CLIENT] Posting job: "Analyze Ethereum L2 scaling solutions"
   [SYSTEM] → createJob() → Job #0 created

── Phase 2: Provider Discovery & Claim
   [PROVIDER] Found 1 open job → self-claiming provider slot...
   [HOOK] → afterAction: budget logged

── Phase 3: Escrow Funding
   [CLIENT] Funding 0.50 USDC escrow
   [SYSTEM] → Status: Open → Funded

── Phase 4: Work Execution (Demo Artifacts)
   [PROVIDER] Building source artifact ✓
   [PROVIDER] Generating structured analysis artifact ✓
   [PROVIDER] Producing deliverable payload ✓

── Phase 5: Deliverable Submission
   [SYSTEM] → Status: Funded → Submitted

── Phase 6: Quality Evaluation
   [EVALUATOR] ✓ Has summary, ✓ Has findings, ✓ Confidence > 0.5
   [EVALUATOR] Score: 10/10 — PASS

── Phase 7: Payment Distribution
   Platform fee (2.5%): $0.0125
   Evaluator fee (5%): $0.0250
   Provider payment: $0.4625

── Phase 8: Reputation Update (IACPHook)
   [HOOK] Jobs completed: 1, Score: 100/100
```

## Team

Omniacs DAO — building at Synthesis 2026.
