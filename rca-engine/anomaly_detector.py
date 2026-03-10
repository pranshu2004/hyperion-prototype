def detect_anomalies(service_metrics):
    """Detects abnormal services based on error rates and latency spikes."""
    if not service_metrics:
        return []

    # Calculate global system average latency
    total_lat = sum(m["avg_latency"] for m in service_metrics.values())
    sys_avg_lat = total_lat / len(service_metrics) if service_metrics else 0

    anomalous_services = []
    for service, metrics in service_metrics.items():
        if metrics["error_rate"] > 0.2 or metrics["avg_latency"] > (3 * sys_avg_lat):
            anomalous_services.append(service)

    return anomalous_services