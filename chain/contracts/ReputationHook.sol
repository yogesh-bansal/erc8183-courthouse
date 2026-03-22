// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./interfaces/IACPHook.sol";
import "./interfaces/IACP.sol";

/// @title ReputationHook — On-chain agent reputation via ERC-8183 hooks
/// @notice Tracks job completions and rejections for providers.
///         Computes a 0-100 reputation score queryable by any agent.
contract ReputationHook is IACPHook, ERC165 {
    struct Reputation {
        uint256 completed;
        uint256 rejected;
        uint256 totalEarned;
        uint256 lastActiveAt;
    }

    address public immutable acp;
    mapping(address => Reputation) public reputations;

    event ReputationUpdated(address indexed agent, string action, uint256 completed, uint256 rejected);

    constructor(address _acp) {
        require(_acp != address(0), "zero acp");
        acp = _acp;
    }

    modifier onlyACP() {
        require(msg.sender == acp, "only ACP");
        _;
    }

    function beforeAction(uint256, bytes4, bytes calldata) external onlyACP {
        // no pre-action checks for reputation
    }

    function afterAction(uint256 jobId, bytes4 selector, bytes calldata) external onlyACP {
        IACP acpContract = IACP(acp);
        IACP.Job memory job = acpContract.getJob(jobId);

        if (selector == IACP.complete.selector) {
            Reputation storage rep = reputations[job.provider];
            rep.completed++;
            rep.totalEarned += job.budget;
            rep.lastActiveAt = block.timestamp;
            emit ReputationUpdated(job.provider, "completed", rep.completed, rep.rejected);
        }

        if (selector == IACP.reject.selector) {
            // Only count provider rejections (evaluator rejected their work)
            if (job.provider != address(0)) {
                Reputation storage rep = reputations[job.provider];
                rep.rejected++;
                rep.lastActiveAt = block.timestamp;
                emit ReputationUpdated(job.provider, "rejected", rep.completed, rep.rejected);
            }
        }
    }

    function getReputation(address agent) external view returns (Reputation memory) {
        return reputations[agent];
    }

    function getScore(address agent) external view returns (uint256) {
        Reputation memory rep = reputations[agent];
        uint256 total = rep.completed + rep.rejected;
        if (total == 0) return 0;
        return (rep.completed * 100) / total;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IACPHook).interfaceId || super.supportsInterface(interfaceId);
    }
}
