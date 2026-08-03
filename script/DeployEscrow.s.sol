// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Escrow.sol";

contract DeployEscrow is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable seller = payable(vm.envAddress("SELLER_ADDRESS"));
        address arbiter = vm.envAddress("ARBITER_ADDRESS");
        uint256 amount = 0.1 ether;

        vm.startBroadcast(deployerPrivateKey);
        new TrustlessEscrow(seller, arbiter, amount);
        vm.stopBroadcast();
    }
}
