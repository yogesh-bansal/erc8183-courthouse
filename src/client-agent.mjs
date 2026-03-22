/**
 * Client Agent — Posts and funds jobs on the ERC-8183 marketplace.
 *
 * Lifecycle:
 *   1. Create a job with description, evaluator, expiry, and hook
 *   2. Wait for a provider to claim it and set a budget
 *   3. Approve USDC and fund the escrow
 *   4. Monitor until completion or expiry
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, parseAbi, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { ACP_ADDRESS, USDC_ADDRESS, HOOK_ADDRESS, ACP_ABI, ERC20_ABI, JOB_STATUS, BASE_RPC } from "./config.mjs";

const acpAbi = parseAbi(ACP_ABI);
const erc20Abi = parseAbi(ERC20_ABI);

export function createClientAgent(privateKey) {
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(BASE_RPC) });

  return {
    address: account.address,

    async postJob(description, evaluatorAddress, expirySeconds = 3600) {
      const expiredAt = BigInt(Math.floor(Date.now() / 1000) + expirySeconds);
      const hook = HOOK_ADDRESS || "0x0000000000000000000000000000000000000000";

      const hash = await walletClient.writeContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "createJob",
        args: [
          "0x0000000000000000000000000000000000000000", // open for bidding
          evaluatorAddress,
          expiredAt,
          description,
          hook,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      // Parse jobId from event
      const jobCreatedTopic = keccak256(toBytes("JobCreated(uint256,address,address,address,uint256,address)"));
      const log = receipt.logs.find((l) => l.topics[0] === jobCreatedTopic);
      const jobId = log ? BigInt(log.topics[1]) : 0n;

      return { jobId: Number(jobId), hash };
    },

    async fundJob(jobId, budgetUSDC) {
      const amount = parseUnits(String(budgetUSDC), 6);

      // Approve
      await walletClient.writeContract({
        abi: erc20Abi,
        address: USDC_ADDRESS,
        functionName: "approve",
        args: [ACP_ADDRESS, amount],
      });

      // Fund
      const hash = await walletClient.writeContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "fund",
        args: [BigInt(jobId), "0x"],
      });

      return publicClient.waitForTransactionReceipt({ hash });
    },

    async getJob(jobId) {
      const job = await publicClient.readContract({
        abi: acpAbi,
        address: ACP_ADDRESS,
        functionName: "getJob",
        args: [BigInt(jobId)],
      });
      return { ...job, statusName: JOB_STATUS[Number(job.status)] };
    },
  };
}
