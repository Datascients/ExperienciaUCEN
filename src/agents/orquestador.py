import asyncio
from openai import AsyncOpenAI
import os
from dotenv import load_dotenv

from src.agents.workers.worker_documentos import worker_documentos
from src.agents.workers.worker_historial_sql import worker_historial_sql
from src.agents.workers.worker_scoring import worker_scoring

load_dotenv()

CRITERIOS_DELEGACION = {
    "pregunta_normativa":        ["worker_documentos"],
    "pregunta_beneficios":       ["worker_documentos"],
    "perfil_estudiante":         ["worker_historial_sql", "worker_scoring", "worker_documentos"],
    "crear_intervencion":        ["worker_historial_sql", "worker_documentos"],
    "reporteria_institucional":  ["worker_documentos", "worker_historial_sql"],
    "consulta_multidimensional": ["worker_documentos", "worker_historial_sql", "worker_scoring"],
}


class OrquestadorDesercion:

    def __init__(self):
        self._openai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    async def orquestar(self, query: str, contexto: dict) -> dict:
        tipo = await self._clasificar(query, contexto)
        workers_a_usar = CRITERIOS_DELEGACION.get(tipo, ["worker_documentos"])

        tareas = []
        for w in workers_a_usar:
            tareas.append(self._ejecutar_worker(w, query, contexto))

        resultados = await asyncio.gather(*tareas)
        resultado_combinado = self._combinar(resultados, workers_a_usar)

        respuesta = await self._sintetizar(query, resultado_combinado, contexto)

        return {
            "respuesta": respuesta,
            "fuentes": resultado_combinado.get("fuentes", []),
            "score_riesgo": resultado_combinado.get("score_riesgo", 0.0),
            "nivel_riesgo": resultado_combinado.get("nivel_riesgo", "bajo"),
            "acciones_sugeridas": resultado_combinado.get("acciones_sugeridas", []),
            "escalar_a_consejero": resultado_combinado.get("escalar_a_consejero", False),
            "workers_usados": workers_a_usar,
            "rol_consultante": contexto.get("rol", "estudiante"),
        }

    async def _clasificar(self, query: str, contexto: dict) -> str:
        rol = contexto.get("rol", "estudiante")
        estudiante_id = contexto.get("estudiante_id")

        prompt = f"""Clasifica la siguiente consulta en UNA de estas categorías:
- pregunta_normativa: preguntas sobre reglamento académico, créditos, eliminación
- pregunta_beneficios: becas, créditos financieros, apoyos, psicología
- perfil_estudiante: score de riesgo, historial académico, diagnóstico individual
- crear_intervencion: crear o revisar planes de intervención para un estudiante
- reporteria_institucional: KPIs, listas de riesgo, estadísticas por carrera
- consulta_multidimensional: combina historial + normativa + score

Consulta: "{query}"
Rol del consultante: {rol}
Tiene estudiante_id: {"sí" if estudiante_id else "no"}

Responde SOLO con el nombre de la categoría."""

        response = await self._openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=30,
        )
        categoria = response.choices[0].message.content.strip().lower()
        return categoria if categoria in CRITERIOS_DELEGACION else "consulta_multidimensional"

    async def _ejecutar_worker(self, nombre: str, query: str, contexto: dict) -> dict:
        estudiante_id = contexto.get("estudiante_id")
        if nombre == "worker_documentos":
            return await worker_documentos(query)
        if nombre == "worker_historial_sql":
            return await worker_historial_sql(
                estudiante_id=estudiante_id,
                tipo="completo" if estudiante_id else "lista_riesgo",
                carrera=contexto.get("carrera"),
            )
        if nombre == "worker_scoring":
            if not estudiante_id:
                return {"ok": False, "score": 0.0, "nivel": "bajo", "factores_criticos": []}
            features = contexto.get("features", {})
            datos_sql = await worker_historial_sql(estudiante_id=estudiante_id, tipo="completo")
            if datos_sql.get("ok") and datos_sql.get("datos"):
                est = datos_sql["datos"].get("estudiante", {})
                features = {
                    "promedio": est.get("promedio", 5.0),
                    "porcentaje_asistencia": est.get("porcentaje_asistencia", 1.0),
                    "semestre": est.get("semestre", 1),
                    **features,
                }
            return await worker_scoring(estudiante_id=estudiante_id, features=features)
        return {}

    def _combinar(self, resultados: list, workers: list) -> dict:
        fuentes = []
        score_riesgo = 0.0
        nivel_riesgo = "bajo"
        acciones = []
        escalar = False

        for resultado, worker in zip(resultados, workers):
            if not resultado.get("ok"):
                continue
            if worker == "worker_documentos":
                fuentes.extend(resultado.get("fuentes", []))
            if worker == "worker_scoring":
                score_riesgo = resultado.get("score", 0.0)
                nivel_riesgo = resultado.get("nivel", "bajo")
                if nivel_riesgo == "alto":
                    escalar = True
                    acciones.append("Derivar a consejero con urgencia")
                    for factor in resultado.get("factores_criticos", []):
                        acciones.append(f"Atender factor: {factor}")

        return {
            "fuentes": fuentes[:5],
            "score_riesgo": score_riesgo,
            "nivel_riesgo": nivel_riesgo,
            "acciones_sugeridas": acciones,
            "escalar_a_consejero": escalar,
            "datos_brutos": resultados,
        }

    async def _sintetizar(self, query: str, combinado: dict, contexto: dict) -> str:
        rol = contexto.get("rol", "estudiante")
        fuentes_texto = "\n".join(
            f"- {f['documento']} ({f['seccion']}): {f['fragmento'][:200]}"
            for f in combinado.get("fuentes", [])
        )
        score_info = (
            f"Score de riesgo: {combinado['score_riesgo']:.2f} ({combinado['nivel_riesgo']})"
            if combinado.get("score_riesgo")
            else ""
        )

        prompt = f"""Eres ConsultorEstudiantilIA. Responde en español, adaptando el tono al rol: {rol}.

Consulta: {query}
{score_info}

Fuentes disponibles:
{fuentes_texto or "Sin fuentes documentales directas."}

Genera una respuesta útil, concisa y basada en las fuentes disponibles.
Cita siempre qué documento respalda tu respuesta."""

        response = await self._openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=600,
        )
        return response.choices[0].message.content.strip()
