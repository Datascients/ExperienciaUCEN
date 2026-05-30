import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from src.agents.principal import AgenteConsultorEstudiantilIA
from src.db import supabase_client as db

load_dotenv()

_agente: AgenteConsultorEstudiantilIA | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _agente
    _agente = AgenteConsultorEstudiantilIA()
    yield


app = FastAPI(
    title="ConsultorEstudiantilIA",
    description="Sistema RAG Multi-Agente para Prevención de Deserción Estudiantil",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modelos ───────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    estudiante_id: str | None = None
    rol_consultante: str = "estudiante"
    carrera: str | None = None
    features: dict | None = None


class ScoringRequest(BaseModel):
    estudiante_id: str
    features: dict


class IntervencionRequest(BaseModel):
    estudiante_id: str
    consejero_id: str
    tipo: str
    notas: str | None = None


class CitaRequest(BaseModel):
    estudiante_id: str
    consejero_id: str
    fecha_hora: str
    modalidad: str = "videollamada"
    link_sala: str | None = None


class FeedbackRequest(BaseModel):
    estudiante_id: str
    observacion: str
    consejero_id: str | None = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def health_check():
    return {"status": "ok", "servicio": "ConsultorEstudiantilIA", "version": "1.0.0"}


@app.post("/query")
async def query_agente(req: QueryRequest):
    inicio = time.monotonic()
    try:
        contexto = {
            "estudiante_id": req.estudiante_id,
            "carrera": req.carrera,
            "features": req.features or {},
        }
        resultado = await _agente.procesar(req.query, req.rol_consultante, contexto)
        latencia = int((time.monotonic() - inicio) * 1000)

        await db.registrar_interaccion(
            {
                "query": req.query,
                "response": resultado,
                "latency_ms": latencia,
                "score_riesgo": resultado.get("score_riesgo"),
                "nivel_riesgo": resultado.get("nivel_riesgo"),
                "workers_usados": resultado.get("workers_usados", []),
                "fiscalizador_ok": resultado.get("fiscalizador_ok", True),
                "fiscalizador_issues": resultado.get("fiscalizador_issues", []),
                "estudiante_id": req.estudiante_id,
            }
        )
        return {**resultado, "latency_ms": latencia}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/scoring")
async def scoring_estudiante(req: ScoringRequest):
    from src.agents.workers.worker_scoring import worker_scoring
    resultado = await worker_scoring(req.estudiante_id, req.features)
    if not resultado.get("ok"):
        raise HTTPException(status_code=500, detail=resultado.get("error", "Error en scoring"))
    return resultado


@app.get("/estudiantes")
async def listar_estudiantes(nivel_riesgo: str | None = None, carrera: str | None = None):
    estudiantes = await db.listar_estudiantes_por_riesgo(nivel=nivel_riesgo, carrera=carrera)
    return {"estudiantes": estudiantes, "total": len(estudiantes)}


@app.get("/estudiante/{estudiante_id}")
async def ficha_estudiante(estudiante_id: str):
    estudiante = await db.obtener_estudiante(estudiante_id)
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    score = await db.obtener_score_ml(estudiante_id)
    return {"estudiante": estudiante, "score_ml": score}


@app.get("/intervenciones")
async def listar_intervenciones(estudiante_id: str | None = None):
    intervenciones = await db.listar_intervenciones(estudiante_id=estudiante_id)
    return {"intervenciones": intervenciones, "total": len(intervenciones)}


@app.post("/intervencion")
async def crear_intervencion(req: IntervencionRequest):
    intervencion = await db.crear_intervencion(
        {
            "estudiante_id": req.estudiante_id,
            "consejero_id": req.consejero_id,
            "tipo": req.tipo,
            "notas": req.notas,
            "estado": "pendiente",
        }
    )
    return intervencion


@app.get("/citas")
async def listar_citas(consejero_id: str | None = None):
    citas = await db.listar_citas(consejero_id=consejero_id)
    return {"citas": citas}


@app.post("/cita")
async def agendar_cita(req: CitaRequest):
    cita = await db.crear_cita(
        {
            "estudiante_id": req.estudiante_id,
            "consejero_id": req.consejero_id,
            "fecha_hora": req.fecha_hora,
            "modalidad": req.modalidad,
            "link_sala": req.link_sala,
            "estado": "agendada",
        }
    )
    return cita


@app.get("/admin/reporteria")
async def reporteria():
    kpis = await db.kpis_institucionales()
    return kpis


@app.post("/admin/feedback")
async def feedback_estudiante(req: FeedbackRequest):
    await db.registrar_interaccion(
        {
            "query": f"[FEEDBACK] {req.observacion}",
            "response": {"tipo": "feedback", "observacion": req.observacion},
            "estudiante_id": req.estudiante_id,
            "usuario_id": req.consejero_id,
        }
    )
    return {"ok": True, "mensaje": "Observación registrada"}
