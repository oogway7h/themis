import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { RolesGuard } from '../../../shared/auth/roles.guard';
import { Roles } from '../../../shared/auth/roles.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import { RequestUser } from '../../../shared/auth/jwt.strategy';
import { ElectionResponseDto } from '../../elections/presentation/dto/election-response.dto';
import { ListBatchesUseCase } from '../application/list-batches.usecase';
import { GetBatchDetailUseCase } from '../application/get-batch-detail.usecase';
import { ApproveBatchUseCase } from '../application/approve-batch.usecase';
import { ListRateAlertsUseCase } from '../application/list-rate-alerts.usecase';
import { ListMyAuthorityElectionsUseCase } from '../application/list-my-authority-elections.usecase';
import { BatchResponseDto } from './dto/batch-response.dto';
import { BatchDetailResponseDto } from './dto/batch-detail-response.dto';
import { RateAlertResponseDto } from './dto/rate-alert-response.dto';

@ApiTags('checkpoints')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CheckpointsController {
  constructor(
    private readonly listBatches: ListBatchesUseCase,
    private readonly getBatchDetail: GetBatchDetailUseCase,
    private readonly approveBatch: ApproveBatchUseCase,
    private readonly listRateAlerts: ListRateAlertsUseCase,
    private readonly listMyAuthorityElections: ListMyAuthorityElectionsUseCase,
  ) {}

  @Get('elections/mine/authority')
  @Roles('AUTORIDAD_REGISTRO')
  @ApiOperation({
    summary:
      'Elecciones en las que la cuenta autenticada esta designada como autoridad (CU-08, descubrimiento)',
  })
  @ApiResponse({ status: 200, type: [ElectionResponseDto] })
  async myAuthorityElections(
    @CurrentUser() user: RequestUser,
  ): Promise<ElectionResponseDto[]> {
    const elections = await this.listMyAuthorityElections.execute(user.sub);
    return elections.map((election) => ElectionResponseDto.fromDomain(election));
  }

  @Get('elections/:electionId/batches')
  @Roles('ADMIN', 'AUTORIDAD_REGISTRO', 'AUDITOR')
  @ApiOperation({ summary: 'Lotes de checkpoint de una eleccion (CU-07/CU-08)' })
  @ApiResponse({ status: 200, type: [BatchResponseDto] })
  async list(
    @Param('electionId') electionId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<BatchResponseDto[]> {
    const items = await this.listBatches.execute(electionId, user.sub);
    return items.map((item) => BatchResponseDto.fromItem(item));
  }

  @Get('elections/:electionId/batches/:batchId')
  @Roles('ADMIN', 'AUTORIDAD_REGISTRO', 'AUDITOR')
  @ApiOperation({ summary: 'Detalle de un lote, incluidas sus aprobaciones (CU-08)' })
  @ApiResponse({ status: 200, type: BatchDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Lote no encontrado' })
  async detail(
    @Param('electionId') electionId: string,
    @Param('batchId') batchId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<BatchDetailResponseDto> {
    const detail = await this.getBatchDetail.execute(electionId, batchId, user.sub);
    return BatchDetailResponseDto.fromDetail(detail);
  }

  @Post('elections/:electionId/batches/:batchId/approvals')
  @HttpCode(201)
  @Roles('AUTORIDAD_REGISTRO')
  @ApiOperation({
    summary:
      'Aprueba un lote pendiente (CU-08). La aprobacion que llega a MULTISIG_THRESHOLD dispara la insercion on-chain (CU-09) en el mismo request.',
  })
  @ApiResponse({ status: 201, type: BatchDetailResponseDto })
  @ApiResponse({ status: 403, description: 'La cuenta no es autoridad de esta eleccion' })
  @ApiResponse({ status: 404, description: 'Lote no encontrado' })
  @ApiResponse({ status: 409, description: 'Lote ya aprobado por esta autoridad, o no pendiente' })
  async approve(
    @Param('electionId') electionId: string,
    @Param('batchId') batchId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<BatchDetailResponseDto> {
    await this.approveBatch.execute(electionId, batchId, user.sub);
    const detail = await this.getBatchDetail.execute(electionId, batchId, user.sub);
    return BatchDetailResponseDto.fromDetail(detail);
  }

  @Get('elections/:electionId/rate-alerts')
  @Roles('ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Historial de alertas de ritmo de registro (CU-06)' })
  @ApiResponse({ status: 200, type: [RateAlertResponseDto] })
  async alerts(@Param('electionId') electionId: string): Promise<RateAlertResponseDto[]> {
    const alerts = await this.listRateAlerts.execute(electionId);
    return alerts.map((alert) => RateAlertResponseDto.fromDomain(alert));
  }
}
