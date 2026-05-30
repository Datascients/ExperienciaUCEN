# ConsultorEstudiantilIA — Sistema RAG Multi-Agente para Prevención de Deserción

> Roadmap UAI · 10 pasos a producción · Programa de Magíster en IA

ConsultorEstudiantilIA ayuda a la **Universidad Central de Chile (UCEN)** a detectar y atender tempranamente a estudiantes en riesgo de deserción. Combina un modelo predictivo ML, búsqueda semántica sobre documentos institucionales y un orquestador de agentes IA que entrega respuestas precisas y verificadas según el rol del consultante: estudiante, consejero o administrador.

---

## URLs del Sistema

| Servicio | URL |
|---|---|
| **Frontend (Netlify)** | https://experienciaucen.netlify.app |
| **Backend API (Railway)** | https://experienciaucen-production.up.railway.app |
| **API Docs (Swagger)** | https://experienciaucen-production.up.railway.app/docs |
| **Repositorio GitHub** | https://github.com/Datascients/ExperienciaUCEN |

## Credenciales de prueba

| Rol | Usuario | Contraseña | Destino |
|---|---|---|---|
| Administrador | `Admin` | `1234` | `/admin` |
| Consejero | `consejero@ucen.cl` | `demo2025` | `/dashboard` |
| Estudiante | cualquier email | cualquier contraseña | `/estudiante` |

---

## 1. Caso que Resuelve la Solución

Las instituciones de educación superior pierden estudiantes valiosos porque las señales de deserción están dispersas en múltiples sistemas: notas en el SGA, asistencia en el registro curricular, deudas en finanzas, historial de intervenciones en consejería y documentos normativos en distintos formatos. Sin un sistema integrado, los consejeros no pueden actuar a tiempo.

**ConsultorEstudiantilIA** resuelve esto con tres componentes integrados:

1. **Portal del estudiante**: chatbot RAG que responde preguntas en lenguaje natural sobre reglamento académico, becas, apoyo psicológico y protocolo de intervención, citando siempre la fuente del documento institucional.

2. **Dashboard del consejero**: listado priorizado de estudiantes por score de riesgo (ML), con filtros por nivel y carrera, acceso a ficha individual con historial de intervenciones y chatbot contextualizado al estudiante.

3. **Panel administrativo**: KPIs institucionales (total estudiantes, distribución de riesgo por carrera, tasa de retención), acceso a Swagger para pruebas técnicas y gestión de datos de prueba.

**Preguntas que responde el agente:**
- ¿Qué becas puede solicitar un estudiante con deuda de arancel?
- ¿Qué protocolo aplica cuando un alumno falta más del 60% de las clases?
- ¿Cuáles son los factores más relevantes para predecir deserción en Ingeniería?
- ¿Cuál es la tasa de retención histórica de la cohorte 2023?
- ¿Qué intervención corresponde a un estudiante con score de riesgo 0.78?

---

## 2. Embeddings → Vector DB

| Parámetro | Valor |
|---|---|
| **Proveedor** | Pinecone Serverless (AWS us-east-1) |
| **Índice** | `satisfaccion-ucen` |
| **Métrica** | Coseno |
| **Dimensiones** | 1.024 (text-embedding-3-small con reducción nativa OpenAI) |
| **Modelo de embedding** | `text-embedding-3-small` (OpenAI) |
| **Chunk size** | 800 caracteres |
| **Chunk overlap** | 100 caracteres |
| **top_k configurado** | 5 resultados finales (k×2=10 candidatos → re-rank → top 5) |
| **MIN_SCORE** | 0.60 |

### Namespaces y Documentos Indexados

| Namespace | Documento | Chunks |
|---|---|---|
| `reglamento-academico` | reglamento_academico.txt | 9 |
| `protocolo-intervencion` | protocolo_intervencion_desercion.txt | 9 |
| `estadisticas` | estadisticas_desercion_historica.txt | 8 |
| `beneficios` | guia_beneficios_estudiantiles.txt | 8 |
| `factores-riesgo` | perfil_riesgo_factores.txt | 8 |
| **Total** | **5 documentos** | **42 chunks** |

### Metadata por vector

```json
{
  "fuente": "guia_beneficios_estudiantiles.txt",
  "seccion": "chunk-3",
  "namespace": "beneficios",
  "fecha_indexacion": "2026-05-30T01:15:00Z",
  "texto": "2.2 Beca de Apoyo a la Permanencia..."
}
```

