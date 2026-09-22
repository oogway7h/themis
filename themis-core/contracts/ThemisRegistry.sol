// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract ThemisRegistry {
    string private constant VERSION = "0.1.0";

    address public immutable deployer;
    uint256 public pingCount;

    event Pinged(address indexed sender, uint256 count);

    constructor() {
        deployer = msg.sender;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function ping() external returns (uint256) {
        pingCount += 1;
        emit Pinged(msg.sender, pingCount);
        return pingCount;
    }
}
