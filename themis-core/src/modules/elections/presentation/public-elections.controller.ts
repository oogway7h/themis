import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ListElectionsUseCase } from '../application/list-elections.usecase';
import { GetElectionDetailUseCase } from '../application/get-election-detail.usecase';
import { ListElectionsQueryDto } from './dto/list-elections-query.dto';
import { PublicElectionResponseDto } from './dto/public-election-response.dto';

// Sin auth: GET /elections (ElectionsController) es ADMIN-only y no sirve
// para nada publico -- este controller expone lo minimo que necesitan la
// app movil (elegir eleccion para votar, CU-10), el conteo en vivo (CU-11)
// y el listado del Auditor (CU-15). Registrado ANTES que ElectionsController
// en elections.module.ts para que "/elections/public" no sea interceptado
// por la ruta "/elections/:id" (Express matchea por orden de registro).
@ApiTags('elections')
@Controller('elections/public')
export class PublicElectionsController {
  constructor(
    private readonly listElections: ListElectionsUseCase,
    private readonly getElectionDetail: GetElectionDetailUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listado publico de elecciones (excluye BORRADOR salvo que se pida)' })
  @ApiResponse({ status: 200, type: [PublicElectionResponseDto] })
  async list(@Query() query: ListElectionsQueryDto): Promise<PublicElectionResponseDto[]> {
    const elections = await this.listElections.execute({ estado: query.estado });
    return elections
      .filter((election) => query.estado !== undefined || election.estado !== 'BORRADOR')
      .map((election) => PublicElectionResponseDto.fromDomain(election));
  }

  @Get('active')
  @ApiOperation({ summary: 'Listado de elecciones activas en estado de votación abierta (CU-10)' })
  @ApiResponse({ status: 200, type: [PublicElectionResponseDto] })
  async listActive(): Promise<PublicElectionResponseDto[]> {
    const elections = await this.listElections.execute({ estado: 'VOTACION_ABIERTA' as any });
    return elections.map((election) => PublicElectionResponseDto.fromDomain(election));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle publico de una eleccion' })
  @ApiResponse({ status: 200, type: PublicElectionResponseDto })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  async detail(@Param('id') id: string): Promise<PublicElectionResponseDto> {
    const election = await this.getElectionDetail.execute(id);
    return PublicElectionResponseDto.fromDomain(election);
  }
}
