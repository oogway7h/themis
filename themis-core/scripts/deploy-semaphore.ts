import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import '@nomicfoundation/hardhat-ethers';
import hre from 'hardhat';

async function main(): Promise<void> {
  const { ethers, network } = hre;

  const [deployer] = await ethers.getSigners();

  const verifierFactory = await ethers.getContractFactory('SemaphoreVerifier');
  const verifier = await verifierFactory.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  const poseidonFactory = await ethers.getContractFactory('PoseidonT3');
  const poseidon = await poseidonFactory.deploy();
  await poseidon.waitForDeployment();
  const poseidonAddress = await poseidon.getAddress();

  const registryFactory = await ethers.getContractFactory('ThemisSemaphoreRegistry', {
    libraries: { PoseidonT3: poseidonAddress },
  });
  const registry = await registryFactory.deploy(verifierAddress);
  await registry.waitForDeployment();

  const address = await registry.getAddress();

  const votingFactory = await ethers.getContractFactory('ThemisVoting');
  const voting = await votingFactory.deploy(address);
  await voting.waitForDeployment();
  const votingAddress = await voting.getAddress();

  const blockNumber = await ethers.provider.getBlockNumber();

  const record = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    contract: 'ThemisSemaphoreRegistry',
    address,
    votingAddress,
    verifierAddress,
    poseidonAddress,
    deployer: deployer.address,
    blockNumber,
    deployedAt: new Date().toISOString(),
  };

  const outDir = join(__dirname, '..', 'deployments');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, `${network.name}-semaphore.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );

  console.log(JSON.stringify(record, null, 2));
  console.log(`\nCopia esta linea en tu .env:\nSEMAPHORE_REGISTRY_ADDRESS=${address}\nVOTING_CONTRACT_ADDRESS=${votingAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
