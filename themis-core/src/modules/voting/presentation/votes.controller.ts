import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitVoteUseCase } from '../application/submit-vote.usecase';
import { GetVotingContextUseCase } from '../application/get-voting-context.usecase';
import { GetLiveTallyUseCase } from '../application/get-live-tally.usecase';
import { SubmitVoteDto } from './dto/submit-vote.dto';
import { VoteAcceptedResponseDto } from './dto/vote-accepted-response.dto';
import { VotingContextResponseDto } from './dto/voting-context-response.dto';
import { TallyResponseDto } from './dto/tally-response.dto';

// Sin auth de ningun tipo (regla 1 del CLAUDE.md raiz): la prueba zk-SNARK
// valida es la unica prueba de habilitacion, mismo espiritu que
// PresentedCredentialController (CU-05).
@ApiTags('voting')
@Controller('elections/:electionId')
export class VotesController {
  constructor(
    private readonly submitVote: SubmitVoteUseCase,
    private readonly getVotingContext: GetVotingContextUseCase,
    private readonly getLiveTally: GetLiveTallyUseCase,
  ) {}

  @Post('votes/relay-submit')
  @HttpCode(201)
  @ApiOperation({ summary: 'Emite un voto (CU-10): prueba zk-SNARK validada on-chain' })
  @ApiResponse({ status: 201, type: VoteAcceptedResponseDto })
  @ApiResponse({ status: 400, description: 'VOTE_SCOPE_MISMATCH | VOTE_OPTION_NOT_FOUND | VOTE_INVALID_PROOF' })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description: 'VOTING_WINDOW_CLOSED | VOTING_GROUP_NOT_READY | VOTE_ALREADY_CAST',
  })
  async vote(
    @Param('electionId') electionId: string,
    @Body() body: SubmitVoteDto,
  ): Promise<VoteAcceptedResponseDto> {
    const result = await this.submitVote.execute(electionId, body);
    return VoteAcceptedResponseDto.fromResult(result);
  }

  @Get('voting-context')
  @ApiOperation({
    summary:
      'Datos publicos para reconstruir el Group de Semaphore del lado del votante y generar la prueba (CU-10, usado por /prove)',
  })
  @ApiResponse({ status: 200, type: VotingContextResponseDto })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'VOTING_GROUP_NOT_READY' })
  async votingContext(
    @Param('electionId') electionId: string,
  ): Promise<VotingContextResponseDto> {
    const context = await this.getVotingContext.execute(electionId);
    return VotingContextResponseDto.fromContext(context);
  }

  @Get('votes/tally')
  @ApiOperation({ summary: 'Conteo de votos en vivo, publico (CU-11)' })
  @ApiResponse({ status: 200, type: TallyResponseDto })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  async tally(@Param('electionId') electionId: string): Promise<TallyResponseDto> {
    const tally = await this.getLiveTally.execute(electionId);
    return TallyResponseDto.fromTally(tally);
  }
}