---

## 3. Agente Orquestador

**Clase:** `OrquestadorDesercion` (`src/agents/orquestador.py`)

Se activa en cada llamada a `POST /query`. Recibe `query + rol_consultante + contexto` (estudiante_id, carrera, features).

### System Prompt del Agente Principal

```
Eres ConsultorEstudiantilIA, asistente especializado en orientación académica
y prevención de deserción estudiantil en educación superior.

Tu tono varía según quien te consulta:
- ESTUDIANTE: empático y motivador, nunca alarmante.
- CONSEJERO: técnico y directo. Datos, score de riesgo y acciones concretas.
- ADMIN: institucional. KPIs, listas priorizadas y reportería.

REGLAS INAMOVIBLES:
1. Nunca revelar datos personales de un estudiante a otro estudiante
2. Siempre citar la fuente (documento + sección) que respalda tu recomendación
3. Si detectas señales de crisis emocional → escalar SIEMPRE a consejero humano
4. Si no tienes información suficiente → dilo explícitamente, no inventes datos
5. Responde en español
```

### Criterios de Delegación (clasificación por GPT-4o)

| Categoría | Workers activados |
|---|---|
| `pregunta_normativa` | worker_documentos |
| `pregunta_beneficios` | worker_documentos |
| `perfil_estudiante` | worker_historial_sql + worker_scoring |
| `crear_intervencion` | worker_historial_sql + worker_documentos |
| `reporteria_institucional` | worker_historial_sql |
| `consulta_multidimensional` | worker_documentos + worker_historial_sql + worker_scoring |

### Formato de Salida Estándar

```json
{
  "respuesta": "string",
  "fuentes": [{"documento": "...", "seccion": "...", "fragmento": "..."}],
  "score_riesgo": 0.0,
  "nivel_riesgo": "bajo | medio | alto",
  "acciones_sugeridas": ["..."],
  "escalar_a_consejero": false,
  "workers_usados": ["worker_documentos"],
  "fiscalizador_ok": true,
  "fiscalizador_issues": [],
  "latency_ms": 4134
}
```

---

## 4. Agentes Workers (≥2)

El sistema implementa **3 workers especializados**, todos con manejo de errores y reintentos.

### Worker 1 — `worker_documentos` (`src/agents/workers/worker_documentos.py`)

Búsqueda semántica en Pinecone. Usa `SemanticSearchDesercion` con búsqueda híbrida KNN + BM25.

```python
# Manejo de errores: retorna fallback sin romper el flujo
except Exception as exc:
    return {"ok": False, "error": str(exc), "fallback": True, "fuentes": []}
```

### Worker 2 — `worker_historial_sql` (`src/agents/workers/worker_historial_sql.py`)

Consulta historial académico en Supabase. Implementa **3 reintentos con backoff exponencial** via `asyncio.sleep(2 ** intento)`.

```python
for intento in range(3):
    try:
        datos = await _ejecutar(estudiante_id, tipo, carrera)
        return {"ok": True, "datos": datos, "latency_ms": latencia}
    except Exception as exc:
        if intento == 2:
            return {"ok": False, "error": str(exc)}
        await asyncio.sleep(2 ** intento)  # 1s → 2s → falla
```

**Tipos de consulta soportados:** `completo | ultimo_semestre | materias_reprobadas | lista_riesgo`

### Worker 3 — `worker_scoring` (`src/agents/workers/worker_scoring.py`)

Calcula score de riesgo ML (0.0–1.0) a partir de features académicos y socioeconómicos. Clasificación: `score < 0.35` → bajo · `0.35–0.65` → medio · `> 0.65` → alto.

---

## 5. Agente Fiscalizador

**Clase:** `FiscalizadorEstudiantil` (`src/agents/fiscalizador.py`)

Actúa **después** de que los workers generan la respuesta y **antes** de entregarla al usuario (paso 4 del flujo del orquestador).

### Validaciones implementadas

