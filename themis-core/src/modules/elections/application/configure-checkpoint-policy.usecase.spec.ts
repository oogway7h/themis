import { CreateElectionUseCase } from './create-election.usecase';
import { ConfigureCheckpointPolicyUseCase } from './configure-checkpoint-policy.usecase';
import { GetEffectivePolicyUseCase } from './get-effective-policy.usecase';
import {
  CheckpointIntervalOutOfRangeError,
  RateLimitThresholdOutOfRangeError,
  CheckpointPolicyLockedError,
} from './election.errors';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';

describe('ConfigureCheckpointPolicyUseCase / GetEffectivePolicyUseCase', () => {
  let repository: InMemoryElectionRepository;
  let createUseCase: CreateElectionUseCase;
  let configureUseCase: ConfigureCheckpointPolicyUseCase;
  let getEffectiveUseCase: GetEffectivePolicyUseCase;

  beforeEach(() => {
    repository = new InMemoryElectionRepository();
    createUseCase = new CreateElectionUseCase(repository);
    configureUseCase = new ConfigureCheckpointPolicyUseCase(repository, repository);
    getEffectiveUseCase = new GetEffectivePolicyUseCase(repository);
  });

  async function createElection() {
    return createUseCase.execute(
      {
        nombre: 'Representante FICCT',
        registroInicio: new Date('2026-01-01T00:00:00Z'),
        registroFin: new Date('2026-01-10T00:00:00Z'),
        votacionInicio: new Date('2026-01-10T00:00:00Z'),
        votacionFin: new Date('2026-01-12T00:00:00Z'),
        opciones: [{ nombre: 'A' }, { nombre: 'B' }],
      },
      'admin-1',
    );
  }

  it('devuelve el valor por defecto de sistema si no fue configurado (AC-05)', async () => {
    const election = await createElection();

    const policy = await getEffectiveUseCase.execute(election.id);

    expect(policy).toEqual({
      checkpointIntervalMinutes: 60,
      rateLimitThresholdPerMinute: 50,
      esValorPorDefecto: true,
    });
  });

  it('configura y luego devuelve el valor explícito (AC-01, AC-02)', async () => {
    const election = await createElection();

    const configured = await configureUseCase.execute(election.id, {
      checkpointIntervalMinutes: 30,
      rateLimitThresholdPerMinute: 100,
    }, 'admin-2');
    expect(configured.updatedBy).toBe('admin-2');
    const policy = await getEffectiveUseCase.execute(election.id);

    expect(policy).toEqual({
      checkpointIntervalMinutes: 30,
      rateLimitThresholdPerMinute: 100,
      esValorPorDefecto: false,
    });
  });

  it('rechaza un intervalo fuera de rango', async () => {
    const election = await createElection();

    await expect(
      configureUseCase.execute(election.id, {
        checkpointIntervalMinutes: 2,
        rateLimitThresholdPerMinute: 50,
      }, 'admin-2'),
    ).rejects.toBeInstanceOf(CheckpointIntervalOutOfRangeError);
  });

  it('rechaza un umbral fuera de rango', async () => {
    const election = await createElection();

    await expect(
      configureUseCase.execute(election.id, {
        checkpointIntervalMinutes: 60,
        rateLimitThresholdPerMinute: 20000,
      }, 'admin-2'),
    ).rejects.toBeInstanceOf(RateLimitThresholdOutOfRangeError);
  });

  it('rechaza configurar si el registro ya está abierto (AC-04)', async () => {
    const election = await createElection();
    repository.forceStatus(election.id, 'REGISTRO_ABIERTO');

    await expect(
      configureUseCase.execute(election.id, {
        checkpointIntervalMinutes: 60,
        rateLimitThresholdPerMinute: 50,
      }, 'admin-2'),
    ).rejects.toBeInstanceOf(CheckpointPolicyLockedError);
  });
});
