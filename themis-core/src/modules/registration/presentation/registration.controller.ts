import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitRegistrationRequestUseCase } from '../application/submit-registration-request.usecase';
import { SubmitRegistrationRequestDto } from './dto/submit-registration-request.dto';
import { RegistrationRequestResponseDto } from './dto/registration-request-response.dto';

// Sin JwtAuthGuard/RolesGuard: ese sistema es para sesion de Admin/Autoridad
// (cookie httpOnly), un mecanismo completamente distinto. Este endpoint
// cumple la regla 1 del CLAUDE.md raiz ("registro autenticado") verificando
// la assertion de mock-sso dentro del use case, no con sesion de plataforma.
@UseGuards(ThrottlerGuard)
@ApiTags('registration')
@Controller('elections/:electionId/registration-requests')
export class RegistrationController {
  constructor(
    private readonly submitRegistrationRequest: SubmitRegistrationRequestUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Registra a un votante habilitado en una elección (CU-05)' })
  @ApiResponse({ status: 201, type: RegistrationRequestResponseDto })
  @ApiResponse({ status: 401, description: 'REGISTRATION_INVALID_ASSERTION' })
  @ApiResponse({ status: 403, description: 'REGISTRATION_NOT_ELIGIBLE' })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description: 'REGISTRATION_WINDOW_CLOSED | REGISTRATION_ALREADY_REGISTERED',
  })
  async submit(
    @Param('electionId') electionId: string,
    @Body() body: SubmitRegistrationRequestDto,
  ): Promise<RegistrationRequestResponseDto> {
    const output = await this.submitRegistrationRequest.execute(electionId, body);
    return RegistrationRequestResponseDto.fromUseCaseOutput(output);
  }
}
