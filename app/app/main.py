from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import games, sessions

app = FastAPI(title="MeeplesShelf", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
