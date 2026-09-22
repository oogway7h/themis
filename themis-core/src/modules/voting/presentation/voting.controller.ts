import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ListPublicElectionsUseCase } from '../application/list-public-elections.usecase';
import { GetPublicElectionUseCase } from '../application/get-public-election.usecase';
import { GetMerkleTreeUseCase } from '../application/get-merkle-tree.usecase';
import { CastVoteUseCase } from '../application/cast-vote.usecase';
import { GetVoterStatusUseCase } from '../application/get-voter-status.usecase';
import { CastVoteDto } from './dto/cast-vote.dto';
import { VoteResponseDto } from './dto/vote-response.dto';
import { PublicElectionResponseDto } from './dto/public-election-response.dto';
import { MerkleTreeResponseDto } from './dto/merkle-tree-response.dto';
import {
  CheckVoterStatusDto,
  VoterStatusResponseDto,
} from './dto/voter-status.dto';

@ApiTags('voting')
@Controller()
export class VotingController {
  constructor(
    private readonly listPublicElectionsUseCase: ListPublicElectionsUseCase,
    private readonly getPublicElectionUseCase: GetPublicElectionUseCase,
    private readonly getMerkleTreeUseCase: GetMerkleTreeUseCase,
    private readonly castVoteUseCase: CastVoteUseCase,
    private readonly getVoterStatusUseCase: GetVoterStatusUseCase,
  ) {}

  @Get('elections/public/active')
  @ApiOperation({
    summary: 'Lista las elecciones activas abiertas para votación pública (CU-10)',
  })
  @ApiResponse({ status: 200, type: [PublicElectionResponseDto] })
  async listActive(): Promise<PublicElectionResponseDto[]> {
    const elections = await this.listPublicElectionsUseCase.execute();
    return elections.map(PublicElectionResponseDto.fromDomain);
  }

  @Get('elections/:electionId/public')
  @ApiOperation({
    summary: 'Detalles públicos de una elección para la boleta de votación (CU-10)',
  })
  @ApiResponse({ status: 200, type: PublicElectionResponseDto })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  async getPublicElection(
    @Param('electionId') electionId: string,
  ): Promise<PublicElectionResponseDto> {
    const election = await this.getPublicElectionUseCase.execute(electionId);
    return PublicElectionResponseDto.fromDomain(election);
  }

  @Get('elections/:electionId/merkle-tree')
  @ApiOperation({
    summary:
      'Obtiene los compromisos (hojas) y raíz del árbol de Semaphore para generar la prueba ZK (CU-10)',
  })
  @ApiResponse({ status: 200, type: MerkleTreeResponseDto })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  async getMerkleTree(
    @Param('electionId') electionId: string,
  ): Promise<MerkleTreeResponseDto> {
    const tree = await this.getMerkleTreeUseCase.execute(electionId);
    return MerkleTreeResponseDto.fromDomain(tree);
  }

  @Post('elections/:electionId/votes')
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Emite un voto anónimo con prueba de conocimiento cero Semaphore (CU-10)',
  })
  @ApiResponse({ status: 201, type: VoteResponseDto })
  @ApiResponse({ status: 400, description: 'ELECTION_NOT_OPEN_FOR_VOTING | INVALID_VOTE_PROOF' })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND | OPTION_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'DUPLICATE_VOTE' })
  @ApiResponse({ status: 500, description: 'ON_CHAIN_VOTING_FAILED' })
  async castVote(
    @Param('electionId') electionId: string,
    @Body() body: CastVoteDto,
  ): Promise<VoteResponseDto> {
    const receipt = await this.castVoteUseCase.execute({
      electionId,
      optionId: body.optionId,
      proof: body.proof,
      assertion: body.assertion,
    });
    return VoteResponseDto.fromDomain(receipt);
  }

  @Post('elections/:electionId/voter-status')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Consulta el estado de registro y votación del elector autenticado',
  })
  @ApiResponse({ status: 200, type: VoterStatusResponseDto })
  async getVoterStatus(
    @Param('electionId') electionId: string,
    @Body() body: CheckVoterStatusDto,
  ): Promise<VoterStatusResponseDto> {
    const status = await this.getVoterStatusUseCase.execute(
      electionId,
      body.assertion,
    );
    return {
      electionId: status.electionId,
      isRegistered: status.isRegistered,
      hasVoted: status.hasVoted,
      votedAt: status.votedAt,
    };
  }
}
