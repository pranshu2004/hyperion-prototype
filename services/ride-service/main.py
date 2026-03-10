from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import httpx
import os
import logging
import uuid
from datetime import datetime
from sqlalchemy import create_engine, text

# --- OpenTelemetry Imports ---
from opentelemetry import trace
from opentelemetry.trace.status import Status, StatusCode
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor # Added

# --- OpenTelemetry Setup ---
resource = Resource(attributes={"service.name": "ride-service"})
provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)

otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4317")
otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

HTTPXClientInstrumentor().instrument()

app = FastAPI(title="Ride Service")
FastAPIInstrumentor.instrument_app(app)

# --- Database Setup & Instrumentation ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://hyperion:password@postgres:5432/hyperion_db")
engine = create_engine(DATABASE_URL)
# Instrument the database engine
SQLAlchemyInstrumentor().instrument(engine=engine)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ride-service")

DRIVER_URL = os.getenv("DRIVER_SERVICE_URL", "http://driver-matching-service:8000")
PRICING_URL = os.getenv("PRICING_SERVICE_URL", "http://pricing-service:8000")
PAYMENT_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8000")
NOTIFY_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://hyperion:password@postgres:5432/hyperion_db")

# New: Address to check fault state
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://api-gateway:8000")

engine = create_engine(DATABASE_URL)

class RideRequest(BaseModel):
    pickup: str
    destination: str

async def get_fault_mode():
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{API_GATEWAY_URL}/fault-state")
            return res.json().get("fault_mode", "normal")
        except Exception:
            return "normal"

@app.post("/create-ride")
async def create_ride(request: RideRequest):
    ride_id = f"ride_{uuid.uuid4().hex[:8]}"
    logger.info(f"[{datetime.utcnow().isoformat()}] [ride-service] POST /create-ride initiated")
    
    fault_mode = await get_fault_mode()
    if fault_mode == "db_failure":
        error_msg = "Database connection failed"
        logger.error(f"[{datetime.utcnow().isoformat()}] [ride-service] {error_msg}")
        
        # Realistic Error Recording
        current_span = trace.get_current_span()
        simulated_err = Exception(error_msg)
        current_span.record_exception(simulated_err)
        current_span.set_status(Status(StatusCode.ERROR, error_msg))
        
        raise HTTPException(status_code=500, detail=error_msg)

    with engine.connect() as conn:
        conn.execute(text("INSERT INTO rides (ride_id, pickup, destination, status) VALUES (:r, :p, :d, 'processing')"),
                     {"r": ride_id, "p": request.pickup, "d": request.destination})
        conn.commit()

    async with httpx.AsyncClient() as client:
        try:
            driver_res = await client.post(f"{DRIVER_URL}/match-driver")
            driver_data = driver_res.json()
            
            price_res = await client.post(f"{PRICING_URL}/calculate-price")
            price = price_res.json()["price"]
            
            await client.post(f"{PAYMENT_URL}/process-payment")
            await client.post(f"{NOTIFY_URL}/send-confirmation")

            with engine.connect() as conn:
                conn.execute(text("UPDATE rides SET status='confirmed', driver_id=:d, price=:p WHERE ride_id=:r"),
                             {"d": driver_data["driver_id"], "p": price, "r": ride_id})
                conn.execute(text("INSERT INTO payments (ride_id, status) VALUES (:r, 'success')"), {"r": ride_id})
                conn.commit()

            logger.info(f"[{datetime.utcnow().isoformat()}] [ride-service] POST /create-ride success")
            return {"ride_id": ride_id, "status": "confirmed", "driver": driver_data, "price": price}

        except httpx.HTTPError as e:
            logger.error(f"[{datetime.utcnow().isoformat()}] [ride-service] downstream failure: {e}")
            with engine.connect() as conn:
                conn.execute(text("UPDATE rides SET status='failed' WHERE ride_id=:r"), {"r": ride_id})
                conn.commit()
            raise HTTPException(status_code=500, detail="Workflow failed")

@app.get("/ride/{ride_id}")
def get_ride(ride_id: str):
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM rides WHERE ride_id=:r"), {"r": ride_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Ride not found")
        return {"ride_id": result.ride_id, "status": result.status, "price": result.price}