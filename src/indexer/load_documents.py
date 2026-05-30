import os
import asyncio
from pathlib import Path
from datetime import datetime

from openai import AsyncOpenAI
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

load_dotenv()

PINECONE_INDEX = os.environ.get("PINECONE_INDEX_NAME", "desercion-docs")
DOCS_FOLDER = "docs/"
CHUNK_SIZE = 800
OVERLAP = 100
EMBEDDING_MODEL = "text-embedding-3-small"

NAMESPACE_MAP = {
    "protocolo_intervencion_desercion": "protocolo-intervencion",
    "reglamento_academico": "reglamento-academico",
    "guia_beneficios_estudiantiles": "beneficios",
    "perfil_riesgo_factores": "factores-riesgo",
    "estadisticas_desercion_historica": "estadisticas",
}


def _detect_namespace(filename: str) -> str:
    stem = Path(filename).stem.lower()
    for key, ns in NAMESPACE_MAP.items():
        if key in stem:
            return ns
    return "general"


def _read_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    if suffix == ".docx":
        from docx import Document
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs)
    return ""


def _chunk_text(text: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        start += CHUNK_SIZE - OVERLAP
    return [c.strip() for c in chunks if c.strip()]


async def _embed_batch(client: AsyncOpenAI, texts: list[str]) -> list[list[float]]:
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


async def index_documents():
    openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

    existing = [idx.name for idx in pc.list_indexes()]
    if PINECONE_INDEX not in existing:
        pc.create_index(
            name=PINECONE_INDEX,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
    index = pc.Index(PINECONE_INDEX)

    docs_path = Path(DOCS_FOLDER)
    files = [f for f in docs_path.iterdir() if f.suffix.lower() in {".pdf", ".docx", ".txt"}]
    if not files:
        print("No hay documentos en /docs/. Agrega archivos antes de indexar.")
        return

    totals: dict[str, int] = {}
    fecha = datetime.utcnow().isoformat()

    for file in files:
        print(f"Procesando: {file.name}")
        namespace = _detect_namespace(file.name)
        text = _read_file(file)
        if not text:
            print(f"  → Vacío o no se pudo leer.")
            continue

        chunks = _chunk_text(text)
        print(f"  → {len(chunks)} chunks en namespace '{namespace}'")

        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            embeddings = await _embed_batch(openai_client, batch)
            vectors = [
                {
                    "id": f"{file.stem}-{i + j}",
                    "values": embeddings[j],
                    "metadata": {
                        "fuente": file.name,
                        "seccion": f"chunk-{i + j}",
                        "namespace": namespace,
                        "fecha_indexacion": fecha,
                        "texto": batch[j][:500],
                    },
                }
                for j, _ in enumerate(batch)
            ]
            index.upsert(vectors=vectors, namespace=namespace)

        totals[namespace] = totals.get(namespace, 0) + len(chunks)

    print("\n=== Indexación completada ===")
    for ns, count in totals.items():
        print(f"  {ns}: {count} chunks")
    print(f"  Total: {sum(totals.values())} chunks")


if __name__ == "__main__":
    asyncio.run(index_documents())
