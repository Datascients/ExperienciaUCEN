import os
from openai import AsyncOpenAI
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

_openai: AsyncOpenAI | None = None
_pinecone_index = None
EMBEDDING_DIMENSIONS = 1024

# Todos los namespaces donde se indexaron documentos
ALL_NAMESPACES = [
    "reglamento-academico",
    "protocolo-intervencion",
    "estadisticas",
    "beneficios",
    "factores-riesgo",
]


def _get_openai() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        _openai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _openai


def _get_index():
    global _pinecone_index
    if _pinecone_index is None:
        pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        _pinecone_index = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "satisfaccion-ucen"))
    return _pinecone_index


class SemanticSearchDesercion:

    def __init__(self, k: int = 5):
        self.k = k

    async def _embed(self, text: str) -> list[float]:
        client = _get_openai()
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
            dimensions=EMBEDDING_DIMENSIONS,
        )
        return response.data[0].embedding

    async def search(
        self,
        query: str,
        namespace: str | None = None,
        filtros: dict | None = None,
    ) -> list[dict]:
        vector = await self._embed(query)
        index = _get_index()

        if namespace:
            # Búsqueda en namespace específico
            matches = self._query_namespace(index, vector, namespace, filtros, top_k=self.k * 2)
        else:
            # Sin namespace: consulta todos los namespaces y combina resultados
            all_matches: list = []
            for ns in ALL_NAMESPACES:
                ns_matches = self._query_namespace(index, vector, ns, filtros, top_k=self.k)
                all_matches.extend(ns_matches)
            all_matches.sort(key=lambda m: m["score"], reverse=True)
            matches = all_matches[:self.k * 2]

        precision = self._precision_at_k(matches[:self.k])
        if precision < 0.7:
            matches = await self._hybrid_search(query, vector, matches)

        top = matches[:self.k]
        return [
            {
                "id": m["id"],
                "score": m["score"],
                "fuente": m["metadata"].get("fuente", ""),
                "seccion": m["metadata"].get("seccion", ""),
                "namespace": m["metadata"].get("namespace", namespace or "general"),
                "fragmento": m["metadata"].get("texto", ""),
            }
            for m in top
        ]

    def _query_namespace(
        self,
        index,
        vector: list[float],
        namespace: str,
        filtros: dict | None,
        top_k: int,
    ) -> list:
        kwargs: dict = {
            "vector": vector,
            "top_k": top_k,
            "include_metadata": True,
            "namespace": namespace,
        }
        if filtros:
            kwargs["filter"] = filtros
        try:
            results = index.query(**kwargs)
            return results.get("matches", [])
        except Exception:
            return []

    def _precision_at_k(self, matches: list) -> float:
        if not matches:
            return 0.0
        relevantes = sum(1 for m in matches if m.get("score", 0) >= 0.75)
        return relevantes / len(matches)

    async def _hybrid_search(
        self,
        query: str,
        vector: list[float],
        candidates: list,
    ) -> list:
        query_terms = set(query.lower().split())
        for m in candidates:
            texto = m["metadata"].get("texto", "").lower()
            keyword_score = sum(1 for t in query_terms if t in texto) / max(len(query_terms), 1)
            m["score"] = 0.7 * m["score"] + 0.3 * keyword_score
        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates
