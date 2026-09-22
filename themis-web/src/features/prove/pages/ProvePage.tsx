import { useEffect, useState } from 'react';
import { Group } from '@semaphore-protocol/group';
import { Identity } from '@semaphore-protocol/identity';
import { generateProof } from '@semaphore-protocol/proof';

// CU-10: esta pagina NO es una via de voto publico (regla 3 del CLAUDE.md
// raiz) -- solo existe para ser cargada dentro del WebView interno de
// themis-app, que llama `window.generateSemaphoreProof(...)` o
// `window.generateVoteProof(json)` (inyectado como JS) y recibe la respuesta
// por `window.ThemisProverChannel` o `window.ThemisVoteChannel`.

interface GenerateVoteProofPayload {
  identityPrivateKey: string;
  electionId: string;
  optionId: string;
  apiBaseUrl: string;
}

interface VotingContextOption {
  id: string;
  onChainIndex: number;
}

interface VotingContextResponse {
  electionId: string;
  onChainGroupId: string;
  members: string[];
  options: VotingContextOption[];
}

declare global {
  interface Window {
    ThemisProverChannel?: { postMessage: (message: string) => void };
    ThemisVoteChannel?: { postMessage: (message: string) => void };
    generateSemaphoreProof?: (
      privateKey: string,
      members: string[],
      message: string,
      scope: string,
    ) => Promise<unknown>;
    generateVoteProof?: (payloadJson: string) => Promise<void>;
  }
}

function postMessageToApp(data: Record<string, unknown>): void {
  const json = JSON.stringify(data);
  if (window.ThemisProverChannel) {
    window.ThemisProverChannel.postMessage(json);
  }
  if (window.ThemisVoteChannel) {
    window.ThemisVoteChannel.postMessage(json);
  }
}

async function runDirectProver(
  privateKey: string,
  members: string[],
  message: string,
  scope: string,
) {
  let identity: Identity;
  try {
    identity = Identity.import(privateKey);
  } catch {
    identity = new Identity(privateKey);
  }

  const group = new Group(members.map((m) => BigInt(m)));
  const proof = await generateProof(
    identity,
    group,
    BigInt(message),
    BigInt(scope),
  );

  const formattedProof = {
    merkleTreeDepth: proof.merkleTreeDepth,
    merkleTreeRoot: proof.merkleTreeRoot.toString(),
    nullifier: proof.nullifier.toString(),
    message: proof.message.toString(),
    scope: proof.scope.toString(),
    points: proof.points.map((p) => p.toString()),
  };

  postMessageToApp({ ok: true, proof: formattedProof });
  return formattedProof;
}

async function handleGenerateVoteProof(payloadJson: string): Promise<void> {
  let payload: GenerateVoteProofPayload;
  try {
    payload = JSON.parse(payloadJson) as GenerateVoteProofPayload;
  } catch {
    postMessageToApp({ ok: false, error: 'Payload invalido: no es JSON valido' });
    return;
  }

  try {
    const { identityPrivateKey, electionId, optionId, apiBaseUrl } = payload;
    const response = await fetch(`${apiBaseUrl}/elections/${electionId}/voting-context`);
    if (!response.ok) {
      throw new Error(`voting-context respondio ${response.status}`);
    }
    const context = (await response.json()) as VotingContextResponse;

    const option = context.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      throw new Error('La opcion elegida no esta en el contexto de votacion de esta eleccion');
    }

    await runDirectProver(
      identityPrivateKey,
      context.members,
      option.onChainIndex.toString(),
      context.onChainGroupId,
    );
  } catch (error) {
    postMessageToApp({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function ProvePage() {
  const [status, setStatus] = useState<'ready' | 'generating' | 'done' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    window.generateSemaphoreProof = async (
      privateKey: string,
      members: string[],
      message: string,
      scope: string,
    ) => {
      setStatus('generating');
      setErrorMessage(null);
      try {
        const proof = await runDirectProver(privateKey, members, message, scope);
        setStatus('done');
        return proof;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        setStatus('error');
        postMessageToApp({ ok: false, error: msg });
        throw err;
      }
    };

    window.generateVoteProof = handleGenerateVoteProof;

    return () => {
      delete window.generateSemaphoreProof;
      delete window.generateVoteProof;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur">
        <h1 className="text-xl font-semibold tracking-tight text-emerald-400">
          Themis Zero-Knowledge Prover
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Módulo criptográfico headless para generación de pruebas ZK-SNARK (Groth16 Semaphore).
        </p>

        <div className="mt-6 flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              status === 'ready'
                ? 'bg-emerald-500 animate-pulse'
                : status === 'generating'
                ? 'bg-amber-500 animate-spin'
                : status === 'done'
                ? 'bg-blue-500'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-sm font-medium capitalize text-zinc-200">
            {status === 'ready' && 'Prover listo (en espera de parámetros)'}
            {status === 'generating' && 'Generando prueba criptográfica Groth16...'}
            {status === 'done' && 'Prueba generada exitosamente'}
            {status === 'error' && 'Error al generar la prueba'}
          </span>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-rose-950/50 p-3 text-xs text-rose-300 border border-rose-800/50">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
