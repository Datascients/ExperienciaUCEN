import os
import httpx
from datetime import datetime, timezone
from src.db import supabase_client as db

SCORING_ENDPOINT = os.environ.get("ML_SCORING_ENDPOINT", "")


async def worker_scoring(estudiante_id: str, features: dict) -> dict:
    if SCORING_ENDPOINT:
        resultado = await _llamar_endpoint(estudiante_id, features)
        if resultado:
            await _guardar_score(estudiante_id, resultado, features)
            return {"ok": True, **resultado}

    cached = await db.obtener_score_ml(estudiante_id)
    if cached:
        return {
            "ok": True,
            "score": cached["score"],
            "nivel": cached["nivel"],
            "factores_criticos": cached.get("features", {}).get("factores_criticos", []),
            "fuente": "cache",
        }

    score_calculado = _calcular_score_local(features)
    await _guardar_score(estudiante_id, score_calculado, features)
    return {"ok": True, **score_calculado, "fuente": "local"}


async def _llamar_endpoint(estudiante_id: str, features: dict) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{SCORING_ENDPOINT}/score",
                json={"estudiante_id": estudiante_id, "features": features},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return None


def _calcular_score_local(features: dict) -> dict:
    promedio = features.get("promedio", 5.0)
    asistencia = features.get("porcentaje_asistencia", 1.0)
    reprobadas = features.get("materias_reprobadas", 0)
    semestre = features.get("semestre", 1)

    score = 0.0
    score += max(0, (5.0 - promedio) / 5.0) * 0.35
    score += max(0, 1.0 - asistencia) * 0.30
    score += min(reprobadas / 5.0, 1.0) * 0.25
    score += max(0, (semestre - 1) / 10.0) * 0.10

    score = round(min(score, 1.0), 4)
    nivel = "alto" if score >= 0.7 else ("medio" if score >= 0.4 else "bajo")

    factores = []
    if promedio < 4.0:
        factores.append("promedio_bajo")
    if asistencia < 0.7:
        factores.append("asistencia_critica")
    if reprobadas >= 2:
        factores.append("multiples_reprobaciones")

    return {"score": score, "nivel": nivel, "factores_criticos": factores}


async def _guardar_score(estudiante_id: str, resultado: dict, features: dict) -> None:
    await db.guardar_score_ml(
        {
            "estudiante_id": estudiante_id,
            "score": resultado["score"],
            "nivel": resultado["nivel"],
            "features": {**features, "factores_criticos": resultado.get("factores_criticos", [])},
            "modelo_version": "v1.0",
            "calculado_en": datetime.now(timezone.utc).isoformat(),
        }
    )
