import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { RolesGuard } from '../../../shared/auth/roles.guard';
import { Roles } from '../../../shared/auth/roles.decorator';
import { GetAuditResultUseCase } from '../application/get-audit-result.usecase';
import { AuditResultResponseDto } from './dto/audit-result-response.dto';

@ApiTags('voting')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('elections/:electionId/audit')
export class AuditController {
  constructor(private readonly getAuditResult: GetAuditResultUseCase) {}

  @Get('result')
  @Roles('ADMIN', 'AUDITOR')
  @ApiOperation({
    summary:
      'Vista de auditoria (CU-15): resultado final (si ya cerro), tally en vivo, y estado de sincronizacion on-chain',
  })
  @ApiResponse({ status: 200, type: AuditResultResponseDto })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  async result(@Param('electionId') electionId: string): Promise<AuditResultResponseDto> {
    const result = await this.getAuditResult.execute(electionId);
    return AuditResultResponseDto.fromResult(result);
  }
}
