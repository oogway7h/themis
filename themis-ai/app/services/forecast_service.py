from app.models.prophet_model import ProphetProjection
from app.schemas.forecast import ForecastRequest, ForecastResponse, SeriesPoint


class ForecastService:
    def __init__(self, model: ProphetProjection | None = None) -> None:
        self._model = model or ProphetProjection()

    def run(self, request: ForecastRequest) -> ForecastResponse:
        ordered = sorted(request.series, key=lambda point: point.t)
        t = [point.t for point in ordered]
        votes = [point.votes for point in ordered]

        future_t, turnout, congestion, dropoff = self._model.fit_predict(
            t, votes, request.horizon, request.start_time, request.cap
        )

        projection = [
            SeriesPoint(t=step, votes=value)
            for step, value in zip(future_t, turnout, strict=True)
        ]
        
        congestion_projection = [
            SeriesPoint(t=step, votes=value)
            for step, value in zip(future_t, congestion, strict=True)
        ]
        
        dropoff_projection = [
            SeriesPoint(t=step, votes=value)
            for step, value in zip(future_t, dropoff, strict=True)
        ]

        projected_total = projection[-1].votes if projection else 0

        return ForecastResponse(
            election_id=request.election_id,
            model=self._model.name,
            history=request.series,
            projection=projection,
            congestion_projection=congestion_projection,
            dropoff_projection=dropoff_projection,
            projected_total=projected_total,
        )
