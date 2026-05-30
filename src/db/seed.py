"""Seed: genera 500 estudiantes ficticios con historial + scores ML."""
import asyncio
import random
import uuid
from datetime import datetime, timezone, timedelta

from src.db.supabase_client import get_client

CARRERAS = ["Ingeniería Civil", "Pedagogía", "Enfermería", "Administración", "Derecho"]
NOMBRES = [
    "Ana", "Luis", "Carla", "Mateo", "Valentina", "Diego", "Isadora",
    "Nicolás", "Sofía", "Martín", "Daniela", "Felipe", "Camila", "Andrés",
]
APELLIDOS = [
    "González", "Muñoz", "Rodríguez", "López", "Martínez", "García",
    "Hernández", "Pérez", "Soto", "Torres", "Vargas", "Castro",
]


def _rut(n: int) -> str:
    return f"{n + 10000000}-{random.randint(0, 9)}"


def _score_para_nivel(nivel: str) -> float:
    if nivel == "alto":
        return round(random.uniform(0.70, 0.98), 4)
    if nivel == "medio":
        return round(random.uniform(0.40, 0.69), 4)
    return round(random.uniform(0.05, 0.39), 4)


def _promedio_para_nivel(nivel: str) -> float:
    if nivel == "alto":
        return round(random.uniform(3.0, 4.5), 1)
    if nivel == "medio":
        return round(random.uniform(4.5, 5.5), 1)
    return round(random.uniform(5.5, 7.0), 1)


def _asistencia_para_nivel(nivel: str) -> float:
    if nivel == "alto":
        return round(random.uniform(0.40, 0.70), 2)
    if nivel == "medio":
        return round(random.uniform(0.70, 0.85), 2)
    return round(random.uniform(0.85, 1.0), 2)


async def seed():
    client = get_client()
    print("Iniciando seed...")

    # Usuarios (consejeros + docentes)
    consejeros = []
    for i in range(10):
        uid = str(uuid.uuid4())
        nombre = f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)}"
        facultad = random.choice(CARRERAS)
        result = client.table("desercion_usuarios").insert({
            "id": uid,
            "email": f"consejero{i+1}@uai.cl",
            "nombre": nombre,
            "rol": "consejero",
            "facultad": facultad,
        }).execute()
        consejeros.append(uid)

    for i in range(20):
        client.table("desercion_usuarios").insert({
            "email": f"docente{i+1}@uai.cl",
            "nombre": f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)}",
            "rol": "docente",
            "facultad": random.choice(CARRERAS),
        }).execute()

    print(f"  {len(consejeros)} consejeros + 20 docentes creados")

    # Estudiantes
    niveles = (
        ["alto"] * 150 +
        ["medio"] * 200 +
        ["bajo"] * 150
    )
    random.shuffle(niveles)

    estudiante_ids = []
    for i, nivel in enumerate(niveles):
        eid = str(uuid.uuid4())
        carrera = random.choice(CARRERAS)
        semestre = random.randint(1, 8)

        student = {
            "id": eid,
            "rut": _rut(i),
            "nombre": f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)}",
            "carrera": carrera,
            "semestre": semestre,
            "creditos_aprobados": random.randint(0, semestre * 30),
            "promedio": _promedio_para_nivel(nivel),
            "porcentaje_asistencia": _asistencia_para_nivel(nivel),
            "estado": "activo",
            "datos_socioeconomicos": {
                "beca": random.choice([True, False]),
                "trabaja": random.choice([True, False]),
            },
        }
        client.table("desercion_estudiantes").insert(student).execute()
        estudiante_ids.append((eid, nivel, carrera))

        score = _score_para_nivel(nivel)
        for _ in range(3):
            fecha = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 180))
            client.table("desercion_scores_ml").insert({
                "estudiante_id": eid,
                "score": score,
                "nivel": nivel,
                "features": {
                    "promedio": student["promedio"],
                    "porcentaje_asistencia": student["porcentaje_asistencia"],
                    "semestre": semestre,
                },
                "modelo_version": "v1.0",
                "calculado_en": fecha.isoformat(),
            }).execute()

    print(f"  500 estudiantes creados (150 alto / 200 medio / 150 bajo)")

    # Intervenciones de ejemplo
    tipos = ["academica", "psicologica", "economica", "derivacion_externa"]
    estados = ["exitosa", "no_contacto", "derivada", "pendiente"]
    alto_ids = [e for e, n, _ in estudiante_ids if n == "alto"]

    for eid in alto_ids[:80]:
        consejero_id = random.choice(consejeros)
        client.table("desercion_intervenciones").insert({
            "estudiante_id": eid,
            "consejero_id": consejero_id,
            "tipo": random.choice(tipos),
            "estado": random.choice(estados),
            "notas": "Intervención generada por seed.",
        }).execute()

    print("  80 intervenciones creadas para estudiantes de riesgo alto")
    print("Seed completado.")


if __name__ == "__main__":
    asyncio.run(seed())
