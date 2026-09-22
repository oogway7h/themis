import os

os.environ.setdefault("SERVICE_TOKEN", "test-token")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402

client = TestClient(create_app())
HEADERS = {"x-service-token": "test-token"}


def test_health_no_requiere_token() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "themis-ai"


def test_forecast_sin_token_devuelve_401() -> None:
    response = client.post(
        "/api/v1/forecast",
        json={"electionId": "demo", "horizon": 3, "series": []},
    )
    assert response.status_code == 401


def test_forecast_con_token_invalido_devuelve_401() -> None:
    response = client.post(
        "/api/v1/forecast",
        headers={"x-service-token": "otro"},
        json={"electionId": "demo", "horizon": 3, "series": []},
    )
    assert response.status_code == 401


def test_forecast_proyecta_tendencia_creciente() -> None:
    series = [{"t": i, "votes": i * 10} for i in range(6)]
    response = client.post(
        "/api/v1/forecast",
        headers=HEADERS,
        json={"electionId": "demo", "horizon": 3, "series": series},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["electionId"] == "demo"
    assert body["model"] == "linear-least-squares"
    assert len(body["projection"]) == 3
    assert body["projection"][0]["t"] == 6
    assert body["projectedTotal"] >= series[-1]["votes"]


def test_forecast_es_monotono_no_decreciente() -> None:
    series = [{"t": 0, "votes": 100}, {"t": 1, "votes": 90}, {"t": 2, "votes": 80}]
    response = client.post(
        "/api/v1/forecast",
        headers=HEADERS,
        json={"electionId": "demo", "horizon": 4, "series": series},
    )

    assert response.status_code == 200
    votes = [point["votes"] for point in response.json()["projection"]]
    assert votes == sorted(votes)
    assert min(votes) >= 80


def test_forecast_con_serie_vacia_no_falla() -> None:
    response = client.post(
        "/api/v1/forecast",
        headers=HEADERS,
        json={"electionId": "demo", "horizon": 3, "series": []},
    )

    assert response.status_code == 200
    assert response.json()["projection"] == []
    assert response.json()["projectedTotal"] == 0
