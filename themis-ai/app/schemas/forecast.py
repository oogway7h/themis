from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class SeriesPoint(BaseModel):
    t: int = Field(description="Indice temporal relativo")
    votes: int = Field(ge=0, description="Conteo acumulado agregado")


class SimulateRequest(BaseModel):
    election_id: str = Field(alias="electionId", min_length=1, max_length=128)
    num_votes: int = Field(alias="numVotes", default=1500, ge=10, le=10000)

    model_config = {"populate_by_name": True}


class ForecastRequest(BaseModel):
    election_id: str = Field(alias="electionId", min_length=1, max_length=128)
    horizon: int = Field(default=5, ge=1, le=100)
    series: list[SeriesPoint] = Field(default_factory=list)
    start_time: Optional[datetime] = Field(alias="startTime", default=None)
    cap: Optional[int] = Field(default=None, description="Padron total para modelo logistico")

    model_config = {"populate_by_name": True}


class CandidateProjection(BaseModel):
    option_id: str = Field(serialization_alias="optionId")
    nombre: str
    current_votes: int = Field(serialization_alias="currentVotes")
    projected_votes: int = Field(serialization_alias="projectedVotes")
    win_probability: float = Field(serialization_alias="winProbability")

class ForecastResponse(BaseModel):
    election_id: str = Field(serialization_alias="electionId")
    model: str
    history: list[SeriesPoint] = Field(default_factory=list)
    projection: list[SeriesPoint]
    congestion_projection: list[SeriesPoint] = Field(serialization_alias="congestionProjection", default_factory=list)
    dropoff_projection: list[SeriesPoint] = Field(serialization_alias="dropoffProjection", default_factory=list)
    projected_total: int = Field(serialization_alias="projectedTotal")
    cap: int = Field(default=0)
    winner_projection: list[CandidateProjection] = Field(serialization_alias="winnerProjection", default_factory=list)

    model_config = {"populate_by_name": True}
