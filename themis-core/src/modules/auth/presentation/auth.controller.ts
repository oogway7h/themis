import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LoginPlatformUserUseCase } from '../application/login-platform-user.usecase';
import { GetMeUseCase } from '../application/get-me.usecase';
import { CreateUserUseCase } from '../application/create-user.usecase';
import { ListPlatformUsersUseCase } from '../application/list-platform-users.usecase';
import { UpdatePlatformUserUseCase } from '../application/update-platform-user.usecase';
import { DeactivatePlatformUserUseCase } from '../application/deactivate-platform-user.usecase';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListUsersResponseDto } from './dto/list-users-response.dto';
import { PlatformUserResponseDto } from './dto/platform-user-response.dto';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { RolesGuard } from '../../../shared/auth/roles.guard';
import { Roles } from '../../../shared/auth/roles.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import { RequestUser } from '../../../shared/auth/jwt.strategy';
import {
  ACCESS_TOKEN_COOKIE,
  buildAccessTokenCookieOptions,
} from '../../../shared/auth/auth-cookie';
import { APP_CONFIG } from '../../../config/configuration';
import type { AppConfig } from '../../../config/configuration';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginPlatformUser: LoginPlatformUserUseCase,
    private readonly getMe: GetMeUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly listPlatformUsers: ListPlatformUsersUseCase,
    private readonly updatePlatformUser: UpdatePlatformUserUseCase,
    private readonly deactivatePlatformUser: DeactivatePlatformUserUseCase,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Login de Administrador/Autoridad/Auditor: emite la sesion en una cookie httpOnly (HU00_1)',
  })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.loginPlatformUser.execute({
      email: body.email,
      password: body.password,
    });

    res.cookie(
      ACCESS_TOKEN_COOKIE,
      result.accessToken,
      buildAccessTokenCookieOptions(this.config.nodeEnv === 'production'),
    );

    return { role: result.role, nombreCompleto: result.nombreCompleto };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Limpia la cookie de sesion' })
  @ApiResponse({ status: 200 })
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Devuelve la sesion actual a partir de la cookie' })
  @ApiResponse({ status: 200, type: MeResponseDto })
  @ApiResponse({ status: 401, description: 'Sin sesion o sesion expirada' })
  async me(@CurrentUser() user: RequestUser): Promise<MeResponseDto> {
    return this.getMe.execute(user.sub);
  }

  @Post('users')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERUSUARIO')
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Crea una cuenta de plataforma (ADMIN/AUTORIDAD_REGISTRO/AUDITOR). Solo SUPERUSUARIO.',
  })
  @ApiResponse({ status: 201, type: PlatformUserResponseDto })
  @ApiResponse({ status: 401, description: 'Sin sesion o sesion expirada' })
  @ApiResponse({ status: 403, description: 'El solicitante no es SUPERUSUARIO' })
  @ApiResponse({ status: 409, description: 'Ya existe una cuenta con ese email' })
  async createUserAccount(
    @Body() body: CreateUserDto,
  ): Promise<PlatformUserResponseDto> {
    const user = await this.createUser.execute(body);
    return this.toResponseDto(user);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERUSUARIO', 'ADMIN')
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Lista paginada de cuentas de plataforma activas, con filtros opcionales email/role. ' +
      'SUPERUSUARIO (gestion de cuentas) o ADMIN (buscar cuentas AUTORIDAD_REGISTRO para designar, HU-03).',
  })
  @ApiResponse({ status: 200, type: ListUsersResponseDto })
  @ApiResponse({ status: 401, description: 'Sin sesion o sesion expirada' })
  @ApiResponse({ status: 403, description: 'El solicitante no es SUPERUSUARIO ni ADMIN' })
  async listUserAccounts(
    @Query() query: ListUsersQueryDto,
  ): Promise<ListUsersResponseDto> {
    const result = await this.listPlatformUsers.execute(query);

    return {
      data: result.data.map((user) => this.toResponseDto(user)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERUSUARIO')
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Edita nombreCompleto/role de una cuenta de plataforma. No aplica a SUPERUSUARIO. Solo SUPERUSUARIO.',
  })
  @ApiResponse({ status: 200, type: PlatformUserResponseDto })
  @ApiResponse({ status: 401, description: 'Sin sesion o sesion expirada' })
  @ApiResponse({ status: 403, description: 'El solicitante no es SUPERUSUARIO' })
  @ApiResponse({
    status: 404,
    description: 'La cuenta no existe, ya esta desactivada, o es SUPERUSUARIO',
  })
  async updateUserAccount(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<PlatformUserResponseDto> {
    const user = await this.updatePlatformUser.execute({ id, ...body });
    return this.toResponseDto(user);
  }

  @Delete('users/:id')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERUSUARIO')
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Desactiva (soft-delete) una cuenta de plataforma. No aplica a SUPERUSUARIO. Solo SUPERUSUARIO.',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401, description: 'Sin sesion o sesion expirada' })
  @ApiResponse({ status: 403, description: 'El solicitante no es SUPERUSUARIO' })
  @ApiResponse({
    status: 404,
    description: 'La cuenta no existe, ya esta desactivada, o es SUPERUSUARIO',
  })
  async deactivateUserAccount(@Param('id') id: string): Promise<{ ok: true }> {
    await this.deactivatePlatformUser.execute(id);
    return { ok: true };
  }

  private toResponseDto(user: {
    id: string;
    email: string;
    nombreCompleto: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  }): PlatformUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      nombreCompleto: user.nombreCompleto,
      role: user.role as PlatformUserResponseDto['role'],
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
