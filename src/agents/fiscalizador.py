import re

CRISIS_KEYWORDS = {
    "agobiado", "agobiada", "deprimido", "deprimida", "no puedo más",
    "pienso en dejarlo", "pienso en dejar", "no tiene sentido", "rendirme",
    "abandonar todo", "muy mal", "angustia", "desesperado", "desesperada",
    "suicidio", "hacerme daño", "hacerme algo",
}

PII_PATTERNS = [
    re.compile(r"\b\d{7,8}-[\dkK]\b"),
    re.compile(r"\b[0-9]{16}\b"),
]


class FiscalizadorEstudiantil:

    def validar(self, respuesta: dict, query_original: str) -> dict:
        issues = []

        if not respuesta.get("fuentes"):
            issues.append("sin_fuentes")

        if self._contiene_pii_no_autorizado(
            respuesta.get("respuesta", ""),
            respuesta.get("rol_consultante"),
        ):
            issues.append("pii_no_autorizado")

        if self._score_coherencia(query_original, respuesta.get("respuesta", "")) < 0.7:
            issues.append("incoherente")

        if respuesta.get("nivel_riesgo") == "alto" and not respuesta.get("escalar_a_consejero"):
            issues.append("falta_escalamiento_critico")

        if self._detecta_crisis(query_original) and not respuesta.get("escalar_a_consejero"):
            issues.append("crisis_no_escalada")

        corrected = self._corregir(respuesta, issues) if issues else respuesta

        return {
            "ok": len(issues) == 0,
            "issues": issues,
            "corrected": corrected,
        }

    def _contiene_pii_no_autorizado(self, texto: str, rol: str | None) -> bool:
        if rol in {"consejero", "admin"}:
            return False
        return any(p.search(texto) for p in PII_PATTERNS)

    def _score_coherencia(self, query: str, respuesta: str) -> float:
        if not query or not respuesta:
            return 0.0
        query_terms = set(query.lower().split())
        respuesta_terms = set(respuesta.lower().split())
        if not query_terms:
            return 1.0
        coincidencias = query_terms & respuesta_terms
        return len(coincidencias) / len(query_terms)

    def _detecta_crisis(self, texto: str) -> bool:
        texto_lower = texto.lower()
        return any(kw in texto_lower for kw in CRISIS_KEYWORDS)

    def _corregir(self, respuesta: dict, issues: list) -> dict:
        corrected = dict(respuesta)

        if "sin_fuentes" in issues:
            corrected["fuentes"] = [
                {
                    "documento": "información institucional general",
                    "seccion": "general",
                    "fragmento": "Consulta al área de orientación estudiantil para más detalles.",
                }
            ]
            corrected["respuesta"] = (
                corrected.get("respuesta", "")
                + "\n\n_Nota: Para información más precisa, consulta directamente con tu consejero._"
            )

        if "pii_no_autorizado" in issues:
            for pattern in PII_PATTERNS:
                corrected["respuesta"] = pattern.sub("[DATO PROTEGIDO]", corrected.get("respuesta", ""))

        if "falta_escalamiento_critico" in issues or "crisis_no_escalada" in issues:
            corrected["escalar_a_consejero"] = True
            corrected["respuesta"] = (
                "Te escucho y quiero ayudarte. "
                "Es importante que hables con un consejero lo antes posible. "
                "Puedes contactar a orientación estudiantil directamente.\n\n"
                + corrected.get("respuesta", "")
            )

        if "incoherente" in issues:
            corrected["respuesta"] = (
                corrected.get("respuesta", "")
                + "\n\n_Si esta respuesta no es lo que buscabas, reformula tu consulta con más detalle._"
            )

        return corrected
