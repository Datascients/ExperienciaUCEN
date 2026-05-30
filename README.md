# ConsultorEstudiantilIA — Sistema RAG Multi-Agente para Prevención de Deserción

ConsultorEstudiantilIA ayuda a la **Universidad Central de Chile (UCEN)** a detectar y atender tempranamente a estudiantes en riesgo de deserción. El sistema combina un modelo predictivo ML, búsqueda semántica sobre documentos institucionales y un orquestador de agentes IA para entregar respuestas precisas según el rol del consultante (estudiante, consejero o administrador).

## URLs del Sistema

| Servicio | URL |
|---|---|
| **Frontend** | https://experienciaucen.netlify.app |
| **Backend API** | https://experienciaucen-production.up.railway.app |
| **API Docs (Swagger)** | https://experienciaucen-production.up.railway.app/docs |
| **Repositorio GitHub** | https://github.com/Datascients/ExperienciaUCEN |

## Credenciales de prueba

| Rol | Usuario | Contraseña | Destino |
|---|---|---|---|
| Administrador | `Admin` | `1234` | `/admin` |
| Consejero | `consejero@ucen.cl` | `demo2025` | `/dashboard` |
| Estudiante | cualquier email | cualquier contraseña | `/estudiante` |

---

## Arquitectura del Sistema

```
Usuario (React + Netlify)
       │
       ▼
  FastAPI (Railway)
       │
       ▼
  AgenteConsultorEstudiantilIA (GPT-4o)
  ├── OrquestadorDesercion
  │   ├── worker_documentos      → Pinecone (reglamento, becas, protocolo, factores, estadísticas)
  │   ├── worker_historial_sql   → Supabase (estudiantes, scores ML, intervenciones)
  │   └── worker_scoring         → Modelo ML (score de riesgo 0.0–1.0)
  └── FiscalizadorEstudiantil    → valida PII, coherencia, escalamiento a consejero
       │
       ▼
  Respuesta verificada con fuentes citadas
```

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| LLM | OpenAI GPT-4o |
| Embeddings | OpenAI text-embedding-3-small (1024 dims) |
| Vector DB | Pinecone Serverless (AWS us-east-1) |
| Base de datos | Supabase (PostgreSQL) |
| Backend | FastAPI 0.111 + Uvicorn + Python 3.11 |
| Frontend | React 19 + TypeScript + Vite 5 + Tailwind CSS v3 |
| Deploy backend | Railway (Dockerfile, auto-deploy en push a `master`) |
| Deploy frontend | Netlify (build desde `/frontend`, SPA routing) |

---

## Documentos Indexados en Pinecone

| Documento | Chunks | Namespace Pinecone |
|---|---|---|
| `reglamento_academico.txt` | 9 | `reglamento-academico` |
| `protocolo_intervencion_desercion.txt` | 9 | `protocolo-intervencion` |
| `estadisticas_desercion_historica.txt` | 8 | `estadisticas` |
| `guia_beneficios_estudiantiles.txt` | 8 | `beneficios` |
| `perfil_riesgo_factores.txt` | 8 | `factores-riesgo` |
| **Total** | **42 chunks** | índice: `satisfaccion-ucen` |

---

## Instalación Local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/Datascients/ExperienciaUCEN.git
cd ExperienciaUCEN/ConsultorEstudiantilIA
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
cp .env.example .env          # Completar con credenciales reales
```

### 2. Variables de entorno (`.env`)

```env
# LLM
OPENAI_API_KEY=               # OpenAI API Key (GPT-4o + embeddings)

# Vector DB
PINECONE_API_KEY=             # Pinecone API Key
PINECONE_INDEX_NAME=satisfaccion-ucen

# Base de datos
SUPABASE_URL=                 # URL del proyecto Supabase
SUPABASE_ANON_KEY=            # Anon/publishable key
SUPABASE_SERVICE_ROLE_KEY=    # Service role key (requerido para seed)

# App
ENVIRONMENT=development
PORT=8080

