import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.agents.principal import AgenteConsultorEstudiantilIA


@pytest.fixture
def agente():
    with patch("src.agents.principal.AsyncOpenAI"), patch("src.agents.principal.OrquestadorDesercion"):
        return AgenteConsultorEstudiantilIA()


@pytest.mark.asyncio
async def test_consulta_simple_no_usa_orquestador(agente):
    agente._responder_directo = AsyncMock(return_value="¡Hola! Soy ConsultorEstudiantilIA.")
    agente._orquestador.orquestar = AsyncMock()

    resultado = await agente.procesar("hola", "estudiante", {})

    agente._responder_directo.assert_called_once()
    agente._orquestador.orquestar.assert_not_called()
    assert resultado["workers_usados"] == []


@pytest.mark.asyncio
async def test_consulta_compleja_usa_orquestador(agente):
    resultado_orq = {
        "respuesta": "Según el protocolo...",
        "fuentes": [{"documento": "protocolo.pdf", "seccion": "2.1", "fragmento": "..."}],
        "score_riesgo": 0.45,
        "nivel_riesgo": "medio",
        "acciones_sugeridas": [],
        "escalar_a_consejero": False,
        "workers_usados": ["worker_documentos"],
        "rol_consultante": "consejero",
    }
    agente._orquestador.orquestar = AsyncMock(return_value=resultado_orq)

    resultado = await agente.procesar(
        "¿Qué protocolo aplica cuando un alumno falta más del 50%?",
        "consejero",
        {"estudiante_id": "uuid-001"},
    )

    agente._orquestador.orquestar.assert_called_once()
    assert resultado["fiscalizador_ok"] is True
    assert "respuesta" in resultado


@pytest.mark.asyncio
async def test_fiscalizador_corrige_respuesta_sin_fuentes(agente):
    resultado_orq = {
        "respuesta": "Algo de información...",
        "fuentes": [],
        "score_riesgo": 0.2,
        "nivel_riesgo": "bajo",
        "acciones_sugeridas": [],
        "escalar_a_consejero": False,
        "workers_usados": ["worker_documentos"],
        "rol_consultante": "estudiante",
    }
    agente._orquestador.orquestar = AsyncMock(return_value=resultado_orq)

    resultado = await agente.procesar(
        "cuéntame sobre las becas disponibles para estudiantes", "estudiante", {}
    )

    assert resultado["fiscalizador_ok"] is False
    assert "sin_fuentes" in resultado["fiscalizador_issues"]
    assert len(resultado["fuentes"]) > 0
