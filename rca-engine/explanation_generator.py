def generate_explanation(ranked_causes, chain, metrics, timeline):
    """
    Generates a structured, human-readable RCA summary.
    """
    if not ranked_causes:
        return "\n[Hyperion] System Healthy. No RCA required.\n"

    top_cause = ranked_causes[0]
    
    out = "\n========================================\n"
    out += "       Hyperion RCA Analysis\n"
    out += "========================================\n\n"
    
    out += "Root Cause Candidate\n"
    out += f"{top_cause['service']}\n"
    out += f"Confidence: {top_cause['confidence']}\n\n"
    
    out += "Failure Propagation\n"
    out += "  ->  ".join(chain) + "\n\n"
    
    out += "Evidence\n"
    
    # Generate dynamic evidence points based on the math
    svc_metrics = metrics.get(top_cause['service'], {})
    if svc_metrics.get("error_rate", 0) > 0:
        out += f"• high error rate observed ({svc_metrics['error_rate']:.2f})\n"
        
    if top_cause['service'] == min(timeline, key=timeline.get):
        out += "• earliest anomaly detected in the temporal chain\n"
        
    if len(chain) > 1:
        out += "• identified as upstream dependency for impacted services\n"

    return out