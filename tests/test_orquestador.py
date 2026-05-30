import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.agents.orquestador import OrquestadorDesercion


@pytest.fixture
def orquestador():
    with patch("src.agents.orquestador.AsyncOpenAI"):
        return OrquestadorDesercion()


@pytest.mark.asyncio
async def test_orquestar_respuesta_estructurada(orquestador):
    orquestador._clasificar = AsyncMock(return_value="pregunta_normativa")
    orquestador._sintetizar = AsyncMock(return_value="Según el reglamento, debes...")

    mock_doc = {
        "ok": True,
        "fuentes": [{"documento": "reglamento.pdf", "seccion": "3.1", "fragmento": "..."}],
    }
    with patch("src.agents.orquestador.worker_documentos", new=AsyncMock(return_value=mock_doc)):
        resultado = await orquestador.orquestar(
            "¿Cuántos créditos necesito?", {"rol": "estudiante"}
        )

    assert "respuesta" in resultado
    assert "fuentes" in resultado
    assert "workers_usados" in resultado
    assert resultado["workers_usados"] == ["worker_documentos"]


@pytest.mark.asyncio
async def test_orquestar_escala_con_riesgo_alto(orquestador):
    orquestador._clasificar = AsyncMock(return_value="perfil_estudiante")
    orquestador._sintetizar = AsyncMock(return_value="Riesgo alto detectado.")

    mock_sql = {"ok": True, "datos": {"estudiante": {"promedio": 3.5, "porcentaje_asistencia": 0.5, "semestre": 4}}}
    mock_scoring = {"ok": True, "score": 0.85, "nivel": "alto", "factores_criticos": ["promedio_bajo"]}

    with (
        patch("src.agents.orquestador.worker_historial_sql", new=AsyncMock(return_value=mock_sql)),
        patch("src.agents.orquestador.worker_scoring", new=AsyncMock(return_value=mock_scoring)),
    ):
        resultado = await orquestador.orquestar(
            "dame el perfil del estudiante", {"rol": "consejero", "estudiante_id": "uuid-123"}
        )

    assert resultado["escalar_a_consejero"] is True
    assert resultado["nivel_riesgo"] == "alto"
