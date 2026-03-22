/**
 * Evaluator Agent — Reviews submitted deliverables and judges quality.
 *
 * Lifecycle:
 *   1. Watch for Submitted jobs where this agent is the evaluator
 *   2. Retrieve the deliverable
 *   3. Score quality (using LLM or heuristics)
 *   4. Call complete() if satisfactory or reject() if not
 */

import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { ACP_ADDRESS, ACP_ABI, HOOK_ADDRESS, HOOK_ABI, JOB_STATUS, BASE_RPC } from "./config.mjs";

const acpAbi = parseAbi(ACP_ABI);
const hookAbi = parseAbi(HOOK_ABI);

export function createEvaluatorAgent(privateKey) {
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(BASE_RPC) });

  return {
    address: account.address,

    async findSubmittedJobs() {
      const count = await publicClient.readContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "jobCounter",
      });

      const submitted = [];
      for (let i = 0; i < Number(count); i++) {
        const job = await publicClient.readContract({
          abi: acpAbi,
          address: ACP_ADDRESS,
          functionName: "getJob",
          args: [BigInt(i)],
        });
        if (Number(job.status) === 2 && job.evaluator.toLowerCase() === account.address.toLowerCase()) {
          submitted.push({ ...job, statusName: JOB_STATUS[Number(job.status)] });
        }
      }
      return submitted;
    },

    async evaluate(artifacts, jobDescription) {
      // In production, this would use x402-llm-bot for quality assessment.
      // For the demo, use heuristic scoring.
      console.log("    [evaluator] Reviewing deliverable quality...");

      const checks = {
        hasSummary: !!artifacts.analysis?.summary,
        hasFindings: Array.isArray(artifacts.analysis?.findings) && artifacts.analysis.findings.length >= 2,
        hasConfidence: typeof artifacts.analysis?.confidence === "number" && artifacts.analysis.confidence > 0.5,
        hasStorage: !!artifacts.storageUrl,
        relevantToJob: artifacts.analysis?.summary?.toLowerCase().includes(jobDescription.toLowerCase().slice(0, 20)),
      };

      const passed = Object.values(checks).filter(Boolean).length;
      const total = Object.keys(checks).length;
      const score = Math.round((passed / total) * 10);

      return {
        score,
        pass: score >= 6,
        checks,
        reason: score >= 6
          ? `Deliverable meets quality bar (${score}/10). ${passed}/${total} checks passed.`
          : `Deliverable below quality bar (${score}/10). ${passed}/${total} checks passed.`,
      };
    },

    async completeJob(jobId, reason) {
      const reasonHash = keccak256(toBytes(reason));
      const hash = await walletClient.writeContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "complete",
        args: [BigInt(jobId), reasonHash, "0x"],
      });
      return publicClient.waitForTransactionReceipt({ hash });
    },

    async rejectJob(jobId, reason) {
      const reasonHash = keccak256(toBytes(reason));
      const hash = await walletClient.writeContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "reject",
        args: [BigInt(jobId), reasonHash, "0x"],
      });
      return publicClient.waitForTransactionReceipt({ hash });
    },

    async getProviderReputation(providerAddress) {
      if (!HOOK_ADDRESS) return null;
      return publicClient.readContract({
        abi: hookAbi,
        address: HOOK_ADDRESS,
        functionName: "getReputation",
        args: [providerAddress],
      });
    },
  };
}