# Deploy (opcionales localmente)
RAILWAY_TOKEN=                # railway.app → Account Settings → Tokens
RAILWAY_SERVICE_URL=          # URL asignada por Railway tras primer deploy
NETLIFY_AUTH_TOKEN=           # app.netlify.com → User Settings → Personal access tokens
NETLIFY_SITE_ID=              # app.netlify.com → Site Settings → Site information
```

### 3. Indexar documentos en Pinecone

Coloca PDFs, DOCX o TXT en la carpeta `/docs` y ejecuta:

```bash
python -m src.indexer.load_documents
```

Los documentos incluidos por defecto cubren: reglamento académico, becas y beneficios, protocolo de intervención, factores de riesgo y estadísticas históricas de deserción.

### 4. Poblar Supabase con datos de prueba

```bash
python -m src.db.seed
```

Genera: 500 estudiantes (30% riesgo alto / 40% medio / 30% bajo), 10 consejeros, 20 docentes, 80 intervenciones y 3 scores ML por estudiante.

### 5. Levantar el backend

```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8080 --reload
```

API disponible en `http://localhost:8080` · Swagger UI en `http://localhost:8080/docs`

### 6. Levantar el frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en `http://localhost:5173`

---

## Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/` | Health check + estado del agente (`agent_ready`) |
| `POST` | `/query` | Consulta al orquestador RAG multi-agente |
| `POST` | `/scoring` | Score ML de deserción para un estudiante |
| `GET` | `/estudiantes` | Listado con filtros de nivel de riesgo y carrera |
| `GET` | `/estudiante/{id}` | Ficha completa: datos + score ML |
| `POST` | `/intervencion` | Registrar nueva intervención académica |
| `GET` | `/intervenciones` | Historial de intervenciones con filtros |
| `GET` | `/citas` | Agenda de citas del consejero |
| `POST` | `/cita` | Agendar nueva cita |
| `GET` | `/admin/reporteria` | KPIs institucionales agregados |
| `POST` | `/admin/feedback` | Registrar observación sobre un estudiante |

### Ejemplo de consulta al agente

```bash
curl -X POST https://experienciaucen-production.up.railway.app/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué becas están disponibles para estudiantes con deuda de arancel?",
    "rol_consultante": "estudiante"
  }'
```

### Respuesta típica

```json
{
  "respuesta": "Los estudiantes con deuda de arancel pueden acceder a la **Beca de Apoyo a la Permanencia** (condonación hasta 20% de la deuda), el **Convenio de Pago** (hasta 10 cuotas sin interés) y la **Beca Bicentenario** si cumplen requisitos FUAS...",
  "fuentes": [
    {
      "documento": "guia_beneficios_estudiantiles.txt",
      "seccion": "chunk-3",
      "fragmento": "2.2 Beca de Apoyo a la Permanencia..."
    }
  ],
  "score_riesgo": 0.0,
  "nivel_riesgo": "bajo",
  "escalar_a_consejero": false,
  "fiscalizador_ok": true,
  "workers_usados": ["worker_documentos"],
  "latency_ms": 1842
}
```

---

## Supabase — Tablas

| Tabla | Descripción |
|---|---|
| `desercion_estudiantes` | Ficha: RUT, carrera, semestre, promedio, asistencia, datos socioeconómicos |
| `desercion_usuarios` | Consejeros, docentes y administradores |
| `desercion_scores_ml` | Scores de riesgo (0.0–1.0) con nivel: alto / medio / bajo |
| `desercion_intervenciones` | Historial de intervenciones por estudiante y consejero |
| `desercion_citas` | Agenda: fecha, modalidad, link sala, estado |
| `desercion_interactions` | Log completo: query, respuesta, latencia, workers usados, fiscalizador |

---

## Estructura del Proyecto

