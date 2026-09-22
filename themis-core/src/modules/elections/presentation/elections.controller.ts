import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateElectionUseCase } from '../application/create-election.usecase';
import { UpdateElectionUseCase } from '../application/update-election.usecase';
import { DeleteElectionUseCase } from '../application/delete-election.usecase';
import { ListElectionsUseCase } from '../application/list-elections.usecase';
import { GetElectionDetailUseCase } from '../application/get-election-detail.usecase';
import { ConfigureElectionRollUseCase } from '../application/configure-election-roll.usecase';
import { GetElectionRollUseCase } from '../application/get-election-roll.usecase';
import { DesignateAuthoritiesUseCase } from '../application/designate-authorities.usecase';
import { ReplaceAuthorityUseCase } from '../application/replace-authority.usecase';
import { ListAuthoritiesUseCase } from '../application/list-authorities.usecase';
import { ConfigureCheckpointPolicyUseCase } from '../application/configure-checkpoint-policy.usecase';
import { GetEffectivePolicyUseCase } from '../application/get-effective-policy.usecase';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { ListElectionsQueryDto } from './dto/list-elections-query.dto';
import { ElectionResponseDto } from './dto/election-response.dto';
import { ConfigureRollDto } from './dto/configure-roll.dto';
import { RollConfigResponseDto } from './dto/roll-config-response.dto';
import { DesignateAuthoritiesDto } from './dto/designate-authorities.dto';
import { ReplaceAuthorityDto } from './dto/replace-authority.dto';
import { AuthorityResponseDto } from './dto/authority-response.dto';
import { ConfigureCheckpointPolicyDto } from './dto/configure-checkpoint-policy.dto';
import { CheckpointPolicyResponseDto } from './dto/checkpoint-policy-response.dto';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { RolesGuard } from '../../../shared/auth/roles.guard';
import { Roles } from '../../../shared/auth/roles.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import { RequestUser } from '../../../shared/auth/jwt.strategy';

