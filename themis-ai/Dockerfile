FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

FROM base AS deps
COPY requirements.txt ./
RUN pip install --prefix=/install -r requirements.txt

FROM base AS runtime
RUN useradd --create-home --shell /bin/false themis
COPY --from=deps /install /usr/local
COPY --chown=themis:themis app ./app
USER themis
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
