import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BlockchainService } from '../../shared/blockchain/blockchain.service';
import { AiClientService } from '../../shared/http/ai-client.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly ai: AiClientService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Estado del servicio y de sus dependencias' })
  async check() {
    const [database, chain, ai] = await Promise.all([
      this.prisma.isReachable(),
      this.blockchain.getStatus(),
      this.ai.getStatus(),
    ]);

    const healthy = database && chain.connected && ai.reachable;

    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'themis-core',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: { reachable: database },
        chain,
        ai,
      },
    };
  }
}
