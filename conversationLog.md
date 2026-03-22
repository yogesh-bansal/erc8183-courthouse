# ERC-8183 Courthouse — Build Log

## Why a Job Marketplace?

ERC-8183 (Agentic Commerce Protocol) was published March 10, 2026 — 12 days before the hackathon deadline. It defines a job-based escrow with Client/Provider/Evaluator roles. Most teams will build minimal "create job, complete job" demos. We built a multi-agent marketplace to show what ERC-8183 actually enables.

The key insight: ERC-8183 isn't just an escrow. It's a coordination protocol for autonomous agents. The three-role separation (client, provider, evaluator) maps naturally to a marketplace where agents can hire each other without trust.

## Design Decisions

### Three Autonomous Agents

We split the system into three independent agents rather than one monolithic script:

1. **Client Agent** — posts jobs, funds escrow, monitors status
2. **Provider Agent** — discovers open jobs, executes work, submits deliverables
3. **Evaluator Agent** — reviews quality, approves or rejects with reason hashes

Each agent has its own private key and operates independently. In production, these would run as separate services.

### x402 Service Integration

The Provider Agent executes work using three x402-compatible services:

- **x402-proxy** ($0.01) — fetches source material from the web
- **x402-llm-bot** ($0.01) — runs LLM analysis on the source material
- **x402-pastebin** ($0.01) — stores the deliverable for retrieval

This demonstrates that ERC-8183 jobs aren't just token transfers — agents can use real tools and incur real costs, with the job budget covering their expenses.

### ReputationHook (IACPHook Extension)

The novel contribution is `ReputationHook.sol`, which implements the `IACPHook` interface from ERC-8183. On every `complete()` or `reject()` call, the hook:

- Reads the job state from the ACP contract
- Updates the provider's completed/rejected counters
- Tracks total earnings and last active timestamp
- Exposes `getScore(address)` returning 0-100

This enables reputation-gated job discovery — future clients can filter providers by track record before assigning work.

### Contract Simplifications

We simplified the reference implementation in a few ways:

- Non-upgradeable (removed UUPS proxy for hackathon simplicity)
- Single payment token (USDC on Base)
- Fixed fee structure in basis points (2.5% platform, 5% evaluator)

The full ERC-8183 spec supports upgradeable contracts and flexible token configuration. Our implementation focuses on demonstrating the lifecycle and hook system.

### Deliverable Hashing

Providers submit `keccak256(JSON.stringify(artifacts))` as the deliverable hash. The actual deliverable is stored off-chain (via x402-pastebin). This keeps on-chain costs minimal while providing verifiable proof of what was submitted.

## What We'd Add With More Time

- Web dashboard for browsing open jobs and provider reputation
- Dispute resolution flow (evaluator rejects → client can appeal)
- Multi-evaluator consensus (require 2-of-3 evaluators to agree)
- Job templates for common task types
- Provider staking for quality guarantees