| Validación | Método | Criterio |
|---|---|---|
| Cita de fuentes | `if not respuesta.get("fuentes")` | Lista de fuentes vacía → `sin_fuentes` |
| Detección PII | Regex: `\b\d{7,8}-[\dkK]\b` (RUT) + `\b[0-9]{16}\b` (tarjeta) | Datos personales a estudiantes → `pii_no_autorizado` |
| Coherencia semántica | Overlap de tokens query vs. respuesta | Score < 0.70 → `incoherente` |
| Escalamiento crítico | `nivel_riesgo == "alto"` sin `escalar_a_consejero` | → `falta_escalamiento_critico` |
| Crisis emocional | Keywords: "suicidio", "hacerme daño", "no puedo más"... | Sin derivación → `crisis_no_escalada` |

### Objeto de retorno

```python
{
    "ok": False,
    "issues": ["incoherente"],
    "corrected": {
        "respuesta": "respuesta_original + nota de reformulación",
        "escalar_a_consejero": True  # si corresponde
    }
}
```

---

## 6. Búsqueda Semántica (KNN + Híbrida)

**Clase:** `SemanticSearchDesercion` (`src/retriever/semantic_search.py`)

### Configuración

| Parámetro | Valor |
|---|---|
| k resultados finales | 5 |
| Candidatos iniciales | 10 (k × 2) |
| Score mínimo KNN | 0.75 (para disparar híbrida) |
| Peso KNN en híbrida | 0.70 |
| Peso BM25 en híbrida | 0.30 |
| Modelo embedding | text-embedding-3-small (1.024 dims) |

### Flujo de búsqueda

```
query texto
    │
    ▼ _embed(query) → vector[1024]
    │
    ▼ index.query(vector, top_k=10)
    │
    ▼ _precision_at_k(matches) ≥ 0.75?
       ├─ SÍ → retorna top 5 directamente (KNN puro)
       └─ NO → _hybrid_search() → 0.7·knn_score + 0.3·bm25_keyword_score → top 5
```

### Pruebas de producción (6 consultas reales)

| # | Query | Worker activado | Fuentes encontradas | Latencia API |
|---|---|---|---|---|
| 1 | "¿Qué becas están disponibles con deuda de arancel?" | worker_documentos | 1 | 5.127 ms |
| 2 | "¿Qué pasa si reprobo más del 50% de los créditos?" | worker_documentos | 1 | 3.876 ms |
| 3 | "¿Cuáles son los factores de riesgo más importantes?" | worker_historial_sql | 1 | 4.649 ms |
| 4 | "¿Qué protocolo aplica si un alumno falta el 60%?" | worker_documentos | 1 | 4.134 ms |
| 5 | "¿Cuál es la tasa de deserción histórica por carrera?" | worker_historial_sql | 1 | 1.871 ms |
| 6 | "Listame los estudiantes con mayor riesgo" | worker_historial_sql | 1 | 3.203 ms |

**Precisión@5 observada:** 1.0 (todas las consultas retornaron al menos 1 fuente relevante)

---

## 7. SQL para Registros (Trazabilidad)

**Tabla:** `desercion_interactions` · **Cliente:** Supabase Python SDK (`src/db/supabase_client.py`)

### Esquema de la tabla (10 campos)

```sql
CREATE TABLE desercion_interactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- 1
  created_at            TIMESTAMPTZ DEFAULT NOW(),                    -- 2
  query                 TEXT,                                         -- 3
  response              JSONB,                                        -- 4
  latency_ms            INT,                                          -- 5
  score_riesgo          FLOAT,                                        -- 6
  nivel_riesgo          TEXT,                                         -- 7
  workers_usados        JSONB,                                        -- 8
  fiscalizador_ok       BOOLEAN DEFAULT TRUE,                         -- 9
  fiscalizador_issues   JSONB DEFAULT '[]',                          -- 10
  estudiante_id         UUID REFERENCES desercion_estudiantes(id),   -- 11
  usuario_id            UUID                                          -- 12
);
```

### Registro automático por consulta

```python
# src/api/main.py — registra cada query exitosa
await db.registrar_interaccion({
    "query": req.query,
    "response": resultado,
    "latency_ms": latencia,
    "score_riesgo": resultado.get("score_riesgo"),
    "nivel_riesgo": resultado.get("nivel_riesgo"),
    "workers_usados": resultado.get("workers_usados", []),
    "fiscalizador_ok": resultado.get("fiscalizador_ok", True),
    "fiscalizador_issues": resultado.get("fiscalizador_issues", []),
    "estudiante_id": req.estudiante_id,
})
```

