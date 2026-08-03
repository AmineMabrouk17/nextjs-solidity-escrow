// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Escrow.sol";

contract EscrowTest is Test {
    TrustlessEscrow escrow;

    address payable buyer = payable(address(0x1));
    address payable seller = payable(address(0x2));
    address arbiter = address(0x3);
    address stranger = address(0x4);
    uint256 escrowAmount = 1 ether;
    uint256 deadline = 1000;

    function setUp() public {
        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        escrow = new TrustlessEscrow(seller, arbiter, escrowAmount, block.timestamp + deadline);
    }

    function _deposit() internal {
        vm.prank(buyer);
        escrow.deposit{value: escrowAmount}();
    }

    // --- Creation ---

    function test_InitialState() public view {
        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.AwaitingPayment));
        assertEq(escrow.buyer(), buyer);
        assertEq(escrow.seller(), seller);
        assertEq(escrow.arbiter(), arbiter);
        assertEq(escrow.amount(), escrowAmount);
        assertEq(escrow.deadline(), block.timestamp + deadline);
    }

    function test_Constructor_RejectsZeroAmount() public {
        vm.expectRevert(TrustlessEscrow.ZeroAmount.selector);
        new TrustlessEscrow(seller, arbiter, 0, block.timestamp + deadline);
    }

    function test_Constructor_RejectsZeroSeller() public {
        vm.expectRevert(TrustlessEscrow.ZeroAddress.selector);
        new TrustlessEscrow(payable(address(0)), arbiter, escrowAmount, block.timestamp + deadline);
    }

    function test_Constructor_RejectsZeroArbiter() public {
        vm.expectRevert(TrustlessEscrow.ZeroAddress.selector);
        new TrustlessEscrow(seller, address(0), escrowAmount, block.timestamp + deadline);
    }

    function test_Constructor_RejectsDeadlineInThePast() public {
        vm.expectRevert(TrustlessEscrow.InvalidDeadline.selector);
        new TrustlessEscrow(seller, arbiter, escrowAmount, block.timestamp - 1);
    }

    function test_Constructor_RejectsDeadlineEqualToNow() public {
        vm.expectRevert(TrustlessEscrow.InvalidDeadline.selector);
        new TrustlessEscrow(seller, arbiter, escrowAmount, block.timestamp);
    }

    // --- Deposit ---

    function test_Deposit_ExactAmount() public {
        _deposit();
        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.AwaitingDelivery));
        assertEq(address(escrow).balance, escrowAmount);
    }

    function test_DepositFuzzing(uint256 depositAmount) public {
        vm.assume(depositAmount <= buyer.balance && depositAmount != escrowAmount);

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.IncorrectAmount.selector, escrowAmount, depositAmount)
        );
        escrow.deposit{value: depositAmount}();
    }

    function test_Deposit_NotBuyerReverts() public {
        vm.deal(stranger, 10 ether);
        vm.prank(stranger);
        vm.expectRevert(TrustlessEscrow.Unauthorized.selector);
        escrow.deposit{value: escrowAmount}();
    }

    function test_Deposit_AfterDeadlineStillAllowed() public {
        vm.warp(block.timestamp + deadline + 1);
        _deposit();
        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.AwaitingDelivery));
    }

    function test_Deposit_OnlyOnce() public {
        _deposit();
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.InvalidState.selector, TrustlessEscrow.State.AwaitingDelivery, TrustlessEscrow.State.AwaitingPayment)
        );
        escrow.deposit{value: escrowAmount}();
    }

    // --- Confirm delivery ---

    function test_ConfirmDelivery_PaysSeller() public {
        _deposit();
        uint256 initialSellerBalance = seller.balance;

        vm.expectEmit(true, true, true, true, address(escrow));
        emit TrustlessEscrow.DeliveryConfirmed(seller, escrowAmount);
        vm.prank(buyer);
        escrow.confirmDelivery();

        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.Complete));
        assertEq(seller.balance, initialSellerBalance + escrowAmount);
        assertEq(address(escrow).balance, 0);
    }

    function test_ConfirmDelivery_NotBuyerReverts() public {
        _deposit();
        vm.prank(stranger);
        vm.expectRevert(TrustlessEscrow.Unauthorized.selector);
        escrow.confirmDelivery();
    }

    function test_ConfirmDelivery_BeforeDepositReverts() public {
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.InvalidState.selector, TrustlessEscrow.State.AwaitingPayment, TrustlessEscrow.State.AwaitingDelivery)
        );
        escrow.confirmDelivery();
    }

    // --- Refund ---

    function test_Refund_AfterDeadlineReturnsFunds() public {
        _deposit();
        vm.warp(block.timestamp + deadline + 1);
        uint256 initialBuyerBalance = buyer.balance;

        vm.expectEmit(true, true, true, true, address(escrow));
        emit TrustlessEscrow.Refunded(buyer, escrowAmount);
        vm.prank(buyer);
        escrow.refund();

        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.Refunded));
        assertEq(buyer.balance, initialBuyerBalance + escrowAmount);
        assertEq(address(escrow).balance, 0);
    }

    function test_Refund_ExactlyAtDeadlineReverts() public {
        _deposit();
        vm.warp(block.timestamp + deadline);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(TrustlessEscrow.NotYetRefundable.selector, block.timestamp));
        escrow.refund();
    }

    function test_Refund_BeforeDeadlineReverts() public {
        _deposit();
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(TrustlessEscrow.NotYetRefundable.selector, block.timestamp + deadline));
        escrow.refund();
    }

    function test_Refund_NotBuyerReverts() public {
        _deposit();
        vm.warp(block.timestamp + deadline + 1);
        vm.prank(seller);
        vm.expectRevert(TrustlessEscrow.Unauthorized.selector);
        escrow.refund();
    }

    function test_Refund_AfterConfirmReverts() public {
        _deposit();
        vm.warp(block.timestamp + deadline + 1);
        vm.prank(buyer);
        escrow.confirmDelivery();

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.InvalidState.selector, TrustlessEscrow.State.Complete, TrustlessEscrow.State.AwaitingDelivery)
        );
        escrow.refund();
    }

    function test_Refund_AfterDisputeReverts() public {
        _deposit();
        vm.warp(block.timestamp + deadline + 1);
        vm.prank(buyer);
        escrow.raiseDispute();

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.InvalidState.selector, TrustlessEscrow.State.Disputed, TrustlessEscrow.State.AwaitingDelivery)
        );
        escrow.refund();
    }

    function test_Refund_BeforeDepositReverts() public {
        vm.warp(block.timestamp + deadline + 1);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.InvalidState.selector, TrustlessEscrow.State.AwaitingPayment, TrustlessEscrow.State.AwaitingDelivery)
        );
        escrow.refund();
    }

    // --- Dispute ---

    function test_RaiseDispute_ByBuyer() public {
        _deposit();
        vm.expectEmit(true, true, true, true, address(escrow));
        emit TrustlessEscrow.DisputeOpened(buyer);
        vm.prank(buyer);
        escrow.raiseDispute();
        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.Disputed));
    }

    function test_RaiseDispute_BySeller() public {
        _deposit();
        vm.prank(seller);
        escrow.raiseDispute();
        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.Disputed));
    }

    function test_RaiseDispute_NotPartyReverts() public {
        _deposit();
        vm.prank(stranger);
        vm.expectRevert(TrustlessEscrow.Unauthorized.selector);
        escrow.raiseDispute();
    }

    function test_RaiseDispute_BeforeDepositReverts() public {
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.InvalidState.selector, TrustlessEscrow.State.AwaitingPayment, TrustlessEscrow.State.AwaitingDelivery)
        );
        escrow.raiseDispute();
    }

    // --- Resolution ---

    function test_ResolveDispute_ToSeller() public {
        _deposit();
        vm.prank(buyer);
        escrow.raiseDispute();
        uint256 initialSellerBalance = seller.balance;

        vm.expectEmit(true, true, true, true, address(escrow));
        emit TrustlessEscrow.DisputeResolved(seller, escrowAmount);
        vm.prank(arbiter);
        escrow.resolveDispute(seller);

        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.Resolved));
        assertEq(seller.balance, initialSellerBalance + escrowAmount);
        assertEq(address(escrow).balance, 0);
    }

    function test_ResolveDispute_ToBuyer() public {
        _deposit();
        vm.prank(buyer);
        escrow.raiseDispute();
        uint256 initialBuyerBalance = buyer.balance;

        vm.prank(arbiter);
        escrow.resolveDispute(buyer);

        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.Resolved));
        assertEq(buyer.balance, initialBuyerBalance + escrowAmount);
        assertEq(address(escrow).balance, 0);
    }

    function test_ResolveDispute_NotArbiterReverts() public {
        _deposit();
        vm.prank(buyer);
        escrow.raiseDispute();

        vm.prank(seller);
        vm.expectRevert(TrustlessEscrow.Unauthorized.selector);
        escrow.resolveDispute(seller);
    }

    function test_ResolveDispute_NonPartyRecipientReverts() public {
        _deposit();
        vm.prank(buyer);
        escrow.raiseDispute();

        vm.prank(arbiter);
        vm.expectRevert(TrustlessEscrow.Unauthorized.selector);
        escrow.resolveDispute(payable(stranger));
    }

    function test_ResolveDispute_BeforeDisputeReverts() public {
        _deposit();
        vm.prank(arbiter);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.InvalidState.selector, TrustlessEscrow.State.AwaitingDelivery, TrustlessEscrow.State.Disputed)
        );
        escrow.resolveDispute(seller);
    }

    function test_FullSuccessfulFlow() public {
        _deposit();
        vm.prank(buyer);
        escrow.confirmDelivery();
        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.Complete));
    }
}
