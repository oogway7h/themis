import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PresentCredentialUseCase } from '../application/present-credential.usecase';
import { PresentCredentialDto } from './dto/present-credential.dto';
import { PresentedCredentialResponseDto } from './dto/presented-credential-response.dto';

// Sin auth de ningun tipo, ni siquiera la assertion que exige el registro:
// la firma valida es la unica prueba de habilitacion, y probarla de forma
// anonima es justamente el punto (ver README del modulo, "Presentacion
// anonima de la credencial"). Mismo espiritu que el futuro endpoint de voto.
@UseGuards(ThrottlerGuard)
@ApiTags('registration')
@Controller('elections/:electionId/credentials')
export class PresentedCredentialController {
  constructor(private readonly presentCredential: PresentCredentialUseCase) {}

  @Post('present')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Presenta una credencial certificada de forma anonima, sin ligarla al registro original',
  })
  @ApiResponse({ status: 201, type: PresentedCredentialResponseDto })
  @ApiResponse({ status: 400, description: 'CREDENTIAL_INVALID_SIGNATURE' })
  @ApiResponse({ status: 404, description: 'ELECTION_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ELECTION_CLOSED | CREDENTIAL_ALREADY_PRESENTED' })
  async present(
    @Param('electionId') electionId: string,
    @Body() body: PresentCredentialDto,
  ): Promise<PresentedCredentialResponseDto> {
    const credential = await this.presentCredential.execute(electionId, body);
    return PresentedCredentialResponseDto.fromDomain(credential);
  }
}
