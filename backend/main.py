import os
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import engine, Base
import models
from schemas import HealthResponse
from services.market_data import market_data_service
from routers import market, stocks, watchlists, alerts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("market_terminal")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    logger.info("Initializing SQLite database tables...")
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully.")

    # Pre-warm universe data in background or synchronous
    logger.info("Pre-warming market data universe cache...")
    try:
        market_data_service.get_indices()
        market_data_service.get_universe_data()
        logger.info("Market data universe pre-warming completed.")
    except Exception as e:
        logger.warning(f"Initial universe pre-warming encountered an issue (will retry on demand): {e}")

    yield
    logger.info("Shutting down Market Intelligence Terminal API...")

app = FastAPI(
    title="Elvaris Capital — Market Intelligence Terminal API",
    description="Institutional-grade market intelligence, analytics, sector heatmaps, scanner, and alert evaluation engine for NSE-listed Indian equities.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler to ensure server stability
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred while processing market analytics."}
    )

# Routers
app.include_router(market.router)
app.include_router(stocks.router)
app.include_router(watchlists.router)
app.include_router(alerts.router)

@app.get("/api/health", response_model=HealthResponse, tags=["System Health"])
def health_check():
    """Returns application health status, version, and cached market data counts."""
    info = market_data_service.get_last_update_info()
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
        data_provider=info["provider"],
        cached_stocks_count=info["cached_universe_count"]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
