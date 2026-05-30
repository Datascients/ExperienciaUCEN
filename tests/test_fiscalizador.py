import pytest
from src.agents.fiscalizador import FiscalizadorEstudiantil


@pytest.fixture
def fiscalizador():
    return FiscalizadorEstudiantil()


def _respuesta_base():
    return {
        "respuesta": "Puedes postular a la beca de mantención según el reglamento.",
        "fuentes": [{"documento": "guia_beneficios.pdf", "seccion": "1.2", "fragmento": "..."}],
        "score_riesgo": 0.3,
        "nivel_riesgo": "bajo",
        "escalar_a_consejero": False,
        "rol_consultante": "estudiante",
    }


def test_respuesta_valida(fiscalizador):
    result = fiscalizador.validar(_respuesta_base(), "¿Qué becas puedo pedir?")
    assert result["ok"] is True
    assert result["issues"] == []


def test_detecta_sin_fuentes(fiscalizador):
    resp = _respuesta_base()
    resp["fuentes"] = []
    result = fiscalizador.validar(resp, "¿Qué becas puedo pedir?")
    assert "sin_fuentes" in result["issues"]
    assert result["ok"] is False


def test_detecta_riesgo_alto_sin_escalar(fiscalizador):
    resp = _respuesta_base()
    resp["nivel_riesgo"] = "alto"
    resp["escalar_a_consejero"] = False
    result = fiscalizador.validar(resp, "dame el perfil del estudiante")
    assert "falta_escalamiento_critico" in result["issues"]


def test_detecta_crisis(fiscalizador):
    resp = _respuesta_base()
    result = fiscalizador.validar(resp, "estoy muy agobiado y no puedo más")
    assert "crisis_no_escalada" in result["issues"]
    assert result["corrected"]["escalar_a_consejero"] is True


def test_corrige_sin_fuentes(fiscalizador):
    resp = _respuesta_base()
    resp["fuentes"] = []
    result = fiscalizador.validar(resp, "dime algo")
    assert len(result["corrected"]["fuentes"]) > 0


def test_pii_no_autorizado_oculta_rut(fiscalizador):
    resp = _respuesta_base()
    resp["respuesta"] = "El RUT del estudiante es 12345678-9."
    result = fiscalizador.validar(resp, "dame info")
    assert "12345678-9" not in result["corrected"]["respuesta"]
