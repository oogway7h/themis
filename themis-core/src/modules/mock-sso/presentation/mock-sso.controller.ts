import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticateMockUserUseCase } from '../application/authenticate-mock-user.usecase';
import { LoginMockSsoDto } from './dto/login-mock-sso.dto';
import { MockSsoAssertionResponseDto } from './dto/mock-sso-assertion-response.dto';

@ApiTags('mock-sso')
@Controller('mock-sso')
export class MockSsoController {
  constructor(
    private readonly authenticateMockUser: AuthenticateMockUserUseCase,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Simula el SSO institucional: valida credenciales de prueba y emite una assertion de elegibilidad (HU-00)',
  })
  @ApiResponse({ status: 200, type: MockSsoAssertionResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  async login(
    @Body() body: LoginMockSsoDto,
  ): Promise<MockSsoAssertionResponseDto> {
    return this.authenticateMockUser.execute({
      codigoInstitucional: body.codigoInstitucional,
      password: body.password,
    });
  }
}
