// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TrustlessEscrow
 * @author Amine Mabrouk
 * @notice Trust-minimized state machine escrow contract with an absolute deadline,
 *         a buyer refund path, gas optimizations, and reentrancy protection.
 */
contract TrustlessEscrow {
    enum State { AwaitingPayment, AwaitingDelivery, Complete, Disputed, Resolved, Refunded }

    // State Variables
    address payable public immutable buyer;
    address payable public immutable seller;
    address public immutable arbiter;
    uint256 public immutable amount;
    uint256 public immutable deadline;

    State public currentState;
    bool private locked; // Custom reentrancy lock

    // Events
    event Deposited(address indexed buyer, uint256 amount);
    event DeliveryConfirmed(address indexed seller, uint256 amount);
    event DisputeOpened(address indexed initiator);
    event DisputeResolved(address indexed recipient, uint256 amount);
    event Refunded(address indexed buyer, uint256 amount);

    // Custom Errors (Gas Efficiency)
    error Unauthorized();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidDeadline();
    error InvalidState(State current, State expected);
    error IncorrectAmount(uint256 expected, uint256 received);
    error NotYetRefundable(uint256 deadline);
    error ReentrancyGuard();
    error TransferFailed();

    // Modifiers
    modifier onlyBuyer() {
        if (msg.sender != buyer) revert Unauthorized();
        _;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert Unauthorized();
        _;
    }

    modifier inState(State expectedState) {
        if (currentState != expectedState) revert InvalidState(currentState, expectedState);
        _;
    }

    modifier nonReentrant() {
        if (locked) revert ReentrancyGuard();
        locked = true;
        _;
        locked = false;
    }

    constructor(address payable _seller, address _arbiter, uint256 _amount, uint256 _deadline) {
        if (_seller == address(0) || _arbiter == address(0)) revert ZeroAddress();
        if (_amount == 0) revert ZeroAmount();
        if (_deadline <= block.timestamp) revert InvalidDeadline();
        buyer = payable(msg.sender);
        seller = _seller;
        arbiter = _arbiter;
        amount = _amount;
        deadline = _deadline;
        currentState = State.AwaitingPayment;
    }

    /// @notice Buyer deposits the required ETH into the escrow.
    function deposit() external payable onlyBuyer inState(State.AwaitingPayment) {
        if (msg.value != amount) revert IncorrectAmount(amount, msg.value);

        currentState = State.AwaitingDelivery;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Buyer confirms receipt of goods/services; funds released to seller (CEI Pattern).
    function confirmDelivery() external onlyBuyer inState(State.AwaitingDelivery) nonReentrant {
        // 1. Effects
        currentState = State.Complete;

        // 2. Interactions
        emit DeliveryConfirmed(seller, amount);
        (bool success, ) = seller.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Buyer or Seller opens a dispute while delivery is awaited.
    function raiseDispute() external inState(State.AwaitingDelivery) {
        if (msg.sender != buyer && msg.sender != seller) revert Unauthorized();

        currentState = State.Disputed;
        emit DisputeOpened(msg.sender);
    }

    /// @notice Buyer recovers the full deposit once the deadline has passed while delivery
    ///         is still awaited. Terminal state. Refundable strictly after the deadline.
    function refund() external onlyBuyer inState(State.AwaitingDelivery) nonReentrant {
        if (block.timestamp <= deadline) revert NotYetRefundable(deadline);

        // 1. Effects
        currentState = State.Refunded;

        // 2. Interactions
        emit Refunded(buyer, amount);
        (bool success, ) = buyer.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Arbiter resolves the dispute all-or-nothing, in favor of either the buyer or the seller.
    function resolveDispute(address payable recipient) external onlyArbiter inState(State.Disputed) nonReentrant {
        if (recipient != buyer && recipient != seller) revert Unauthorized();

        // 1. Effects
        currentState = State.Resolved;

        // 2. Interactions
        emit DisputeResolved(recipient, amount);
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
