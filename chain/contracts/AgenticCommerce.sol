// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "./interfaces/IACP.sol";
import "./interfaces/IACPHook.sol";

/// @title AgenticCommerce — ERC-8183 Reference Implementation
/// @notice Job-based escrow for trustless agent-to-agent commerce.
///         Client funds work, Provider executes, Evaluator judges.
contract AgenticCommerce is IACP, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ERC165Checker for address;

    IERC20 public immutable paymentToken;
    address public admin;
    address public platformTreasury;
    uint256 public platformFeeBP;
    uint256 public evaluatorFeeBP;

    uint256 public jobCounter;
    mapping(uint256 => Job) internal _jobs;
    mapping(uint256 => bool) internal _hasBudget;
    mapping(address => bool) public whitelistedHooks;

    uint256 private constant MAX_FEE_BP = 2000; // 20 %
    uint256 private constant MIN_EXPIRY_OFFSET = 5 minutes;

    error InvalidJob();
    error WrongStatus();
    error Unauthorized();
    error ZeroAddress();
    error ExpiryTooShort();
    error ZeroBudget();
    error ProviderNotSet();
    error FeesTooHigh();
    error HookNotWhitelisted();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    constructor(
        address paymentToken_,
        address treasury_,
        uint256 platformFeeBP_,
        uint256 evaluatorFeeBP_
    ) {
        if (paymentToken_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (platformFeeBP_ + evaluatorFeeBP_ > MAX_FEE_BP) revert FeesTooHigh();

        paymentToken = IERC20(paymentToken_);
        platformTreasury = treasury_;
        platformFeeBP = platformFeeBP_;
        evaluatorFeeBP = evaluatorFeeBP_;
        admin = msg.sender;

        whitelistedHooks[address(0)] = true; // "no hook" is always valid
    }

    // ── Admin ───────────────────────────────────────────────────────

    function setFees(uint256 platformBP, uint256 evaluatorBP) external onlyAdmin {
        if (platformBP + evaluatorBP > MAX_FEE_BP) revert FeesTooHigh();
        platformFeeBP = platformBP;
        evaluatorFeeBP = evaluatorBP;
    }

    function whitelistHook(address hook, bool status) external onlyAdmin {
        whitelistedHooks[hook] = status;
    }

    // ── Core lifecycle ──────────────────────────────────────────────

    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) external override returns (uint256) {
        if (evaluator == address(0)) revert ZeroAddress();
        if (expiredAt < block.timestamp + MIN_EXPIRY_OFFSET) revert ExpiryTooShort();
        if (!whitelistedHooks[hook]) revert HookNotWhitelisted();
        if (hook != address(0) && !hook.supportsInterface(type(IACPHook).interfaceId)) {
            revert HookNotWhitelisted();
        }

        uint256 jobId = jobCounter++;
        _jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            provider: provider,
            evaluator: evaluator,
            description: description,
            budget: 0,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: hook
        });

        emit JobCreated(jobId, msg.sender, provider, evaluator, expiredAt, hook);
        return jobId;
    }

    function setProvider(uint256 jobId, address provider_) external override {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (job.provider != address(0)) revert Unauthorized();
        if (provider_ == address(0)) revert ZeroAddress();
        if (msg.sender != job.client && msg.sender != provider_) revert Unauthorized();

        job.provider = provider_;
        emit ProviderSet(jobId, provider_);
    }

    function setBudget(uint256 jobId, uint256 amount, bytes calldata optParams) external override {
        Job storage job = _jobs[jobId];
        if (msg.sender != job.provider) revert Unauthorized();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (amount == 0) revert ZeroBudget();

        _beforeHook(jobId, IACP.setBudget.selector, optParams);

        job.budget = amount;
        _hasBudget[jobId] = true;
        emit BudgetSet(jobId, amount);

        _afterHook(jobId, IACP.setBudget.selector, optParams);
    }

    function fund(uint256 jobId, bytes calldata optParams) external override nonReentrant {
        Job storage job = _jobs[jobId];
        if (msg.sender != job.client) revert Unauthorized();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (job.provider == address(0)) revert ProviderNotSet();
        if (!_hasBudget[jobId]) revert ZeroBudget();
        if (block.timestamp >= job.expiredAt) revert WrongStatus();

        _beforeHook(jobId, IACP.fund.selector, optParams);

        paymentToken.safeTransferFrom(msg.sender, address(this), job.budget);
        job.status = JobStatus.Funded;
        emit JobFunded(jobId, msg.sender, job.budget);

        _afterHook(jobId, IACP.fund.selector, optParams);
    }

    function submit(uint256 jobId, bytes32 deliverable, bytes calldata optParams) external override {
        Job storage job = _jobs[jobId];
        if (msg.sender != job.provider) revert Unauthorized();
        // Allow submit from Funded, or from Open if zero-budget
        if (job.status == JobStatus.Funded) {
            // ok
        } else if (job.status == JobStatus.Open && !_hasBudget[jobId]) {
            // zero-budget job
        } else {
            revert WrongStatus();
        }

        _beforeHook(jobId, IACP.submit.selector, optParams);

        job.status = JobStatus.Submitted;
        emit JobSubmitted(jobId, msg.sender, deliverable);

        _afterHook(jobId, IACP.submit.selector, optParams);
    }

    function complete(uint256 jobId, bytes32 reason, bytes calldata optParams) external override nonReentrant {
        Job storage job = _jobs[jobId];
        if (msg.sender != job.evaluator) revert Unauthorized();
        if (job.status != JobStatus.Submitted) revert WrongStatus();

        _beforeHook(jobId, IACP.complete.selector, optParams);

        job.status = JobStatus.Completed;

        uint256 budget = job.budget;
        if (budget > 0) {
            uint256 platformFee = (budget * platformFeeBP) / 10000;
            uint256 evaluatorFee = (budget * evaluatorFeeBP) / 10000;
            uint256 providerPay = budget - platformFee - evaluatorFee;

            if (platformFee > 0) {
                paymentToken.safeTransfer(platformTreasury, platformFee);
            }
            if (evaluatorFee > 0) {
                paymentToken.safeTransfer(job.evaluator, evaluatorFee);
                emit EvaluatorFeePaid(jobId, job.evaluator, evaluatorFee);
            }
            paymentToken.safeTransfer(job.provider, providerPay);
            emit PaymentReleased(jobId, job.provider, providerPay);
        }

        emit JobCompleted(jobId, msg.sender, reason);

        _afterHook(jobId, IACP.complete.selector, optParams);
    }

    function reject(uint256 jobId, bytes32 reason, bytes calldata optParams) external override nonReentrant {
        Job storage job = _jobs[jobId];

        bool clientRejectOpen = (msg.sender == job.client && job.status == JobStatus.Open);
        bool evaluatorReject = (msg.sender == job.evaluator &&
            (job.status == JobStatus.Funded || job.status == JobStatus.Submitted));

        if (!clientRejectOpen && !evaluatorReject) revert Unauthorized();

        _beforeHook(jobId, IACP.reject.selector, optParams);

        job.status = JobStatus.Rejected;

        // Refund if funded
        if (job.budget > 0 && (evaluatorReject)) {
            paymentToken.safeTransfer(job.client, job.budget);
            emit Refunded(jobId, job.client, job.budget);
        }

        emit JobRejected(jobId, msg.sender, reason);

        _afterHook(jobId, IACP.reject.selector, optParams);
    }

    function claimRefund(uint256 jobId) external override nonReentrant {
        Job storage job = _jobs[jobId];
        if (block.timestamp < job.expiredAt) revert WrongStatus();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();

        job.status = JobStatus.Expired;
        paymentToken.safeTransfer(job.client, job.budget);

        emit JobExpired(jobId);
        emit Refunded(jobId, job.client, job.budget);
    }

    function getJob(uint256 jobId) external view override returns (Job memory) {
        return _jobs[jobId];
    }

    // ── Hooks ───────────────────────────────────────────────────────

    function _beforeHook(uint256 jobId, bytes4 selector, bytes calldata data) internal {
        address hook = _jobs[jobId].hook;
        if (hook != address(0)) {
            IACPHook(hook).beforeAction(jobId, selector, data);
        }
    }

    function _afterHook(uint256 jobId, bytes4 selector, bytes calldata data) internal {
        address hook = _jobs[jobId].hook;
        if (hook != address(0)) {
            IACPHook(hook).afterAction(jobId, selector, data);
        }
    }
}
