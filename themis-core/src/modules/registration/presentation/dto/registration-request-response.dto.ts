import { ApiProperty } from '@nestjs/swagger';
import { RegistrationRequest } from '../../domain/registration-request.entity';
import { SubmitRegistrationRequestOutput } from '../../application/submit-registration-request.usecase';

export class RegistrationRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({
    description:
      'Firma ciega (base64) sobre blindedMessage. El cliente la usa con suite.finalize() para obtener la credencial certificada; el backend nunca vio el commitment real.',
  })
  blindSignature!: string;

  static fromDomain(request: RegistrationRequest): RegistrationRequestResponseDto {
    const dto = new RegistrationRequestResponseDto();
    dto.id = request.id;
    dto.status = request.status;
    dto.createdAt = request.createdAt.toISOString();
    return dto;
  }

  static fromUseCaseOutput(
    output: SubmitRegistrationRequestOutput,
  ): RegistrationRequestResponseDto {
    const dto = RegistrationRequestResponseDto.fromDomain(output.request);
    dto.blindSignature = output.blindSignature;
    return dto;
  }
}
