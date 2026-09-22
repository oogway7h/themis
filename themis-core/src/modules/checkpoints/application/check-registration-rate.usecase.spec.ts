import { CreateElectionUseCase } from '../../elections/application/create-election.usecase';
import { CheckRegistrationRateUseCase } from './check-registration-rate.usecase';
import { InMemoryElectionRepository } from '../../../../test/doubles/in-memory-election.repository';
import { InMemoryPresentedCredentialRepository } from '../../../../test/doubles/in-memory-presented-credential.repository';
import { InMemoryRateAlertRepository } from '../../../../test/doubles/in-memory-rate-alert.repository';

describe('CheckRegistrationRateUseCase', () => {
  let electionRepository: InMemoryElectionRepository;
  let credentialRepository: InMemoryPresentedCredentialRepository;
  let alertRepository: InMemoryRateAlertRepository;
  let useCase: CheckRegistrationRateUseCase;

  beforeEach(() => {
    electionRepository = new InMemoryElectionRepository();
    credentialRepository = new InMemoryPresentedCredentialRepository();
    alertRepository = new InMemoryRateAlertRepository();
    useCase = new CheckRegistrationRateUseCase(
      electionRepository,
      credentialRepository,
      alertRepository,
    );
  });

  // El conteo usa presentedAt < ahora: sin esperar, las credenciales recien creadas pueden
  // caer en el mismo milisegundo que la ventana y quedar fuera.
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

  async function createOpenElection() {
    const create = new CreateElectionUseCase(electionRepository);
    const election = await create.execute(
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
    electionRepository.forceStatus(election.id, 'REGISTRO_ABIERTO');
    return election;
  }

  it('no crea alerta si el ritmo esta bajo el umbral (AC-01)', async () => {
    const election = await createOpenElection();
    await credentialRepository.create({
      electionId: election.id,
      commitment: 'c1',
      preparedMessage: 'm1',
      signature: 's1',
    });

    await useCase.execute();

    expect(await alertRepository.findByElection(election.id)).toHaveLength(0);
  });

  it('crea una alerta si el ritmo supera el umbral configurado (AC-02)', async () => {
    const election = await createOpenElection();
    // rateLimitThresholdEfectivo por defecto es 50 -- forzamos 51 credenciales recientes.
    for (let i = 0; i < 51; i += 1) {
      await credentialRepository.create({
        electionId: election.id,
        commitment: `c${i}`,
        preparedMessage: `m${i}`,
        signature: `s${i}`,
      });
    }

    await tick();
    await useCase.execute();

    const alerts = await alertRepository.findByElection(election.id);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].registrationCount).toBe(51);
    expect(alerts[0].thresholdPerMinute).toBe(50);
  });

  it('no duplica alertas dentro del cooldown (AC-03)', async () => {
    const election = await createOpenElection();
    for (let i = 0; i < 51; i += 1) {
      await credentialRepository.create({
        electionId: election.id,
        commitment: `c${i}`,
        preparedMessage: `m${i}`,
        signature: `s${i}`,
      });
    }

    await tick();
    await useCase.execute();
    await useCase.execute();

    expect(await alertRepository.findByElection(election.id)).toHaveLength(1);
  });
});
