/**
 * Provider Agent — Discovers open jobs, executes work, and submits deliverables.
 *
 * Lifecycle:
 *   1. Scan for Open jobs via contract reads
 *   2. Claim a job by filling the open provider slot
 *   3. Set a budget proposal
 *   4. After funding, generate the demo work artifacts
 *   5. Submit deliverable hash on-chain
 */

import { createPublicClient, createWalletClient, http, parseUnits, parseAbi, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { ACP_ADDRESS, ACP_ABI, JOB_STATUS, BASE_RPC } from "./config.mjs";

const acpAbi = parseAbi(ACP_ABI);

export function createProviderAgent(privateKey) {
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(BASE_RPC) });

  return {
    address: account.address,

    async discoverOpenJobs() {
      const count = await publicClient.readContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "jobCounter",
      });

      const openJobs = [];
      for (let i = 0; i < Number(count); i++) {
        const job = await publicClient.readContract({
          abi: acpAbi,
          address: ACP_ADDRESS,
          functionName: "getJob",
          args: [BigInt(i)],
        });
        if (Number(job.status) === 0 && job.provider === "0x0000000000000000000000000000000000000000") {
          openJobs.push({ ...job, statusName: JOB_STATUS[Number(job.status)] });
        }
      }
      return openJobs;
    },

    async proposeBudget(jobId, budgetUSDC) {
      const amount = parseUnits(String(budgetUSDC), 6);
      const hash = await walletClient.writeContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "setBudget",
        args: [BigInt(jobId), amount, "0x"],
      });
      return publicClient.waitForTransactionReceipt({ hash });
    },

    async claimJob(jobId) {
      const hash = await walletClient.writeContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "setProvider",
        args: [BigInt(jobId), account.address],
      });
      return publicClient.waitForTransactionReceipt({ hash });
    },

    async executeWork(jobDescription) {
      const artifacts = {};

      // Step 1: Build deterministic source material (x402-shaped but simulated in demo)
      console.log("    [provider] Building source artifact...");
      artifacts.sourceData = `Research data for: ${jobDescription}`;

      // Step 2: Produce structured analysis artifact (simulated in demo)
      console.log("    [provider] Generating structured analysis artifact...");
      artifacts.analysis = {
        summary: `Analysis of "${jobDescription}"`,
        findings: [
          "Finding 1: The topic shows significant growth trends",
          "Finding 2: Key risks identified in governance structure",
          "Finding 3: Market positioning is competitive",
        ],
        confidence: 0.85,
      };

      // Step 3: Produce a storage-style reference (simulated in demo)
      console.log("    [provider] Producing deliverable reference...");
      artifacts.storageUrl = `https://pastebin.0000402.xyz/p/demo-${Date.now()}`;

      return artifacts;
    },

    async submitDeliverable(jobId, artifacts) {
      const deliverableHash = keccak256(toBytes(JSON.stringify(artifacts)));

      const hash = await walletClient.writeContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "submit",
        args: [BigInt(jobId), deliverableHash, "0x"],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return { deliverableHash, txHash: hash, receipt };
    },
  };
}
