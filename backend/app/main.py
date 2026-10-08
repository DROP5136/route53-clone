from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth import router as auth_router
from app.database import init_db
from app.zones import router as zones_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Route 53", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(zones_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
