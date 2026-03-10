import networkx as nx

def rank_root_causes(graph, metrics, timeline, anomalous_services):
    """
    Scores and ranks anomalous services based on telemetry, topology, and time.
    """
    if not anomalous_services:
        return []

    scores = []
    earliest_incident_time = min(timeline.values()) if timeline else 0

    for svc in anomalous_services:
        svc_metrics = metrics.get(svc, {})
        
        # 1. Anomaly Strength
        anomaly_strength = svc_metrics.get("error_rate", 0)
        
        # 2. Topology Influence (Blast Radius)
        # Services that depend on me (my ancestors in a caller->callee graph)
        downstream_impact = len(nx.ancestors(graph, svc)) if svc in graph else 0
        
        # 3. Temporal Priority (Fixed Math)
        svc_time = timeline.get(svc, earliest_incident_time)
        # Convert microseconds to milliseconds to soften the penalty
        time_diff_ms = max(0, svc_time - earliest_incident_time) / 1000.0
        
        # Topology should be the main driver; time is a tie-breaker
        temporal_priority = 1.0 / ((time_diff_ms * 0.1) + 1)
        
        raw_score = (anomaly_strength + 0.1) * (downstream_impact + 1) * temporal_priority
        scores.append({"service": svc, "score": raw_score})

    total_score = sum(s["score"] for s in scores)
    for s in scores:
        s["confidence"] = round((s["score"] / total_score), 2) if total_score > 0 else 0

    return sorted(scores, key=lambda x: x["confidence"], reverse=True)