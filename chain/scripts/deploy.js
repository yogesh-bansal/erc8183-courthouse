const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const usdc = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const treasury = deployer.address;
  const platformFeeBP = Number(process.env.PLATFORM_FEE_BP || 250);
  const evaluatorFeeBP = Number(process.env.EVALUATOR_FEE_BP || 500);

  console.log("Payment token (USDC):", usdc);
  console.log("Platform fee:", platformFeeBP / 100, "%");
  console.log("Evaluator fee:", evaluatorFeeBP / 100, "%");

  // Deploy AgenticCommerce
  const ACP = await ethers.getContractFactory("AgenticCommerce");
  const acp = await ACP.deploy(usdc, treasury, platformFeeBP, evaluatorFeeBP);
  await acp.waitForDeployment();
  const acpAddress = await acp.getAddress();
  console.log("AgenticCommerce deployed to:", acpAddress);

  // Deploy ReputationHook
  const Hook = await ethers.getContractFactory("ReputationHook");
  const hook = await Hook.deploy(acpAddress);
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log("ReputationHook deployed to:", hookAddress);

  // Whitelist the hook
  await acp.whitelistHook(hookAddress, true);
  console.log("ReputationHook whitelisted on ACP");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