@ApiTags('elections')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('elections')
export class ElectionsController {
  constructor(
    private readonly createElection: CreateElectionUseCase,
    private readonly updateElection: UpdateElectionUseCase,
    private readonly deleteElection: DeleteElectionUseCase,
    private readonly listElections: ListElectionsUseCase,
    private readonly getElectionDetail: GetElectionDetailUseCase,
    private readonly configureElectionRoll: ConfigureElectionRollUseCase,
    private readonly getElectionRoll: GetElectionRollUseCase,
    private readonly designateAuthorities: DesignateAuthoritiesUseCase,
    private readonly replaceAuthority: ReplaceAuthorityUseCase,
    private readonly listAuthorities: ListAuthoritiesUseCase,
    private readonly configureCheckpointPolicy: ConfigureCheckpointPolicyUseCase,
    private readonly getEffectivePolicy: GetEffectivePolicyUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crea una elección con sus opciones (HU-01)' })
  @ApiResponse({ status: 201, type: ElectionResponseDto })
  async create(
    @Body() body: CreateElectionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ElectionResponseDto> {
    const election = await this.createElection.execute(
      {
        nombre: body.nombre,
        descripcion: body.descripcion,
        registroInicio: new Date(body.registroInicio),
        registroFin: new Date(body.registroFin),
        votacionInicio: new Date(body.votacionInicio),
        votacionFin: new Date(body.votacionFin),
        opciones: body.opciones,
      },
      user.sub,
    );
    return ElectionResponseDto.fromDomain(election);
  }

  @Get()
  @ApiOperation({ summary: 'Lista elecciones, con filtro opcional por nombre/estado (HU-01)' })
  @ApiResponse({ status: 200, type: [ElectionResponseDto] })
  async list(@Query() query: ListElectionsQueryDto): Promise<ElectionResponseDto[]> {
    const elections = await this.listElections.execute(query);
    return elections.map((election) => ElectionResponseDto.fromDomain(election));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una elección (HU-01)' })
  @ApiResponse({ status: 200, type: ElectionResponseDto })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  async detail(@Param('id') id: string): Promise<ElectionResponseDto> {
    const election = await this.getElectionDetail.execute(id);
    return ElectionResponseDto.fromDomain(election);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita una elección en BORRADOR (HU-01)' })
  @ApiResponse({ status: 200, type: ElectionResponseDto })
  @ApiResponse({ status: 409, description: 'ELECTION_NOT_EDITABLE' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateElectionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ElectionResponseDto> {
    const election = await this.updateElection.execute(
      id,
      {
        nombre: body.nombre,
        descripcion: body.descripcion,
        registroInicio: body.registroInicio ? new Date(body.registroInicio) : undefined,
        registroFin: body.registroFin ? new Date(body.registroFin) : undefined,
        votacionInicio: body.votacionInicio ? new Date(body.votacionInicio) : undefined,
        votacionFin: body.votacionFin ? new Date(body.votacionFin) : undefined,
        opciones: body.opciones,
      },
      user.sub,
    );
    return ElectionResponseDto.fromDomain(election);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una elección en BORRADOR (HU-01)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: 'ELECTION_NOT_EDITABLE' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteElection.execute(id);
  }

  @Put(':id/roll-config')
  @ApiOperation({ summary: 'Configura profundidad de árbol y elegibilidad del padrón (HU-02)' })
  @ApiResponse({ status: 200, type: RollConfigResponseDto })
  @ApiResponse({ status: 409, description: 'ELECTION_ROLL_LOCKED' })
  async configureRoll(
    @Param('id') id: string,
    @Body() body: ConfigureRollDto,
    @CurrentUser() user: RequestUser,
  ): Promise<RollConfigResponseDto> {
    const election = await this.configureElectionRoll.execute(id, body, user.sub);
    return RollConfigResponseDto.fromDomain(election);
  }

  @Get(':id/roll-config')
  @ApiOperation({ summary: 'Consulta la configuración de padrón de una elección (HU-02)' })
  @ApiResponse({ status: 200, type: RollConfigResponseDto })
  async getRoll(@Param('id') id: string): Promise<RollConfigResponseDto> {
    const election = await this.getElectionRoll.execute(id);
    return RollConfigResponseDto.fromDomain(election);
  }

  @Post(':id/authorities')
  @HttpCode(201)
  @ApiOperation({ summary: 'Designa las 5 autoridades de registro de una elección (HU-03)' })
  @ApiResponse({ status: 201, type: [AuthorityResponseDto] })
  @ApiResponse({ status: 409, description: 'AUTHORITY_ALREADY_DESIGNATED | AUTHORITY_ELECTION_CLOSED' })
  async designate(
    @Param('id') id: string,
    @Body() body: DesignateAuthoritiesDto,
    @CurrentUser() user: RequestUser,
  ): Promise<AuthorityResponseDto[]> {
    await this.designateAuthorities.execute(id, body.autoridades, user.sub);
    const authorities = await this.listAuthorities.execute(id);
    return authorities.map((authority) => AuthorityResponseDto.fromDomain(authority));
  }

  @Get(':id/authorities')
  @ApiOperation({ summary: 'Lista las autoridades designadas de una elección (HU-03)' })
  @ApiResponse({ status: 200, type: [AuthorityResponseDto] })
  async listElectionAuthorities(@Param('id') id: string): Promise<AuthorityResponseDto[]> {
    const authorities = await this.listAuthorities.execute(id);
    return authorities.map((authority) => AuthorityResponseDto.fromDomain(authority));
  }

  @Patch(':id/authorities/:authorityId')
  @ApiOperation({ summary: 'Reemplaza una autoridad ya designada (HU-03)' })
  @ApiResponse({ status: 200, type: AuthorityResponseDto })
  @ApiResponse({ status: 409, description: 'AUTHORITY_ELECTION_CLOSED' })
  async replace(
    @Param('id') id: string,
    @Param('authorityId') authorityId: string,
    @Body() body: ReplaceAuthorityDto,
    @CurrentUser() user: RequestUser,
  ): Promise<AuthorityResponseDto> {
    const authority = await this.replaceAuthority.execute(id, authorityId, body, user.sub);
    return AuthorityResponseDto.fromDomain(authority);
  }

  @Put(':id/checkpoint-policy')
  @ApiOperation({ summary: 'Configura intervalo de checkpoint y umbral de límite de tasa (HU-04)' })
  @ApiResponse({ status: 200, type: CheckpointPolicyResponseDto })
  @ApiResponse({ status: 409, description: 'CHECKPOINT_POLICY_LOCKED' })
  async configureCheckpoints(
    @Param('id') id: string,
    @Body() body: ConfigureCheckpointPolicyDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CheckpointPolicyResponseDto> {
    await this.configureCheckpointPolicy.execute(id, body, user.sub);
    const policy = await this.getEffectivePolicy.execute(id);
    return CheckpointPolicyResponseDto.fromEffectivePolicy(policy);
  }

  @Get(':id/checkpoint-policy')
  @ApiOperation({ summary: 'Consulta la política de checkpoints efectiva (configurada o por defecto) (HU-04)' })
  @ApiResponse({ status: 200, type: CheckpointPolicyResponseDto })
  async getCheckpoints(@Param('id') id: string): Promise<CheckpointPolicyResponseDto> {
    const policy = await this.getEffectivePolicy.execute(id);
    return CheckpointPolicyResponseDto.fromEffectivePolicy(policy);
  }
}
