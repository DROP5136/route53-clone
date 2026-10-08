from fastapi import FastAPI

app = FastAPI(title="Route 53")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
