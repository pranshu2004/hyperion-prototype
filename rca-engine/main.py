from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime

from trace_ingestor import fetch_traces
from trace_parser import parse_traces
from graph_builder import build_service_graph
from signal_extractor import extract_signals
from anomaly_detector import detect_anomalies
from temporal_analyzer import analyze_temporal_failures
from root_cause_ranker import rank_root_causes
from causal_chain_builder import build_causal_chain
from explanation_generator import generate_explanation

app = FastAPI(title="Hyperion RCA Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon, allow all
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/analyze")
def analyze_system():
    raw_traces = fetch_traces()
    if not raw_traces:
        return {"status": "healthy", "message": "No traffic or traces found."}

    parsed_data = parse_traces(raw_traces)
    graph = build_service_graph(parsed_data)
    metrics = extract_signals(parsed_data)
    anomalies = detect_anomalies(metrics)
    
    # Format graph data for frontend visualization
    nodes_data = []
    edges_data = [{"source": u, "target": v} for u, v in graph.edges()]
    
    for node in graph.nodes():
        node_metric = metrics.get(node, {"error_rate": 0, "avg_latency": 0})
        nodes_data.append({
            "id": node,
            "anomalous": node in anomalies,
            "error_rate": node_metric.get("error_rate", 0),
            "avg_latency": node_metric.get("avg_latency", 0)
        })

    if not anomalies:
        return {
            "status": "healthy",
            "graph": {"nodes": nodes_data, "edges": edges_data}
        }

    # Incident Active - Run Causal Engine
    timeline = analyze_temporal_failures(parsed_data, anomalies)
    ranked_causes = rank_root_causes(graph, metrics, timeline, anomalies)
    
    top_cause = ranked_causes[0]
    chain = build_causal_chain(graph, top_cause["service"], anomalies, timeline)

# --- NEW: Build the Incident Timeline for the UI ---
    incident_timeline = []
    # Sort the anomalous services by when they failed
    sorted_anomalies = sorted(timeline.items(), key=lambda x: x[1])
    for svc, ts_micros in sorted_anomalies:
        # Convert Jaeger's microseconds to a readable HH:MM:SS format
        dt = datetime.fromtimestamp(ts_micros / 1000000.0)
        formatted_time = dt.strftime('%H:%M:%S')
        incident_timeline.append({
            "timestamp": formatted_time,
            "message": f"{svc} anomaly detected"
        })

    # Generate Evidence List
    evidence = []
    svc_metrics = metrics.get(top_cause['service'], {})
    if svc_metrics.get("error_rate", 0) > 0:
        evidence.append(f"High error rate observed ({svc_metrics['error_rate']:.2f})")
    if top_cause['service'] == min(timeline, key=timeline.get):
        evidence.append("Earliest anomaly detected in the temporal chain")
    if len(chain) > 1:
        evidence.append("Identified as upstream dependency for impacted services")

    # --- UPDATED RETURN PAYLOAD ---
    return {
        "status": "incident",
        "root_cause": {
            "service": top_cause["service"],
            "confidence": top_cause["confidence"]
        },
        "causal_chain": chain,
        "incident_timeline": incident_timeline, # Injecting the new timeline here!
        "evidence": evidence,
        "graph": {"nodes": nodes_data, "edges": edges_data}
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8008)