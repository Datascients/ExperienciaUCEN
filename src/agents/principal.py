import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

from src.agents.orquestador import OrquestadorDesercion
from src.agents.fiscalizador import FiscalizadorEstudiantil

load_dotenv()

SYSTEM_PROMPT = """Eres ConsultorEstudiantilIA, asistente especializado en orientación académica
y prevención de deserción estudiantil en educación superior.

Tu tono varía según quien te consulta:
- ESTUDIANTE: empático y motivador, nunca alarmante. Enfócate en opciones y apoyos disponibles.
- CONSEJERO: técnico y directo. Datos, score de riesgo y acciones concretas.
- ADMIN: institucional. KPIs, listas priorizadas y reportería.

REGLAS INAMOVIBLES:
1. Nunca revelar datos personales de un estudiante a otro estudiante
2. Siempre citar la fuente (documento + sección) que respalda tu recomendación
3. Si detectas señales de crisis emocional → escalar SIEMPRE a consejero humano
4. Si no tienes información suficiente → dilo explícitamente, no inventes datos
5. Responde en español"""

CONSULTAS_SIMPLES = {
    "saludo", "hola", "gracias", "bye", "adiós", "cómo estás",
    "qué eres", "quién eres", "para qué sirves",
}


class AgenteConsultorEstudiantilIA:
    nombre = "ConsultorEstudiantilIA"
    modelo = "gpt-4o"

    def __init__(self):
        self._openai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self._orquestador = OrquestadorDesercion()
        self._fiscalizador = FiscalizadorEstudiantil()

    async def procesar(self, query: str, rol: str, contexto: dict) -> dict:
        rol = rol.lower() if rol else "estudiante"
        contexto["rol"] = rol

        if self._es_simple(query):
            respuesta = await self._responder_directo(query, rol)
            return {
                "respuesta": respuesta,
                "fuentes": [],
                "score_riesgo": 0.0,
                "nivel_riesgo": "bajo",
                "acciones_sugeridas": [],
                "escalar_a_consejero": False,
                "workers_usados": [],
                "fiscalizador_ok": True,
                "fiscalizador_issues": [],
            }

        resultado = await self._orquestador.orquestar(query, contexto)
        validacion = self._fiscalizador.validar(resultado, query)

        respuesta_final = validacion["corrected"] if not validacion["ok"] else resultado
        respuesta_final["fiscalizador_ok"] = validacion["ok"]
        respuesta_final["fiscalizador_issues"] = validacion["issues"]

        return respuesta_final

    def _es_simple(self, query: str) -> bool:
        query_lower = query.lower().strip()
        return any(kw in query_lower for kw in CONSULTAS_SIMPLES) and len(query_lower.split()) <= 6

    async def _responder_directo(self, query: str, rol: str) -> str:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"[ROL: {rol.upper()}] {query}"},
        ]
        response = await self._openai.chat.completions.create(
            model=self.modelo,
            messages=messages,
            temperature=0.5,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()
