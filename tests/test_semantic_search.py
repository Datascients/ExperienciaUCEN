import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.retriever.semantic_search import SemanticSearchDesercion


@pytest.fixture
def searcher():
    return SemanticSearchDesercion(k=5)


def _mock_match(score: float, fuente: str, namespace: str) -> dict:
    return {
        "id": f"chunk-{fuente}-1",
        "score": score,
        "metadata": {
            "fuente": fuente,
            "seccion": "1.1",
            "namespace": namespace,
            "texto": f"Fragmento de {fuente}",
        },
    }


@pytest.mark.asyncio
async def test_search_retorna_resultados(searcher):
    matches = [
        _mock_match(0.92, "reglamento_academico.pdf", "reglamento-academico"),
        _mock_match(0.88, "reglamento_academico.pdf", "reglamento-academico"),
        _mock_match(0.85, "reglamento_academico.pdf", "reglamento-academico"),
        _mock_match(0.80, "reglamento_academico.pdf", "reglamento-academico"),
        _mock_match(0.76, "reglamento_academico.pdf", "reglamento-academico"),
    ]
    with (
        patch.object(searcher, "_embed", new=AsyncMock(return_value=[0.1] * 1536)),
        patch("src.retriever.semantic_search._get_index") as mock_idx,
    ):
        mock_idx.return_value.query.return_value = {"matches": matches}
        resultados = await searcher.search("¿Qué pasa si reprobo 3 materias?")

    assert len(resultados) == 5
    assert all("fuente" in r for r in resultados)


@pytest.mark.asyncio
async def test_hybrid_search_se_activa_con_precision_baja(searcher):
    matches_baja_precision = [
        _mock_match(0.50, "doc.pdf", "general"),
        _mock_match(0.45, "doc.pdf", "general"),
    ]
    with (
        patch.object(searcher, "_embed", new=AsyncMock(return_value=[0.1] * 1536)),
        patch("src.retriever.semantic_search._get_index") as mock_idx,
        patch.object(searcher, "_hybrid_search", new=AsyncMock(return_value=[])) as mock_hybrid,
    ):
        mock_idx.return_value.query.return_value = {"matches": matches_baja_precision}
        await searcher.search("consulta con precision baja")
        mock_hybrid.assert_called_once()


def test_precision_at_k_alta(searcher):
    matches = [{"score": 0.9}, {"score": 0.85}, {"score": 0.80}]
    assert searcher._precision_at_k(matches) == 1.0


def test_precision_at_k_baja(searcher):
    matches = [{"score": 0.5}, {"score": 0.4}]
    assert searcher._precision_at_k(matches) == 0.0


def test_precision_at_k_sin_matches(searcher):
    assert searcher._precision_at_k([]) == 0.0