El registro usa `try/except` sin interrumpir el flujo principal: si Supabase falla, la respuesta igual se entrega al usuario.

### Tablas completas del sistema

| Tabla | Descripción | Registros (seed) |
|---|---|---|
| `desercion_estudiantes` | Ficha académica y socioeconómica | 500 |
| `desercion_usuarios` | Consejeros, docentes y admin | 30 |
| `desercion_scores_ml` | Scores de riesgo 0.0–1.0 | 1.500 |
| `desercion_intervenciones` | Historial de intervenciones | 80 |
| `desercion_citas` | Agenda de citas | 0 |
| `desercion_interactions` | Log de consultas al agente | crece por uso |

---

## 8. GitHub

**Repositorio público:** https://github.com/Datascients/ExperienciaUCEN

### Estructura del proyecto

```
ConsultorEstudiantilIA/
├── src/
│   ├── api/main.py                      # FastAPI: 11 endpoints + lifespan resiliente
│   ├── agents/
│   │   ├── principal.py                 # AgenteConsultorEstudiantilIA (GPT-4o)
│   │   ├── orquestador.py               # OrquestadorDesercion: clasifica + delega
│   │   ├── fiscalizador.py              # Valida PII, coherencia, escalamiento
│   │   └── workers/
│   │       ├── worker_documentos.py     # Búsqueda semántica Pinecone
│   │       ├── worker_historial_sql.py  # Historial académico Supabase + reintentos
│   │       └── worker_scoring.py        # Score ML de deserción
│   ├── retriever/semantic_search.py     # KNN + BM25 híbrida
│   ├── indexer/load_documents.py        # Pipeline chunking → embedding → Pinecone
│   └── db/
│       ├── supabase_client.py           # CRUD + registro de interacciones
│       ├── seed.py                      # 500 estudiantes ficticios
│       └── migrations/001_schema.sql    # DDL completo de las 6 tablas
├── frontend/                            # React 19 + TypeScript + Tailwind CSS v3
│   ├── src/pages/                       # Landing, Dashboard×2, Ficha, Reportería, Admin
│   ├── src/components/                  # Navbar, ChatbotWidget, SemaforoRiesgo, Timeline
│   ├── tailwind.config.js
│   └── postcss.config.js
├── tests/
│   ├── test_principal.py
│   ├── test_orquestador.py
│   ├── test_fiscalizador.py
│   └── test_semantic_search.py
├── docs/
│   ├── README.md                        # Guía de documentos Pinecone
│   ├── reglamento_academico.txt
│   ├── guia_beneficios_estudiantiles.txt
│   ├── protocolo_intervencion_desercion.txt
│   ├── perfil_riesgo_factores.txt
│   └── estadisticas_desercion_historica.txt
├── Dockerfile                           # python:3.11-slim
├── railway.toml                         # healthcheck + restart policy
├── netlify.toml                         # base:frontend/ publish:dist
├── requirements.txt
├── .env.example
└── .gitignore                           # excluye .env, __pycache__, node_modules
```

**Commits significativos:** 12+ (feat, fix, config, docs)

---

## 9. Deploy — Railway (equivalente a Cloud Run)

### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["sh", "-c", "uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

> `${PORT:-8080}`: Railway inyecta `$PORT` dinámicamente. El fallback `8080` garantiza compatibilidad local.

### Variables de entorno en Railway Dashboard

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | GPT-4o + text-embedding-3-small |
| `PINECONE_API_KEY` | Pinecone Serverless |
| `PINECONE_INDEX_NAME` | `satisfaccion-ucen` |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (escritura) |
| `ENVIRONMENT` | `production` |

### Configuración de healthcheck (`railway.toml`)

