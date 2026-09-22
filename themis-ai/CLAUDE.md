# themis-ai

Microservicio de proyección de resultados electorales (IA/estadística). Contexto de producto completo en [`../docs/diseno-consolidado.md`](../docs/diseno-consolidado.md), fase 4 (CU-12, CU-13) — analítica exclusiva de Admin/Auditor, nunca pública.

**Todavía no está en uso activo dentro del proyecto** (sin `.venv` creado ni integrado al flujo de trabajo diario). No tocar hasta que se retome explícitamente.

## Frontera de datos — no negociable

**Este servicio no tiene acceso a la base de datos** y no recibe datos personales. Solo acepta series de conteos agregados en el body y devuelve una proyección. No se expone a internet: solo `themis-core` lo invoca (autenticado con `SERVICE_TOKEN`, que debe coincidir con `AI_SERVICE_TOKEN` en `themis-core/.env`). El dashboard web nunca le habla directo, siempre a través de `themis-core`. Si en algún momento parece necesario conectarlo a Postgres, es señal de que el diseño se está desviando — replantear antes de hacerlo (ver `README.md` de este repo, ya lo dice explícito).

## Stack

Python 3.13, FastAPI + uvicorn, pydantic-settings, numpy/pandas/statsmodels/scikit-learn.

## Arranque local (cuando se retome)

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows bash; en PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

- API: `http://localhost:8000/api/v1`
- Swagger: `http://localhost:8000/docs`

## Estructura

```
app/api/         Rutas FastAPI
app/core/        Config (pydantic-settings) y verificacion de SERVICE_TOKEN
app/models/      Modelo baseline de proyeccion
app/schemas/     Pydantic (forecast request/response)
app/services/    Logica de forecast_service
```
