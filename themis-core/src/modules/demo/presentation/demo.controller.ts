import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePingUseCase } from '../application/create-ping.usecase';
import { ListPingsUseCase } from '../application/list-pings.usecase';
import { GetForecastUseCase } from '../application/get-forecast.usecase';
import { BlockchainService } from '../../../shared/blockchain/blockchain.service';
import { CreatePingDto } from './dto/create-ping.dto';

@ApiTags('demo')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly createPing: CreatePingUseCase,
    private readonly listPings: ListPingsUseCase,
    private readonly getForecast: GetForecastUseCase,
    private readonly blockchain: BlockchainService,
  ) {}

  @Post('pings')
  @ApiOperation({ summary: 'Escribe una fila en Neon vias Prisma' })
  async create(@Body() body: CreatePingDto) {
    if (!body?.source || body.source.trim().length === 0) {
      throw new BadRequestException('source es obligatorio');
    }

    const ping = await this.createPing.execute({
      source: body.source.trim(),
      note: body.note?.trim(),
    });

    return ping;
  }

  @Get('pings')
  @ApiOperation({ summary: 'Lee las ultimas filas escritas en Neon' })
  list(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.listPings.execute(Math.min(Math.max(limit, 1), 100));
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Pide una proyeccion a themis-ai' })
  forecast(
    @Query('horizon', new DefaultValuePipe(5), ParseIntPipe) horizon: number,
  ) {
    return this.getForecast.execute('demo', Math.min(Math.max(horizon, 1), 50));
  }

  @Get('chain')
  @ApiOperation({ summary: 'Lee el contrato ThemisRegistry desplegado' })
  async chain() {
    const status = await this.blockchain.getStatus();
    const registry = this.blockchain.getRegistry();

    if (!registry || !status.connected) {
      return { ...status, pingCount: null };
    }

    const pingCount = (await registry.pingCount()) as bigint;

    return { ...status, pingCount: pingCount.toString() };
  }

  @Post('chain/ping')
  @ApiOperation({ summary: 'Envia una transaccion firmada por el relayer' })
  async chainPing() {
    const registry = this.blockchain.getRegistry();

    if (!registry) {
      throw new BadRequestException(
        'CONTRACT_ADDRESS vacio. Despliega el contrato con pnpm chain:deploy:local',
      );
    }

    const tx = await registry.ping();
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? null,
      relayer: this.blockchain.relayerAddress,
    };
  }
}
