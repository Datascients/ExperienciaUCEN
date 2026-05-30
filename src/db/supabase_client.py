import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


async def registrar_interaccion(data: dict) -> None:
    client = get_client()
    client.table("desercion_interactions").insert(data).execute()


async def obtener_estudiante(estudiante_id: str) -> dict | None:
    client = get_client()
    result = (
        client.table("desercion_estudiantes")
        .select("*")
        .eq("id", estudiante_id)
        .single()
        .execute()
    )
    return result.data


async def obtener_score_ml(estudiante_id: str) -> dict | None:
    client = get_client()
    result = (
        client.table("desercion_scores_ml")
        .select("*")
        .eq("estudiante_id", estudiante_id)
        .order("calculado_en", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


async def guardar_score_ml(data: dict) -> None:
    client = get_client()
    client.table("desercion_scores_ml").insert(data).execute()


async def listar_estudiantes_por_riesgo(nivel: str | None = None, carrera: str | None = None) -> list:
    client = get_client()
    query = (
        client.table("desercion_estudiantes")
        .select("*, desercion_scores_ml(score, nivel, calculado_en)")
        .order("created_at", desc=True)
    )
    if carrera:
        query = query.eq("carrera", carrera)
    result = query.execute()
    estudiantes = result.data or []
    if nivel:
        estudiantes = [
            e for e in estudiantes
            if e.get("desercion_scores_ml") and
            any(s["nivel"] == nivel for s in e["desercion_scores_ml"])
        ]
    return estudiantes


async def crear_intervencion(data: dict) -> dict:
    client = get_client()
    result = client.table("desercion_intervenciones").insert(data).execute()
    return result.data[0]


async def listar_intervenciones(estudiante_id: str | None = None) -> list:
    client = get_client()
    query = client.table("desercion_intervenciones").select("*").order("created_at", desc=True)
    if estudiante_id:
        query = query.eq("estudiante_id", estudiante_id)
    return query.execute().data or []


async def listar_citas(consejero_id: str | None = None) -> list:
    client = get_client()
    query = client.table("desercion_citas").select("*").order("fecha_hora")
    if consejero_id:
        query = query.eq("consejero_id", consejero_id)
    return query.execute().data or []


async def crear_cita(data: dict) -> dict:
    client = get_client()
    result = client.table("desercion_citas").insert(data).execute()
    return result.data[0]


async def kpis_institucionales() -> dict:
    client = get_client()
    total = client.table("desercion_estudiantes").select("id", count="exact").execute()
    r_alto = (
        client.table("desercion_scores_ml").select("id", count="exact").eq("nivel", "alto").execute()
    )
    r_medio = (
        client.table("desercion_scores_ml").select("id", count="exact").eq("nivel", "medio").execute()
    )
    r_bajo = (
        client.table("desercion_scores_ml").select("id", count="exact").eq("nivel", "bajo").execute()
    )
    int_pendientes = (
        client.table("desercion_intervenciones").select("id", count="exact").eq("estado", "pendiente").execute()
    )
    int_exitosas = (
        client.table("desercion_intervenciones").select("id", count="exact").eq("estado", "exitosa").execute()
    )
    total_int = client.table("desercion_intervenciones").select("id", count="exact").execute()
    tasa = (
        (int_exitosas.count / total_int.count)
        if total_int.count and total_int.count > 0
        else None
    )
    carreras_raw = (
        client.table("desercion_estudiantes")
        .select("carrera, desercion_scores_ml(nivel)")
        .execute()
    ).data or []
    por_carrera: dict = {}
    for est in carreras_raw:
        c = est.get("carrera", "Sin carrera")
        if c not in por_carrera:
            por_carrera[c] = {"total": 0, "alto": 0}
        por_carrera[c]["total"] += 1
        scores = est.get("desercion_scores_ml") or []
        if scores and scores[0].get("nivel") == "alto":
            por_carrera[c]["alto"] += 1
    return {
        "total_estudiantes": total.count,
        "riesgo_alto": r_alto.count,
        "riesgo_medio": r_medio.count,
        "riesgo_bajo": r_bajo.count,
        "intervenciones_pendientes": int_pendientes.count,
        "intervenciones_exitosas": int_exitosas.count,
        "tasa_retencion": tasa,
        "por_carrera": por_carrera,
    }
