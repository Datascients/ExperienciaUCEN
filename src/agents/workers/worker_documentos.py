from src.retriever.semantic_search import SemanticSearchDesercion

_searcher = SemanticSearchDesercion(k=5)


async def worker_documentos(query: str, namespace: str | None = None) -> dict:
    try:
        resultados = await _searcher.search(query, namespace=namespace)
        return {
            "ok": True,
            "resultados": resultados,
            "fuentes": [
                {
                    "documento": r["fuente"],
                    "seccion": r["seccion"],
                    "fragmento": r["fragmento"],
                    "score": r["score"],
                }
                for r in resultados
            ],
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "fallback": True, "resultados": [], "fuentes": []}