```
ConsultorEstudiantilIA/
├── src/
│   ├── api/
│   │   └── main.py                      # FastAPI: endpoints + lifespan resiliente
│   ├── agents/
│   │   ├── principal.py                 # AgenteConsultorEstudiantilIA (GPT-4o)
│   │   ├── orquestador.py               # OrquestadorDesercion: clasifica + delega
│   │   ├── fiscalizador.py              # Valida PII, coherencia, escalamiento
│   │   └── workers/
│   │       ├── worker_documentos.py     # Búsqueda semántica en Pinecone
│   │       ├── worker_historial_sql.py  # Historial académico en Supabase
│   │       └── worker_scoring.py        # Score ML de deserción
│   ├── retriever/
│   │   └── semantic_search.py           # Búsqueda híbrida KNN + BM25 + re-ranking
│   ├── indexer/
│   │   └── load_documents.py            # Pipeline: chunking → embedding → Pinecone
│   └── db/
│       ├── supabase_client.py           # Cliente Supabase + helpers CRUD
│       └── seed.py                      # Genera 500 estudiantes ficticios
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx              # Login con split layout + demo hints
│   │   │   ├── DashboardConsejero.tsx   # Tabla estudiantes + filtros + búsqueda
│   │   │   ├── DashboardEstudiante.tsx  # Portal estudiante + cards de recursos
│   │   │   ├── FichaEstudiante.tsx      # Ficha detallada + score ML + intervenciones
│   │   │   ├── Reporteria.tsx           # KPIs + distribución por carrera
│   │   │   ├── Agendamiento.tsx         # Agenda de citas con modal
│   │   │   └── AdminPanel.tsx           # Admin: KPIs + API docs + seed + feedback
│   │   ├── components/
│   │   │   ├── ChatbotWidget.tsx        # Chat flotante con sugerencias rápidas
│   │   │   ├── Navbar.tsx               # Barra de navegación por rol
│   │   │   ├── SemaforoRiesgo.tsx       # Badge de nivel de riesgo
│   │   │   └── TimelineIntervencion.tsx # Timeline de historial de intervenciones
│   │   └── context/
│   │       └── AppContext.tsx           # Estado global: usuario + apiUrl
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.ts
│   └── public/
│       └── _redirects                   # Netlify SPA routing
├── docs/
│   ├── reglamento_academico.txt
│   ├── guia_beneficios_estudiantiles.txt
│   ├── protocolo_intervencion_desercion.txt
│   ├── perfil_riesgo_factores.txt
│   └── estadisticas_desercion_historica.txt
├── Dockerfile                           # Build para Railway
├── railway.toml                         # Healthcheck + restart policy
├── netlify.toml                         # Base: frontend/ · Publish: dist/
├── requirements.txt
└── .env.example
```

---

## Deploy

### Backend — Railway

Railway hace auto-deploy en cada push a `master`. Variables de entorno requeridas en el dashboard:

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | OpenAI API Key |
| `PINECONE_API_KEY` | Pinecone API Key |
| `PINECONE_INDEX_NAME` | `satisfaccion-ucen` |
| `SUPABASE_URL` | URL proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `ENVIRONMENT` | `production` |

> `PORT` es inyectado automáticamente por Railway. El `CMD` usa `${PORT:-8080}`.

### Frontend — Netlify

Netlify hace auto-deploy en cada push a `master` usando `netlify.toml`:
- **Base directory:** `frontend/`
- **Build command:** `npm run build`
- **Publish directory:** `dist`

La variable `VITE_API_URL` está definida en `frontend/.env.production` apuntando al backend de Railway.

---

## Métricas del Modelo Predictivo

| Métrica | Valor |
|---|---|
| Precisión global | 83% |
| Sensibilidad (detección desertores) | 79% |
| Especificidad | 86% |
| AUC-ROC | 0.88 |
| Dataset de validación | 12.430 estudiantes (2019–2023) |
| Reducción de deserción con intervención | −23% vs. cohortes sin intervención |

Clasificación de riesgo: `score < 0.35` → bajo · `0.35–0.65` → medio · `> 0.65` → alto

---

## Costo Estimado por 1.000 Consultas

| Componente | Costo USD |
|---|---|
| GPT-4o Input (1.200 tokens × 1.000) | $3.00 |
| GPT-4o Output (400 tokens × 1.000) | $4.00 |
| OpenAI Embeddings (text-embedding-3-small) | $0.01 |
| Pinecone queries (serverless) | $1.00 |
| Railway (prorrateado, plan Starter) | $0.50 |
| Netlify (free tier) | $0.00 |
| **Total estimado** | **~$8.51 USD** |
