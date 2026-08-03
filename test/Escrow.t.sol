// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Escrow.sol";

contract EscrowTest is Test {
    TrustlessEscrow escrow;

    address payable buyer = payable(address(0x1));
    address payable seller = payable(address(0x2));
    address arbiter = address(0x3);
    uint256 escrowAmount = 1 ether;

    function setUp() public {
        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        escrow = new TrustlessEscrow(seller, arbiter, escrowAmount);
    }

    function test_InitialState() public view {
        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.AwaitingPayment));
    }

    function test_DepositFuzzing(uint256 depositAmount) public {
        vm.assume(depositAmount != escrowAmount);

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TrustlessEscrow.IncorrectAmount.selector, escrowAmount, depositAmount)
        );
        escrow.deposit{value: depositAmount}();
    }

    function test_FullSuccessfulFlow() public {
        // 1. Deposit
        vm.prank(buyer);
        escrow.deposit{value: escrowAmount}();
        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.AwaitingDelivery));

        // 2. Confirm & Transfer
        uint256 initialSellerBalance = seller.balance;
        vm.prank(buyer);
        escrow.confirmDelivery();

        assertEq(uint(escrow.currentState()), uint(TrustlessEscrow.State.Complete));
        assertEq(seller.balance, initialSellerBalance + escrowAmount);
    }

    /// @dev Invariant: The contract balance should ALWAYS equal 0 or escrowAmount.
    function test_Invariant_BalanceConstraint() public {
        uint256 contractBal = address(escrow).balance;
        assertTrue(contractBal == 0 || contractBal == escrowAmount);
    }
}
