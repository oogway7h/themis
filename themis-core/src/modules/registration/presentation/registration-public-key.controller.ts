import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistrationSigningService } from '../infrastructure/registration-signing.service';
import { RegistrationPublicKeyResponseDto } from './dto/registration-public-key-response.dto';

// Sin auth: una clave publica no es secreta por definicion.
@ApiTags('registration')
@Controller('registration')
export class RegistrationPublicKeyController {
  constructor(private readonly signingService: RegistrationSigningService) {}

  @Get('public-key')
  @ApiOperation({ summary: 'Clave publica para cegar el commitment antes de registrarse (CU-05)' })
  @ApiResponse({ status: 200, type: RegistrationPublicKeyResponseDto })
  get(): RegistrationPublicKeyResponseDto {
    const dto = new RegistrationPublicKeyResponseDto();
    dto.publicKeyJwk = this.signingService.getPublicKeyJwk();
    return dto;
  }
}