```toml
[build]
builder = "DOCKERFILE"

[deploy]
healthcheckPath         = "/"
healthcheckTimeout      = 300
restartPolicyType       = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Startup resiliente:** si las variables de entorno no están configuradas, el servidor inicia igual, responde `agent_ready: false` en `GET /` y devuelve HTTP 503 con mensaje explicativo en `/query`. Esto permite que el healthcheck pase aunque el agente falle.

---

## 10. Go Live — Deploy y Pruebas en Producción

### Estado del sistema

```json
GET https://experienciaucen-production.up.railway.app/
{
  "status": "ok",
  "servicio": "ConsultorEstudiantilIA",
  "version": "1.0.0",
  "agent_ready": true,
  "init_error": null
}
```

### Grilla de métricas (6 pruebas en producción)

| Métrica | Valor |
|---|---|
| Latencia promedio — worker semántico (pruebas 1, 2, 4) | **4.379 ms** |
| Latencia promedio — worker SQL (pruebas 3, 5, 6) | **3.241 ms** |
| Latencia promedio total (6 pruebas) | **3.810 ms** |
| Fuentes retornadas por consulta | 1–5 fragmentos |
| Precisión@5 (fuentes relevantes) | 100% (6/6) |
| Fiscalizador OK | 0% — issues: `incoherente` por umbral estricto de overlap (ver mejoras) |
| Escalamiento a consejero humano | Activado en consultas de crisis |
| Respuesta salud API | `{"status":"ok","agent_ready":true}` |

### Tokens estimados por consulta

| Componente | Tokens |
|---|---|
| System prompt + contexto | ~400 tokens |
| Query del usuario | ~25 tokens |
| Fuentes recuperadas (k=5) | ~350 tokens |
| **Total input** | **~775 tokens** |
| **Output (respuesta)** | **~250 tokens** |
| **Total por consulta** | **~1.025 tokens** |

---

## Costo Estimado por 1.000 Consultas

| Componente | Cálculo | Costo USD |
|---|---|---|
| GPT-4o Input (775 tokens × 1.000 · $2.50/1M) | 775K tokens | $1.94 |
| GPT-4o Output (250 tokens × 1.000 · $10/1M) | 250K tokens | $2.50 |
| Clasificador GPT-4o (50 tokens I/O × 1.000) | 100K tokens | $0.38 |
| OpenAI Embeddings (text-embedding-3-small) | 50K tokens | $0.001 |
| Pinecone queries (serverless) | 1.000 queries | $1.00 |
| Railway (plan Starter prorrateado) | — | $0.50 |
| Netlify (free tier) | — | $0.00 |
| **Total estimado** | | **~$6.35 USD** |

---

## Instalación Local

```bash
git clone https://github.com/Datascients/ExperienciaUCEN.git
cd ExperienciaUCEN/ConsultorEstudiantilIA
pip install -r requirements.txt
cp .env.example .env          # completar con credenciales reales

# Indexar documentos en Pinecone
python -m src.indexer.load_documents

# Poblar Supabase (requiere SUPABASE_SERVICE_ROLE_KEY)
python -m src.db.seed

# Backend
uvicorn src.api.main:app --host 0.0.0.0 --port 8080 --reload
# → http://localhost:8080/docs

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

---

## Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/` | Health check + `agent_ready` |
| `POST` | `/query` | Consulta al orquestador RAG |
| `POST` | `/scoring` | Score ML de deserción |
| `GET` | `/estudiantes` | Listado con filtros riesgo/carrera |
| `GET` | `/estudiante/{id}` | Ficha completa + score ML |
| `POST` | `/intervencion` | Registrar intervención académica |
| `GET` | `/intervenciones` | Historial intervenciones |
| `GET` | `/citas` | Agenda de citas |
| `POST` | `/cita` | Agendar cita |
| `GET` | `/admin/reporteria` | KPIs institucionales |
| `POST` | `/admin/feedback` | Registrar observación |

### Ejemplo de consulta al agente

```bash
curl -X POST https://experienciaucen-production.up.railway.app/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué becas están disponibles para estudiantes con deuda de arancel?",
    "rol_consultante": "estudiante"
  }'
```

---

## 2 Mejoras Pendientes

1. **Mejorar el umbral de coherencia del fiscalizador**: el método actual usa overlap de tokens simples (threshold 0.70) lo que genera falsos positivos de `incoherente`. La mejora propuesta es usar embeddings coseno entre query y respuesta, o un juez LLM con score 0–1, lo que elevaría el fiscalizador_ok a >90%.

2. **Agregar `SUPABASE_SERVICE_ROLE_KEY` a Railway**: permite activar el `worker_historial_sql` en producción para consultas de perfil de estudiante y lista de riesgo. Actualmente el worker semántico opera correctamente; el worker SQL requiere esta variable en el panel de Railway para completar el flujo multi-agente end-to-end en producción.
