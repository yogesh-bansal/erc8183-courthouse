import "dotenv/config";

export const BASE_RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";
export const BASE_CHAIN_ID = Number(process.env.BASE_CHAIN_ID || 8453);

export const ACP_ADDRESS = process.env.ACP_CONTRACT_ADDRESS || "";
export const HOOK_ADDRESS = process.env.REPUTATION_HOOK_ADDRESS || "";
export const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const X402_LLM_URL = process.env.X402_LLM_URL || "https://omniac.0000402.xyz/ask";
export const X402_PROXY_URL = process.env.X402_PROXY_URL || "https://proxy.0000402.xyz/fetch";
export const X402_PASTEBIN_URL = process.env.X402_PASTEBIN_URL || "https://pastebin.0000402.xyz/paste";

export const ACP_ABI = [
  "function createJob(address provider, address evaluator, uint256 expiredAt, string description, address hook) returns (uint256)",
  "function setProvider(uint256 jobId, address provider_)",
  "function setBudget(uint256 jobId, uint256 amount, bytes optParams)",
  "function fund(uint256 jobId, bytes optParams)",
  "function submit(uint256 jobId, bytes32 deliverable, bytes optParams)",
  "function complete(uint256 jobId, bytes32 reason, bytes optParams)",
  "function reject(uint256 jobId, bytes32 reason, bytes optParams)",
  "function claimRefund(uint256 jobId)",
  "function getJob(uint256 jobId) view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook))",
  "function jobCounter() view returns (uint256)",
  "function whitelistedHooks(address) view returns (bool)",
  "event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)",
  "event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)",
  "event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason)",
  "event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason)",
  "event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount)",
];

export const HOOK_ABI = [
  "function getReputation(address agent) view returns (tuple(uint256 completed, uint256 rejected, uint256 totalEarned, uint256 lastActiveAt))",
  "function getScore(address agent) view returns (uint256)",
  "event ReputationUpdated(address indexed agent, string action, uint256 completed, uint256 rejected)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

// Job statuses matching the enum
export const JOB_STATUS = ["Open", "Funded", "Submitted", "Completed", "Rejected", "Expired"];
