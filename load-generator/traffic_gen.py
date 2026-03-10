import asyncio
import httpx
import random
import time
import os

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://api-gateway:8000")
RPS = int(os.getenv("RPS", "2"))  # Default to 2 Requests Per Second

LOCATIONS = [
    "Patel Hall", "LBS Hall", "Tech Market", "Main Gate", 
    "Kharagpur Station", "Prembazaar", "Gole Bazaar", "Nehru Museum"
]

async def book_ride(client: httpx.AsyncClient):
    payload = {
        "pickup": random.choice(LOCATIONS),
        "destination": random.choice(LOCATIONS)
    }
    
    # Ensure pickup and destination are different
    while payload["pickup"] == payload["destination"]:
        payload["destination"] = random.choice(LOCATIONS)

    try:
        start_time = time.time()
        response = await client.post(
            f"{API_GATEWAY_URL}/book-ride", 
            json=payload, 
            timeout=15.0 # Give enough time to catch the 5s latency faults
        )
        duration = round(time.time() - start_time, 2)
        
        if response.status_code == 200:
            print(f"✅ SUCCESS: Ride booked in {duration}s | {payload['pickup']} -> {payload['destination']}")
        else:
            print(f"❌ ERROR {response.status_code}: Request failed after {duration}s")
    except httpx.RequestError as e:
        print(f"⚠️ NETWORK ERROR: {e}")

async def run_load():
    print(f"🚀 Starting background traffic generator at {RPS} requests per second...")
    print(f"📡 Targeting API Gateway at: {API_GATEWAY_URL}")
    
    # We use limits to prevent overwhelming the local Docker network
    limits = httpx.Limits(max_keepalive_connections=10, max_connections=20)
    async with httpx.AsyncClient(limits=limits) as client:
        while True:
            # Fire off a batch of requests based on RPS
            tasks = [book_ride(client) for _ in range(RPS)]
            await asyncio.gather(*tasks)
            await asyncio.sleep(1)

if __name__ == "__main__":
    try:
        asyncio.run(run_load())
    except KeyboardInterrupt:
        print("\n🛑 Load generator stopped.")