import { Inject, Injectable, Logger } from '@nestjs/common';
import { ELECTION_REPOSITORY, ElectionRepository } from '../domain/election.repository';
import { AUTHORITY_REPOSITORY, AuthorityRepository } from '../domain/authority.repository';
import { Election } from '../domain/election.entity';
import { AUTHORITY_QUOTA } from '../domain/election.constants';
import { nextStatusByDates } from './election-lifecycle';

/**
 * Ciclo de vida automatico de la eleccion segun sus fechas:
 * BORRADOR -> REGISTRO_ABIERTO (registroInicio) -> REGISTRO_CERRADO (registroFin)
 * -> VOTACION_ABIERTA (votacionInicio) -> CERRADA (votacionFin).
 *
 * Invocado por el cron (ver ElectionLifecycleScheduler). Cada transicion usa un
 * compare-and-swap (ElectionRepository.transitionStatus), asi que dos ticks o dos
 * instancias del backend no pueden aplicar el mismo cambio dos veces.
 *
 * Abrir el registro exige padron configurado y las 5 autoridades designadas: sin
 * eso no habria arbol donde insertar ni quien apruebe los lotes. Si faltan, la
 * eleccion sigue en BORRADOR y se reintenta en el siguiente tick. La politica de
 * checkpoint NO es requisito, tiene valores por defecto.
 */
@Injectable()
export class AdvanceElectionLifecycleUseCase {
  private readonly logger = new Logger(AdvanceElectionLifecycleUseCase.name);
  private readonly lastWarning = new Map<string, string>();

  constructor(
    @Inject(ELECTION_REPOSITORY)
    private readonly electionRepository: ElectionRepository,
    @Inject(AUTHORITY_REPOSITORY)
    private readonly authorityRepository: AuthorityRepository,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const elections = await this.electionRepository.findMany({
      estados: ['BORRADOR', 'REGISTRO_ABIERTO', 'REGISTRO_CERRADO', 'VOTACION_ABIERTA'],
    });

    for (const election of elections) {
      try {
        await this.advance(election, now);
      } catch (error) {
        this.logger.error(
          `Fallo el avance de ciclo de vida de election=${election.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async advance(election: Election, now: Date): Promise<void> {
    const target = nextStatusByDates(election, now);

    if (target === null) {
      this.warnIfNeverOpened(election, now);
      return;
    }

    if (target === 'REGISTRO_ABIERTO') {
      const missing = await this.missingRequirementsToOpen(election);
      if (missing.length > 0) {
        this.warnOnce(
          election.id,
          `Election ${election.id} ya llego a registroInicio pero no se abre el registro: ${missing.join(', ')}`,
        );
        return;
      }
    }

    const won = await this.electionRepository.transitionStatus(election.id, election.estado, target);
    if (won) {
      this.lastWarning.delete(election.id);
      this.logger.log(`Election ${election.id}: ${election.estado} -> ${target}`);
    }
  }

  private async missingRequirementsToOpen(election: Election): Promise<string[]> {
    const missing: string[] = [];
    if (!election.padronConfigurado) {
      missing.push('padron sin configurar');
    }
    const authorities = await this.authorityRepository.findByElection(election.id);
    if (authorities.length !== AUTHORITY_QUOTA) {
      missing.push(`autoridades designadas ${authorities.length}/${AUTHORITY_QUOTA}`);
    }
    return missing;
  }

  private warnIfNeverOpened(election: Election, now: Date): void {
    if (election.estado === 'BORRADOR' && now.getTime() >= election.registroFin.getTime()) {
      this.warnOnce(
        election.id,
        `Election ${election.id} sigue en BORRADOR y su ventana de registro ya termino: no se abrira`,
      );
    }
  }

  // Evita repetir el mismo aviso cada minuto mientras nada cambie.
  private warnOnce(electionId: string, message: string): void {
    if (this.lastWarning.get(electionId) === message) {
      return;
    }
    this.lastWarning.set(electionId, message);
    this.logger.warn(message);
  }
}
