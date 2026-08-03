// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Escrow.sol";

contract EscrowHandler is Test {
    TrustlessEscrow public escrow;
    address payable public buyer;
    address payable public seller;
    address public arbiter;
    uint256 public amount;

    constructor(TrustlessEscrow _escrow, address payable _buyer, address payable _seller, address _arbiter) {
        escrow = _escrow;
        buyer = _buyer;
        seller = _seller;
        arbiter = _arbiter;
        amount = _escrow.amount();
    }

    function deposit() external {
        if (escrow.currentState() != TrustlessEscrow.State.AwaitingPayment) return;
        if (address(this).balance < amount) return;
        vm.prank(buyer);
        escrow.deposit{value: amount}();
    }

    function confirmDelivery() external {
        if (escrow.currentState() != TrustlessEscrow.State.AwaitingDelivery) return;
        vm.prank(buyer);
        escrow.confirmDelivery();
    }

    function raiseDispute(bool fromSeller) external {
        if (escrow.currentState() != TrustlessEscrow.State.AwaitingDelivery) return;
        address actor = fromSeller ? seller : buyer;
        vm.prank(actor);
        escrow.raiseDispute();
    }

    function resolveDispute(bool toSeller) external {
        if (escrow.currentState() != TrustlessEscrow.State.Disputed) return;
        address payable recipient = toSeller ? seller : buyer;
        vm.prank(arbiter);
        escrow.resolveDispute(recipient);
    }

    function refund() external {
        if (escrow.currentState() != TrustlessEscrow.State.AwaitingDelivery) return;
        if (block.timestamp <= escrow.deadline()) return;
        vm.prank(buyer);
        escrow.refund();
    }

    function resolveAfterDeadline(bool toSeller) external {
        if (escrow.currentState() != TrustlessEscrow.State.AwaitingDelivery) return;
        if (block.timestamp <= escrow.deadline()) return;
        address payable recipient = toSeller ? seller : buyer;
        vm.prank(arbiter);
        escrow.resolveAfterDeadline(recipient);
    }

    function advanceTime(uint256 secondsToAdvance) external {
        vm.warp(block.timestamp + secondsToAdvance);
    }
}

contract EscrowInvariantTest is Test {
    TrustlessEscrow escrow;
    EscrowHandler handler;

    address payable buyer = payable(address(0x1));
    address payable seller = payable(address(0x2));
    address arbiter = address(0x3);
    uint256 escrowAmount = 1 ether;

    function setUp() public {
        vm.deal(buyer, 100 ether);
        vm.prank(buyer);
        escrow = new TrustlessEscrow(seller, arbiter, escrowAmount, block.timestamp + 1000);
        handler = new EscrowHandler(escrow, buyer, seller, arbiter);
        vm.deal(address(handler), 100 ether);
        targetContract(address(handler));
    }

    /// @dev Funds never get stuck: the escrow either holds nothing or exactly the escrow amount.
    function invariant_BalanceIsZeroOrAmount() public view {
        uint256 bal = address(escrow).balance;
        assert(bal == 0 || bal == escrowAmount);
    }

    /// @dev The amount held must match the state: funds are deposited when delivery is awaited
    ///      (or disputed) and fully paid out in every terminal state.
    function invariant_FundsMatchState() public view {
        TrustlessEscrow.State state = escrow.currentState();
        uint256 bal = address(escrow).balance;
        if (state == TrustlessEscrow.State.AwaitingPayment) {
            assert(bal == 0);
        } else if (state == TrustlessEscrow.State.AwaitingDelivery || state == TrustlessEscrow.State.Disputed) {
            assert(bal == escrowAmount);
        } else {
            assert(bal == 0);
        }
    }
}
