# themis-ai

Microservicio de proyeccion de resultados electorales.

## Frontera de datos

Este servicio **no tiene acceso a la base de datos** y no recibe datos personales. Solo acepta series de conteos agregados en el cuerpo de la peticion y devuelve una proyeccion.

Tampoco se expone a internet. Solo `themis-core` lo invoca, autenticado con un token de servicio. El dashboard web habla con `themis-core`, nunca con este servicio.

Si en algun momento necesitas conectarlo a Postgres, para y replantea el diseno.

## Requisitos

| Herramienta | Version |
|---|---|
| Python | 3.13 (ver `.python-version`) |

## Arranque

```bash
python -m venv .venv
```

Activa el entorno:

```bash
# Windows (bash)
source .venv/Scripts/activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Linux / macOS
source .venv/bin/activate
```

Instala y arranca:

```bash
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000/api/v1
- Swagger: http://localhost:8000/docs

## Variables de entorno

| Variable | Para que sirve |
|---|---|
| `APP_ENV` | Entorno de ejecucion |
| `PORT` | Puerto HTTP |
| `LOG_LEVEL` | Nivel de logging |
| `API_PREFIX` | Prefijo de las rutas versionadas |
| `SERVICE_TOKEN` | Debe coincidir con `AI_SERVICE_TOKEN` de themis-core |

## Endpoints

| Endpoint | Auth | Que hace |
|---|---|---|
| `GET /health` | no | Estado del servicio |
| `POST /api/v1/forecast` | si | Proyecta a partir de conteos agregados |

Ejemplo:

```bash
curl -X POST http://localhost:8000/api/v1/forecast \
  -H "content-type: application/json" \
  -H "x-service-token: themis-dev-service-token" \
  -d '{"electionId":"demo","horizon":3,"series":[{"t":0,"votes":10},{"t":1,"votes":25},{"t":2,"votes":41}]}'
```

## Estructura

```
app/core/config.py       Configuracion con pydantic-settings
app/core/security.py     Verificacion del token de servicio
app/api/v1/endpoints/    Rutas
app/schemas/             Contratos de entrada y salida
app/services/            Orquestacion
app/models/              Logica del modelo predictivo
tests/                   pytest
```

## Modelo actual

`app/models/baseline.py` es un placeholder: regresion lineal por minimos cuadrados con monotonia no decreciente forzada. Cumple el contrato de la API pero no es un modelo serio.

`statsmodels` y `scikit-learn` estan instalados y sin usar, listos para el modelo real. Al reemplazarlo, manten la interfaz `fit_predict(t, votes, horizon)` y el atributo `name` para no tocar el resto del codigo.

## Tests

```bash
pytest
```

Cubren: health sin token, forecast sin token (401), token invalido (401), tendencia creciente, monotonia y serie vacia.

## Docker

```bash
docker compose up --build
```

## Calidad

```bash
ruff check .
mypy app
```
