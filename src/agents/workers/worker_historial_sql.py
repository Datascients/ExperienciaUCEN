import asyncio
import time
from src.db import supabase_client as db

TIPOS_VALIDOS = {"completo", "ultimo_semestre", "materias_reprobadas", "lista_riesgo"}


async def worker_historial_sql(
    estudiante_id: str | None = None,
    tipo: str = "completo",
    carrera: str | None = None,
) -> dict:
    if tipo not in TIPOS_VALIDOS:
        return {"ok": False, "error": f"tipo '{tipo}' no válido"}

    inicio = time.monotonic()
    for intento in range(3):
        try:
            datos = await _ejecutar(estudiante_id, tipo, carrera)
            latencia = int((time.monotonic() - inicio) * 1000)
            await db.registrar_interaccion(
                {
                    "query": f"worker_historial_sql tipo={tipo} estudiante={estudiante_id}",
                    "response": {"datos": datos},
                    "latency_ms": latencia,
                }
            )
            return {"ok": True, "datos": datos, "latency_ms": latencia}
        except Exception as exc:
            if intento == 2:
                return {"ok": False, "error": str(exc), "datos": None}
            await asyncio.sleep(2 ** intento)
    return {"ok": False, "error": "reintentos agotados", "datos": None}


async def _ejecutar(estudiante_id: str | None, tipo: str, carrera: str | None) -> dict | list:
    if tipo == "lista_riesgo":
        return await db.listar_estudiantes_por_riesgo(nivel="alto", carrera=carrera)

    if not estudiante_id:
        return []

    estudiante = await db.obtener_estudiante(estudiante_id)
    if not estudiante:
        return {}

    score = await db.obtener_score_ml(estudiante_id)

    if tipo == "completo":
        return {"estudiante": estudiante, "score": score}

    if tipo == "ultimo_semestre":
        return {
            "estudiante_id": estudiante_id,
            "semestre": estudiante.get("semestre"),
            "promedio": estudiante.get("promedio"),
            "asistencia": estudiante.get("porcentaje_asistencia"),
        }

    if tipo == "materias_reprobadas":
        return {
            "estudiante_id": estudiante_id,
            "creditos_aprobados": estudiante.get("creditos_aprobados"),
            "promedio": estudiante.get("promedio"),
        }

    return {}
