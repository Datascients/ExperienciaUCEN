# /docs/ — Documentos del ConsultorEstudiantilIA

Sube aquí los documentos institucionales antes de correr el indexador.
Formatos válidos: .pdf, .docx, .txt

## Documentos requeridos (mínimo 3):

| Archivo esperado                         | Contenido                                            |
|------------------------------------------|------------------------------------------------------|
| protocolo_intervencion_desercion.pdf     | Pasos y criterios del protocolo de alertas tempranas |
| reglamento_academico.pdf                 | Normas de reprobación, abandono, carga mínima        |
| guia_beneficios_estudiantiles.pdf        | Becas, créditos, psicología, tutorías disponibles    |
| perfil_riesgo_factores.txt               | Variables predictoras y pesos del modelo de riesgo   |
| estadisticas_desercion_historica.txt     | Tasas históricas por carrera, semestre y cohorte     |

## Preguntas que debe responder el agente:

- ¿Qué protocolo aplica cuando un alumno falta más del 50%?
- ¿Qué becas puede solicitar un estudiante con deuda académica?
- ¿Cuál es el score de riesgo de un estudiante y qué intervención corresponde?
- ¿Cuáles son los factores más relevantes para predecir deserción en Ingeniería?
- ¿Qué tasa de retención tuvo la cohorte 2023?

## Una vez subidos los archivos, ejecuta:

```bash
python -m src.indexer.load_documents
```

El indexador leerá todos los archivos, aplicará chunking semántico y subirá los vectores
al índice Pinecone `desercion-docs` en los namespaces correspondientes.
