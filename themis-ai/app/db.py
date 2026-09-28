import os
import asyncpg
from typing import List, Dict, Any, Optional
from app.core.config import get_settings

async def get_db_connection() -> asyncpg.Connection:
    database_url = get_settings().database_url
    if not database_url:
        raise ValueError("DATABASE_URL no esta configurada en .env")
    return await asyncpg.connect(database_url, timeout=3.0)

async def get_election_by_id(conn: asyncpg.Connection, election_id: str) -> Optional[Dict[str, Any]]:
    query = """
        SELECT id, elegibilidad_facultad, elegibilidad_tipo_usuario, elegibilidad_estado_academico, votacion_inicio
        FROM elections
        WHERE id = $1
    """
    row = await conn.fetchrow(query, election_id)
    if row:
        return dict(row)
    return None

async def get_active_election(conn: asyncpg.Connection) -> Optional[Dict[str, Any]]:
    query = """
        SELECT id, elegibilidad_facultad, elegibilidad_tipo_usuario, elegibilidad_estado_academico, votacion_inicio
        FROM elections
        WHERE estado IN ('VOTACION_ABIERTA', 'REGISTRO_ABIERTO', 'REGISTRO_CERRADO')
        ORDER BY created_at DESC
        LIMIT 1
    """
    row = await conn.fetchrow(query)
    if row:
        return dict(row)
    
    # Fallback
    query = "SELECT id, elegibilidad_facultad, elegibilidad_tipo_usuario, elegibilidad_estado_academico, votacion_inicio FROM elections ORDER BY created_at DESC LIMIT 1"
    row = await conn.fetchrow(query)
    if row:
        return dict(row)
    return None

async def calculate_cap(conn: asyncpg.Connection, election: Dict[str, Any]) -> int:
    conditions: List[str] = []
    values: List[Any] = []
    
    if election.get('elegibilidad_facultad'):
        conditions.append(f"facultad = ${len(values) + 1}")
        values.append(election['elegibilidad_facultad'])
    
    if election.get('elegibilidad_tipo_usuario'):
        conditions.append(f"tipo_usuario = ${len(values) + 1}")
        values.append(election['elegibilidad_tipo_usuario'])
        
    if election.get('elegibilidad_estado_academico'):
        conditions.append(f"estado_academico = ${len(values) + 1}")
        values.append(election['elegibilidad_estado_academico'])
        
    query = "SELECT COUNT(*) FROM mock_sso_users"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    count = await conn.fetchval(query, *values)
    return count or 0

async def get_registration_series(conn: asyncpg.Connection, election_id: str) -> List[Dict[str, Any]]:
    query = """
        SELECT 
            CAST(EXTRACT(EPOCH FROM (created_at - (SELECT MIN(created_at) FROM registration_requests WHERE election_id = $1))) / 60 AS INTEGER) as t,
            COUNT(*) OVER (ORDER BY created_at) as votes
        FROM registration_requests
        WHERE election_id = $1
        ORDER BY created_at ASC
    """
    rows = await conn.fetch(query, election_id)
    return [dict(r) for r in rows]

async def get_live_tally(conn: asyncpg.Connection, election_id: str) -> List[Dict[str, Any]]:
    query = """
        SELECT o.id, o.nombre, COUNT(v.id) as vote_count
        FROM options o
        LEFT JOIN vote_submissions v ON o.id = v.option_id
        WHERE o.election_id = $1
        GROUP BY o.id, o.nombre
        ORDER BY o.on_chain_index ASC
    """
    rows = await conn.fetch(query, election_id)
    return [dict(row) for row in rows]

import uuid
import random
from datetime import datetime, timedelta

async def inject_simulation_data(conn: asyncpg.Connection, election_id: str, num_votes: int = 1500) -> None:
    # 1. Limpiar datos falsos anteriores de esta eleccion (para que la simulacion sea repetible)
    await conn.execute("DELETE FROM vote_submissions WHERE election_id = $1", election_id)
    await conn.execute("DELETE FROM registration_requests WHERE election_id = $1", election_id)
    
    # 2. Obtener opciones (candidatos)
    options = await conn.fetch("SELECT id FROM options WHERE election_id = $1 ORDER BY on_chain_index ASC", election_id)
    if not options:
        raise ValueError("No hay opciones configuradas para esta eleccion.")
    
    # 3. Generar registros de empadronamiento (Curva S basica o simplemente distribucion en el tiempo)
    now = datetime.utcnow()
    start_time = now - timedelta(minutes=180) # Simulamos 3 horas de trafico
    
    registration_rows = []
    vote_rows = []
    
    # Distribucion probabilistica para que haya un ganador claro (55%, 30%, 15%...)
    # Si hay menos o mas opciones, se adapta
    weights = [0.55, 0.30, 0.15]
    if len(options) > 3:
        weights = [0.5, 0.3, 0.1] + [0.1 / (len(options)-3)] * (len(options)-3)
    elif len(options) < 3:
        weights = [0.6, 0.4][:len(options)]
        
    for i in range(num_votes):
        # Distribucion de tiempo (concentramos algunos al medio para generar el "Pico de red")
        # Usamos beta distribution para tener una curva S o gaussiana
        # random.betavariate(2, 2) da una campana centrada
        time_offset = random.betavariate(2, 2) * 180 
        created_at = start_time + timedelta(minutes=time_offset)
        
        req_id = str(uuid.uuid4())
        registration_rows.append((
            req_id,
            election_id,
            str(uuid.uuid4()), # scoped_token_hash (dummy)
            "blinded_dummy",
            "INSERTED",
            created_at
        ))
        
        # Asignar voto a un candidato basado en los pesos
        chosen_option = random.choices(options, weights=weights, k=1)[0]['id']
        
        vote_rows.append((
            str(uuid.uuid4()),
            election_id,
            chosen_option,
            str(uuid.uuid4()), # nullifier
            "merkle_dummy",
            "scope_dummy",
            "RELAY",
            created_at + timedelta(seconds=random.randint(5, 60)) # voto emitido poco despues del registro
        ))
        
    # Ordenar por tiempo para la insercion
    registration_rows.sort(key=lambda x: x[5])
    
    # 4. Insertar en bloque (Bulk Insert)
    await conn.executemany("""
        INSERT INTO registration_requests (id, election_id, scoped_token_hash, blinded_value, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, registration_rows)
    
    await conn.executemany("""
        INSERT INTO vote_submissions (id, election_id, option_id, nullifier, merkle_tree_root, scope, source, submitted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    """, vote_rows)
