# Build Spec — ERC-8183 Courthouse

**Track:** ERC-8183 Open Build — Best Overall (`49c3d90b1f084c44a3585231dc733f83`)
**Secondary:** Synthesis Open Track (`fdb76d08812b43f6a5f454744b66f590`)
**Team:** Omniacs DAO

---

## Product Concept

**ERC-8183 Courthouse** is a multi-agent job board that makes the standard legible.

The goal of this repo is not to disguise ERC-8183 behind a generic AI app. The point is to show, clearly and concretely, how the standard can coordinate:

- a **Client** that opens a job
- a **Provider** that claims or is assigned work
- an **Evaluator** that independently decides whether the deliverable passes
- a **Hook** that records reputation after outcomes are finalized

The agent layer exists to exercise the protocol, not to overshadow it.

## Why This Fits the Track

- **Built directly on ERC-8183:** the contract implements the core lifecycle around job escrow
- **Demonstrates the standard's value:** provider assignment, budget setting, funding, submission, evaluation, completion, rejection, and refund paths are all explicit
- **Shows extensibility:** `ReputationHook.sol` extends behavior without modifying the core escrow rules
- **Keeps the standard load-bearing:** the interesting part is the marketplace state machine, not an external infra dependency

## Implemented Scope

### Contracts

`chain/contracts/AgenticCommerce.sol` implements:

- job creation
- optional provider preset at creation
- provider slot filling through `setProvider()`
- provider self-claim when the slot is empty
- provider budget proposal
- client funding in USDC
- provider deliverable submission
- evaluator completion or rejection
- client refund after expiry
- hook callbacks before and after protocol actions

`chain/contracts/ReputationHook.sol` implements a simple reputation extension that tracks outcomes per provider.

This submission uses a custom, non-upgradeable implementation. It is not a proxy-based deployment.

### Agent layer

`src/client-agent.mjs`, `src/provider-agent.mjs`, and `src/evaluator-agent.mjs` are lightweight agents that exercise the lifecycle:

- the client opens and funds work
- the provider discovers open jobs, self-claims them, proposes budget, and submits deliverables
- the evaluator finalizes the job based on the submitted artifact

The current demo uses deterministic simulated work artifacts instead of live x402-backed execution. That is intentional: the repo is meant to prove ERC-8183 coordination behavior cleanly, without pretending an external tool marketplace is already fully wired.

## Architecture

```text
Client agent ─┐
Provider agent├──> AgenticCommerce.sol (ERC-8183 escrow)
Evaluator agent┘             │
                             └──> ReputationHook.sol
```

## File Map

```text
erc8183-courthouse/
├── README.md
├── BUILD.md
├── conversationLog.md
├── submission.template.json
├── agent.json
├── .env.example
├── src/
│   ├── client-agent.mjs
│   ├── provider-agent.mjs
│   ├── evaluator-agent.mjs
│   ├── config.mjs
│   └── demo.mjs
├── chain/
│   ├── contracts/
│   │   ├── AgenticCommerce.sol
│   │   ├── ReputationHook.sol
│   │   └── interfaces/
│   │       ├── IACP.sol
│   │       └── IACPHook.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── hardhat.config.ts
│   └── package.json
├── examples/
│   ├── sample-job.json
│   ├── sample-deliverable.json
│   └── sample-evaluation.json
└── web/
    ├── index.html
    ├── app.js
    └── styles.css
```

## Demo Story

1. Client creates a job with evaluator, expiry, and description.
2. Provider discovers an open job and claims the empty provider slot.
3. Provider proposes a budget.
4. Client funds escrow in USDC.
5. Provider generates a deterministic demo deliverable and submits its hash.
6. Evaluator scores the deliverable and either completes or rejects the job.
7. If completed, the contract splits funds among provider, evaluator, and platform treasury.
8. Reputation hook records the outcome.

## Honest Boundaries

- The repo is **ERC-8183-first**, not a live x402 marketplace
- Work execution in the current demo is simulated, not paid through production endpoints
- There is no staking, auction routing, or multi-provider bidding layer yet
- The hook is intentionally simple and scoped to provider reputation

That honesty is a strength here. A reviewer can clearly see what is real: the escrow lifecycle, role separation, payment paths, and extensibility model.

## Environment

```bash
# Chain
BASE_RPC_URL=https://mainnet.base.org
BASE_CHAIN_ID=8453

# Agent wallets
CLIENT_PRIVATE_KEY=
PROVIDER_PRIVATE_KEY=
EVALUATOR_PRIVATE_KEY=

# Contracts
ACP_CONTRACT_ADDRESS=
REPUTATION_HOOK_ADDRESS=
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Optional demo service URLs
X402_LLM_URL=https://omniac.0000402.xyz/ask
X402_PROXY_URL=https://proxy.0000402.xyz/fetch
X402_PASTEBIN_URL=https://pastebin.0000402.xyz/paste

# Optional external payment wallet for future live execution
X402_PRIVATE_KEY=
X402_WALLET_ADDRESS=

# Platform config
PLATFORM_FEE_BP=250
EVALUATOR_FEE_BP=500
```

## Submission Notes

- Keep the README and demo language aligned with the actual repo: provider self-claim is real, live x402 execution is not yet.
- Before submission, replace all template placeholders with real deploy, repo, video, and screenshot links.
