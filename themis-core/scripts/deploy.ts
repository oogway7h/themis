import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import hre from 'hardhat';

async function main(): Promise<void> {
  const { ethers, network } = hre;

  const [deployer] = await ethers.getSigners();
  const factory = await ethers.getContractFactory('ThemisRegistry');
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const version = await contract.version();
  const blockNumber = await ethers.provider.getBlockNumber();

  const record = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    contract: 'ThemisRegistry',
    address,
    version,
    deployer: deployer.address,
    blockNumber,
    deployedAt: new Date().toISOString(),
  };

  const outDir = join(__dirname, '..', 'deployments');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, `${network.name}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );

  console.log(JSON.stringify(record, null, 2));
  console.log(`\nCopia esta linea en tu .env:\nCONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
