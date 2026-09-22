from fastapi import APIRouter, Depends, HTTPException

from app.core.security import require_service_token
from app.schemas.forecast import ForecastRequest, ForecastResponse, SeriesPoint, CandidateProjection, SimulateRequest
from app.services.forecast_service import ForecastService
from app.db import get_db_connection, get_active_election, calculate_cap, get_registration_series, get_live_tally, inject_simulation_data

router = APIRouter()
service = ForecastService()

@router.post(
    "/simulate",
    dependencies=[Depends(require_service_token)],
    summary="Inyecta datos falsos para calibrar IA (CU-12)",
)
async def simulate_data(payload: SimulateRequest):
    conn = await get_db_connection()
    try:
        # Si dice "auto", buscamos la eleccion activa
        election_id = payload.election_id
        if election_id == "auto":
            election = await get_active_election(conn)
            if not election:
                raise HTTPException(status_code=404, detail="No hay eleccion activa")
            election_id = election["id"]
            
        await inject_simulation_data(conn, election_id, num_votes=payload.num_votes)
        
        # Limpiar el cache para forzar lectura fresca
        global _offline_cache
        _offline_cache = {}
        
        return {"success": True, "message": f"{payload.num_votes} votos inyectados", "electionId": election_id}
    finally:
        await conn.close()


from typing import Dict, Any

_offline_cache: Dict[str, Any] = {}

@router.post(
    "/forecast",
    response_model=ForecastResponse,
    response_model_by_alias=True,
    dependencies=[Depends(require_service_token)],
    summary="Proyecta el resultado a partir de conteos agregados",
)
async def create_forecast(payload: ForecastRequest) -> ForecastResponse:
    global _offline_cache
    conn = None
    try:
        conn = await get_db_connection()
        # 1. Encontrar la eleccion activa
        election = await get_active_election(conn)
        if not election:
            raise HTTPException(status_code=404, detail="No hay ninguna eleccion configurada en la base de datos")
            
        election_id = election["id"]
        
        # 2. Calcular el Padron Total (cap)
        cap = await calculate_cap(conn, election)
        
        # 3. Obtener la serie de tiempo real
        raw_series = await get_registration_series(conn, election_id)
        
        # 4. Obtener el conteo en vivo por candidato
        live_tally = await get_live_tally(conn, election_id)
        
        # Guardar en Cache Local (RAM)
        _offline_cache['election_id'] = election_id
        _offline_cache['cap'] = cap
        _offline_cache['raw_series'] = raw_series
        _offline_cache['live_tally'] = live_tally
        
    except Exception as e:
        if not _offline_cache:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=503, detail="Sin conexión a BD y sin caché offline previo.")
        
        # Modo Offline: rescatar datos
        election_id = _offline_cache['election_id']
        cap = _offline_cache['cap']
        raw_series = _offline_cache['raw_series']
        live_tally = _offline_cache['live_tally']
        
    finally:
        if conn:
            await conn.close()
            
    # Formatear para el modelo Prophet
    series = [SeriesPoint(t=row["t"], votes=row["votes"]) for row in raw_series]
    
    # Si aun no hay votos o registros, ponemos un dummy corto para que Prophet no crashee
    if len(series) < 2:
        series = [SeriesPoint(t=1, votes=0), SeriesPoint(t=2, votes=1)]
        
    # Actualizar el payload original y ejecutar el modelo matemático
    payload.election_id = election_id
    payload.series = series
    payload.cap = cap
    
    response = service.run(payload)
    response.cap = cap
    
    # === MODULO: PROYECCION DE GANADOR ===
    projected_total = response.projected_total
    total_current_votes = sum(c['vote_count'] for c in live_tally)
    remaining_votes = max(0, projected_total - total_current_votes)
    
    winner_projection = []
    if total_current_votes > 0:
        for c in live_tally:
            prop = c['vote_count'] / total_current_votes
            proj_votes = c['vote_count'] + int(remaining_votes * prop)
            winner_projection.append(CandidateProjection(
                option_id=c['id'],
                nombre=c['nombre'],
                current_votes=c['vote_count'],
                projected_votes=proj_votes,
                win_probability=prop * 100.0
            ))
    else:
        # Distribucion igualitaria si nadie tiene votos
        num_candidates = len(live_tally)
        if num_candidates > 0:
            for c in live_tally:
                proj_votes = int(remaining_votes / num_candidates)
                winner_projection.append(CandidateProjection(
                    option_id=c['id'],
                    nombre=c['nombre'],
                    current_votes=0,
                    projected_votes=proj_votes,
                    win_probability=(1.0 / num_candidates) * 100.0
                ))
                
    response.winner_projection = winner_projection
    return response
