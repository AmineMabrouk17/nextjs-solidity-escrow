// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Escrow.sol";

/// @notice Deploys a TrustlessEscrow (optionally verifying on Etherscan).
///         Escrow parameters come from environment variables:
///           PRIVATE_KEY, SELLER_ADDRESS, ARBITER_ADDRESS, AMOUNT (wei), DEADLINE (unix seconds).
///         The RPC URL and verification key are CLI concerns:
///           forge script ... --rpc-url $SEPOLIA_RPC_URL [--verify --etherscan-api-key $ETHERSCAN_API_KEY]
contract DeployEscrow is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable seller = payable(vm.envAddress("SELLER_ADDRESS"));
        address arbiter = vm.envAddress("ARBITER_ADDRESS");
        uint256 amount = vm.envUint("AMOUNT");
        uint256 deadline = vm.envUint("DEADLINE");

        vm.startBroadcast(deployerPrivateKey);
        TrustlessEscrow escrow = new TrustlessEscrow(seller, arbiter, amount, deadline);
        vm.stopBroadcast();

        console2.log("TrustlessEscrow deployed at:", address(escrow));
        console2.log("seller:", seller);
        console2.log("arbiter:", arbiter);
        console2.log("amount (wei):", amount);
        console2.log("deadline (unix):", deadline);
    }
}
