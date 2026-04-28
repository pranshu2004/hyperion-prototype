from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import logging
from datetime import datetime

# --- OpenTelemetry Imports ---
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# --- OpenTelemetry Setup ---
SERVICE_NAME = "api-gateway"

resource = Resource(attributes={"service.name": SERVICE_NAME})
provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)

otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4317")
otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Instrument HTTPX for all outgoing requests
HTTPXClientInstrumentor().instrument()

app = FastAPI(title=SERVICE_NAME)

# Instrument FastAPI for all incoming requests
FastAPIInstrumentor.instrument_app(app)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api-gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # this is fine and required to run
    allow_credentials=False,
    allow_methods=["*"], 
    allow_headers=["*"],
)

RIDE_SERVICE_URL = os.getenv("RIDE_SERVICE_URL", "http://ride-service:8000")

# Global Fault State
FAULT_MODE = "normal"

class RideRequest(BaseModel):
    pickup: str
    destination: str

class FaultRequest(BaseModel):
    fault: str

@app.post("/inject-fault")
async def inject_fault(request: FaultRequest):
    global FAULT_MODE
    valid_faults = ["normal", "driver_failure", "payment_latency", "db_failure"]
    if request.fault not in valid_faults:
        raise HTTPException(status_code=400, detail="Invalid fault mode")
    
    FAULT_MODE = request.fault
    logger.warning(f"[{datetime.utcnow().isoformat()}] [api-gateway] FAULT_MODE set to {FAULT_MODE}")
    return {"status": "success", "fault_mode": FAULT_MODE}

@app.post("/reset-faults")
async def reset_faults():
    global FAULT_MODE
    FAULT_MODE = "normal"
    logger.info(f"[{datetime.utcnow().isoformat()}] [api-gateway] FAULT_MODE reset to normal")
    return {"status": "success", "fault_mode": FAULT_MODE}

@app.get("/fault-state")
async def get_fault_state():
    return {"fault_mode": FAULT_MODE}

@app.post("/book-ride")
async def book_ride(request: RideRequest):
    logger.info(f"[{datetime.utcnow().isoformat()}] [api-gateway] POST /book-ride initiated")
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(f"{RIDE_SERVICE_URL}/create-ride", json=request.dict())
            res.raise_for_status()
            logger.info(f"[{datetime.utcnow().isoformat()}] [api-gateway] POST /book-ride success")
            return res.json()
        except httpx.HTTPError as e:
            logger.error(f"[{datetime.utcnow().isoformat()}] [api-gateway] POST /book-ride failed: {e}")
            raise HTTPException(status_code=500, detail="Downstream service error")

@app.get("/ride-status/{ride_id}")
async def ride_status(ride_id: str):
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{RIDE_SERVICE_URL}/ride/{ride_id}")
            res.raise_for_status()
            return res.json()
        except httpx.HTTPError:
            raise HTTPException(status_code=404, detail="Ride not found")