// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ISemaphore } from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract ThemisVoting {
    ISemaphore public immutable semaphore;

    mapping(uint256 => mapping(uint256 => uint256)) public votes;
    mapping(uint256 => uint256) public totalVotes;

    event VoteCast(uint256 indexed groupId, uint256 indexed optionId, uint256 indexed nullifier, uint256 timestamp);

    constructor(ISemaphore _semaphore) {
        semaphore = _semaphore;
    }

    function castVote(uint256 groupId, ISemaphore.SemaphoreProof calldata proof) external {
        semaphore.validateProof(groupId, proof);
        uint256 optionId = proof.message;
        votes[groupId][optionId]++;
        totalVotes[groupId]++;
        emit VoteCast(groupId, optionId, proof.nullifier, block.timestamp);
    }

    function getVotes(uint256 groupId, uint256 optionId) external view returns (uint256) {
        return votes[groupId][optionId];
    }

    function getTotalVotes(uint256 groupId) external view returns (uint256) {
        return totalVotes[groupId];
    }
}
