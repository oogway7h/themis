// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Semaphore } from "@semaphore-protocol/contracts/Semaphore.sol";
import { ISemaphoreVerifier } from "@semaphore-protocol/contracts/interfaces/ISemaphoreVerifier.sol";

/// @notice Despliega el contrato Semaphore oficial (v4) tal cual, sin cambios de
/// comportamiento. Se mantiene como wrapper con nombre propio (en vez de desplegar
/// `Semaphore` directamente) para que el registro de despliegue
/// (`deployments/<network>-semaphore.json`) y las variables de entorno tengan un
/// nombre especifico de Themis, igual que ya pasa con ThemisRegistry.sol.
///
/// Un grupo Semaphore = una eleccion. El admin de cada grupo es la wallet relayer
/// del backend (unica cuenta que llama addMembers); el multisig 3-de-5 ya ocurrio
/// off-chain en ApproveBatchUseCase antes de llegar a esta transaccion.
contract ThemisSemaphoreRegistry is Semaphore {
    constructor(ISemaphoreVerifier _verifier) Semaphore(_verifier) {}
}
