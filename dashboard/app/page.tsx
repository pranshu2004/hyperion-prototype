"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Activity,
  Server,
  Clock,
  Play,
  ArrowRight,
  ShieldCheck,
  Flame,
  Zap,
  RefreshCw,
} from "lucide-react";

// --- Types ---
type RootCause = {
  service: string;
  confidence: number;
};

type TimelineEvent = {
  timestamp: string;
  message: string;
};

type ApiNode = {
  id: string;
  anomalous: boolean;
  error_rate: number;
  avg_latency: number;
};

type ApiEdge = {
  source: string;
  target: string;
};

type ApiGraph = {
  nodes: ApiNode[];
  edges: ApiEdge[];
};

type AnalysisResponse = {
  status: "incident" | "healthy";
  root_cause?: RootCause;
  causal_chain?: string[];
  incident_timeline?: TimelineEvent[];
  evidence?: string[];
  graph: ApiGraph;
};

// --- Custom React Flow Node ---
const CustomServiceNode = ({ data }: NodeProps) => {
  const isAnomalous = data.anomalous as boolean;
  const isRootCause = data.isRootCause as boolean;
  const inReplay = data.inReplay as boolean;

  // Determine styles based on three visual states
  let containerClasses = "bg-zinc-950 border-zinc-800";
  let GlowComponent = null;
  let iconClass = "text-emerald-500/70";
  let labelClass = "text-zinc-300";

  if (isRootCause) {
    containerClasses = "bg-zinc-900 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.9)] scale-[1.07] animate-pulse";
    iconClass = "text-red-500";
    labelClass = "text-red-100 font-bold";
    GlowComponent = (
      <div className="absolute inset-0 -m-[2px] rounded-xl border-2 border-red-500 animate-ping opacity-[0.15]" />
    );
  } else if (isAnomalous) {
    containerClasses = "bg-zinc-900/80 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
    iconClass = "text-red-400";
    labelClass = "text-red-100";
    GlowComponent = (
      <div className="absolute inset-0 -m-[1px] rounded-xl border border-red-500/50 animate-pulse opacity-50" />
    );
  } else if (!inReplay) {
    containerClasses = "bg-zinc-950 border-emerald-900/30";
  }

  return (
    <div
      className={`relative p-4 rounded-xl border-2 min-w-[220px] transition-all duration-300 ${containerClasses}`}
    >
      {GlowComponent}
      <Handle type="target" position={Position.Top} className="!bg-zinc-600 !w-2 !h-2 border-none" />

      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800/50">
        <div className={`p-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 ${isRootCause ? 'bg-red-500/10 border-red-500/30' : ''}`}>
          {isRootCause ? (
            <Flame className={`w-5 h-5 ${iconClass} animate-pulse`} />
          ) : (
            <Server className={`w-4 h-4 ${iconClass}`} />
          )}
        </div>
        <div className="flex flex-col">
          <span className={`text-sm tracking-wide ${labelClass}`}>{data.label as string}</span>
          {isRootCause && <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Root Cause</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 font-medium tracking-wide">Error Rate</span>
          <span
            className={`font-mono font-medium ${(data.error_rate as number) > 0.1 ? "text-red-400" : "text-emerald-500/80"}`}
          >
            {((data.error_rate as number) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 font-medium tracking-wide">Latency</span>
          <span
            className={`font-mono font-medium ${(data.avg_latency as number) > 10 ? "text-orange-400" : "text-emerald-500/80"}`}
          >
            {(data.avg_latency as number).toFixed(2)}ms
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !w-2 !h-2 border-none" />
    </div>
  );
};

const nodeTypes = {
  customService: CustomServiceNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } => {
  const nodeWidth = 250;
  const nodeHeight = 150;

  dagreGraph.setGraph({ rankdir: "TB", nodesep: 180, ranksep: 220 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// --- Main Page Component ---
function DashboardContent() {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [isReplaying, setIsReplaying] = useState(false);

  // Auto-Refresh / Polling
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:8008/api/analyze");
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = (await res.json()) as AnalysisResponse;

        setData(prev => {
          if (JSON.stringify(prev) === JSON.stringify(json)) {
            return prev;
          }
          return json;
        });
        setError(null);
      } catch (err: unknown) {
        console.error("Polling error:", err);
        setError("Connection to Hyperion Engine lost. Retrying...");
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Setup ReactFlow hook inside a wrapper or just use layout state flag
  const [layoutComputed, setLayoutComputed] = useState(false);

  // Sync React Flow state with fetched data
  useEffect(() => {
    if (!data || isReplaying) return;

    // Use a functional update to ensure we have the latest nodes state to compare against
    setNodes((existingNodes) => {
      // 1. Map new incoming data into a lookup map for fast merging
      const incomingDataMap = new Map();
      data.graph.nodes.forEach((n) => {
        incomingDataMap.set(n.id, {
          label: n.id,
          anomalous: n.anomalous,
          error_rate: n.error_rate,
          avg_latency: n.avg_latency,
          isRootCause: data.root_cause?.service === n.id,
          inReplay: false,
        });
      });

      // 2. See if this is the first time we're loading nodes, or if topology changed
      const isInitialOrTopologyChange = existingNodes.length === 0 || existingNodes.length !== data.graph.nodes.length;

      // let updatedNodes: Node[];

      if (isInitialOrTopologyChange) {
        // Topology changed / Initial load -> recreate and calculate layout
        const newNodes: Node[] = data.graph.nodes.map((n) => ({
          id: n.id,
          type: "customService",
          position: { x: 0, y: 0 },
          data: incomingDataMap.get(n.id),
        }));

        const newEdges: Edge[] = data.graph.edges.map((e) => ({
          id: `${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: "#52525b", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b" },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);

        // Color the edges immediately
        const finalEdges = layoutedEdges.map((edge) => {
          const sourceNode = layoutedNodes.find((n) => n.id === edge.source);
          if (sourceNode?.data.anomalous) {
            return {
              ...edge,
              style: { stroke: "#f87171", strokeWidth: 3 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#f87171" }
            };
          }
          return edge;
        });

        setEdges(finalEdges);
        setTimeout(() => setLayoutComputed(true), 50);
        return layoutedNodes;
      }

      // ELSE: Topology didn't change -> PRESERVE POSITIONS, ONLY UPDATE DATA
      const updatedNodes = existingNodes.map((existingNode) => {
        const newData = incomingDataMap.get(existingNode.id);
        if (newData) {
          return {
            ...existingNode,
            data: { ...existingNode.data, ...newData },
          };
        }
        return existingNode;
      });

      // Update edges based on the updated nodes anomaly status ONLY IF needed.
      // But since we want the graph entirely stable, we can map over edges to ensure 
      // edge strokes match the current anomaly state without recreating the entire arrays.
      setEdges((existingEdges) => existingEdges.map(edge => {
        const sourceNode = updatedNodes.find(n => n.id === edge.source);
        const isAnom = sourceNode?.data.anomalous;

        // Quick check to avoid recreating edge object if it hasn't changed
        const currentStroke = (edge.style as any)?.stroke;
        const targetStroke = isAnom ? "#f87171" : "#52525b";

        if (currentStroke === targetStroke) return edge;

        return {
          ...edge,
          style: { stroke: targetStroke, strokeWidth: isAnom ? 3 : 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: targetStroke }
        };
      }));

      return updatedNodes;
    });

  }, [data, setEdges, setNodes, isReplaying]);


  // Replay Functionality
  const triggerReplay = useCallback(async () => {
    if (!data || data.status !== "incident") return;
    setIsReplaying(true);

    const timeline = data.incident_timeline || [];

    // Reset all nodes to healthy temporarily
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, anomalous: false, isRootCause: false, inReplay: true },
      }))
    );

    // Simulate temporal propagation
    for (let i = 0; i < timeline.length; i++) {
      await new Promise(r => setTimeout(r, 800)); // Delay between steps

      // Find which service this timeline event corresponds to (simple matching)
      const eventMsg = timeline[i].message;
      const affectedNodeId = data.graph.nodes.find(n => eventMsg.includes(n.id))?.id;

      if (affectedNodeId) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === affectedNodeId) {
              const isRoot = data.root_cause?.service === n.id;
              return {
                ...n,
                data: {
                  ...n.data,
                  anomalous: true,
                  isRootCause: isRoot
                }
              };
            }
            return n;
          })
        );
      }
    }

    await new Promise(r => setTimeout(r, 1500));
    setIsReplaying(false);

  }, [data, setNodes]);


  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans tracking-wide">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <Zap className="w-16 h-16 text-emerald-500 animate-pulse" />
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full animate-ping opacity-20" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
              Hyperion Causal AI
            </h1>
            <p className="text-zinc-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Initializing telemetry stream...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const isIncident = data?.status === "incident";

  const FlowWrapper = () => {
    const { fitView } = useReactFlow();
    const layoutInitializedRef = React.useRef(false);
    const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);

    const onNodeContextMenu = useCallback(
      (event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        setMenu({
          id: node.id,
          top: event.clientY,
          left: event.clientX,
        });
      },
      []
    );

    const onPaneClick = useCallback(() => setMenu(null), []);

    useEffect(() => {
      if (layoutComputed && !layoutInitializedRef.current) {
        layoutInitializedRef.current = true;

        setTimeout(() => {
          fitView({ padding: 0.2 });
        }, 50);
      }
    }, [layoutComputed, fitView]);

    return (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onNodeClick={onPaneClick}
        nodeTypes={nodeTypes}
        className="bg-zinc-950"
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={1.5}
        onlyRenderVisibleElements
      >
        <Background
          color="#18181b"
          gap={24}
          size={1}
        />
        {menu && (
          <div
            style={{ top: menu.top, left: menu.left }}
            className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px] text-zinc-300 text-sm overflow-hidden"
            onMouseLeave={() => setMenu(null)}
          >
            <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/50">
              {menu.id}
            </div>
            <button className="flex items-center w-full px-3 py-2 text-left hover:bg-zinc-800 hover:text-white transition-colors" onClick={() => setMenu(null)}>
              View Logs
            </button>
            <button className="flex items-center w-full px-3 py-2 text-left hover:bg-zinc-800 hover:text-white transition-colors" onClick={() => setMenu(null)}>
              Trace Metrics
            </button>
            <button className="flex items-center w-full px-3 py-2 text-left hover:bg-zinc-800 hover:text-red-400 transition-colors" onClick={() => setMenu(null)}>
              Mute Alerts
            </button>
          </div>
        )}

        {/* Replay Overlay */}
        <AnimatePresence>
          {isReplaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 z-10 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 backdrop-blur-md"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              Replay Active
            </motion.div>
          )}
        </AnimatePresence>
      </ReactFlow>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 font-sans p-6 selection:bg-emerald-500/30">

      {/* Header */}
      <header className="flex justify-between items-center mb-8 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl border border-zinc-700/50 shadow-inner">
            <Activity className="w-6 h-6 text-zinc-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hyperion Causal AI</h1>
        </div>

        <div className="flex items-center gap-4">
          {error && (
            <div className="text-orange-400 text-sm flex items-center gap-2 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {isIncident ? (
            <div className="flex items-center gap-3 px-5 py-2 bg-red-500/10 border border-red-500/30 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <span className="text-red-400 font-bold text-sm tracking-widest uppercase">Active Incident</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              <span className="text-emerald-400 font-bold text-sm tracking-widest uppercase">System Healthy</span>
            </div>
          )}
        </div>
      </header>

      {/* Global Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 max-w-[1800px] mx-auto">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Global Uptime</span>
            <span className="text-zinc-200 font-mono text-xl">99.99%</span>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-500/80" />
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Traces Analyzed (1h)</span>
            <span className="text-zinc-200 font-mono text-xl">2.4M</span>
          </div>
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-cyan-500/80" />
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Active Services</span>
            <span className="text-zinc-200 font-mono text-xl">6</span>
          </div>
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Server className="w-5 h-5 text-purple-500/80" />
          </div>
        </div>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1800px] mx-auto min-h-[75vh]">

        {/* Left Column: Context / RCA Details */}
        <div className="lg:col-span-4 lg:col-start-1 flex flex-col gap-6 ">
          <AnimatePresence mode="popLayout">

            {/* System Healthy View */}
            {!isIncident && (
              <motion.div
                key="healthy-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900/40 border border-emerald-900/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-[500px]"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
                  <ShieldCheck className="relative w-24 h-24 text-emerald-500" />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-3xl font-bold text-white">System Stable</h2>
                  <motion.div
                    className="w-3 h-3 bg-emerald-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                </div>
                <p className="text-zinc-400 mb-8 text-lg">All telemetry signals normal.</p>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-5 py-2.5 rounded-full text-sm font-semibold border border-emerald-500/20">
                  <Server className="w-4 h-4" />
                  Monitoring {data?.graph.nodes.length || 0} services
                </div>
              </motion.div>
            )}

            {/* Incident View */}
            {isIncident && data.root_cause && (
              <motion.div
                key="incident-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-6"
              >
                {/* 1. Root Cause Hero Card */}
                <div className="relative bg-zinc-900 border border-red-500/30 rounded-2xl p-6 overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] pointer-events-none" />

                  <div className="flex flex-col space-y-4 mb-6">
                    <div className="text-red-400 text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                      <Flame className="w-4 h-4" /> Root Cause
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight break-all">
                      {data.root_cause.service}
                    </h2>
                  </div>

                  {/* Confidence Meter */}
                  <div className="mb-6 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Causal Confidence</span>
                      <span className="text-lg font-bold text-red-400">
                        {(data.root_cause.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800/80 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-600 via-red-500 to-orange-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${data.root_cause.confidence * 100}%` }}
                        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Datadog Style Evidence Panel */}
                  <div className="bg-zinc-950/80 rounded-xl p-5 border border-zinc-800">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Evidence Signals</h3>
                    <ul className="space-y-4">
                      {data.evidence?.map((ev, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + (idx * 0.1) }}
                          className="flex items-start gap-3 text-sm text-zinc-300 font-medium"
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-500/80 shrink-0" />
                          {ev}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 2. Timeline & Propagation Panel */}
                <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between mb-6 border-b border-zinc-800/80 pb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Incident Timeline
                    </h3>
                    <button
                      onClick={triggerReplay}
                      disabled={isReplaying}
                      className="flex items-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-xs font-bold tracking-wide transition-colors border border-zinc-700/80 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isReplaying ? "REPLAYING..." : "REPLAY"}
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Causal Chain visualization */}
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-black mb-3 tracking-widest">Propagation Path</p>
                      <div className="flex items-center flex-wrap gap-2 text-sm">
                        {data.causal_chain?.map((svc, idx) => (
                          <React.Fragment key={svc}>
                            <span className={`px-2.5 py-1.5 rounded-md bg-zinc-950 border text-xs font-mono font-bold ${data.root_cause?.service === svc ? 'border-red-500/50 text-red-400' : 'border-zinc-800 text-zinc-400'}`}>
                              {svc}
                            </span>
                            {idx < (data.causal_chain?.length || 0) - 1 && (
                              <ArrowRight className="w-4 h-4 text-zinc-600" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Literal Timeline Events */}
                    <div className="pt-2">
                      <ul className="relative border-l border-zinc-800 ml-[9px] space-y-5">
                        {data.incident_timeline?.map((evt, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + (idx * 0.1) }}
                            className="pl-6 relative"
                          >
                            <div className="absolute w-2.5 h-2.5 bg-zinc-900 border-2 border-red-500 rounded-full -left-[5.5px] top-1" />
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-xs font-mono font-bold text-zinc-500">{evt.timestamp}</span>
                              <span className="text-sm text-zinc-200 font-medium">{evt.message}</span>
                            </div>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Incident History Panel */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden shadow-xl flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/80 pb-4 shrink-0">
              <Clock className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Incident History</h3>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
              <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-800/40 transition-colors cursor-pointer border border-transparent hover:border-zinc-700/50">
                <CheckCircle2 className="w-5 h-5 text-zinc-500 group-hover:text-emerald-500/70 shrink-0 mt-0.5 transition-colors" />
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-300 font-medium group-hover:text-zinc-100 transition-colors">Payment API Latency</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                    <span>11:45 AM</span> • <span>Resolved in 4m</span>
                  </div>
                </div>
              </div>

              <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-800/40 transition-colors cursor-pointer border border-transparent hover:border-zinc-700/50">
                <CheckCircle2 className="w-5 h-5 text-zinc-500 group-hover:text-emerald-500/70 shrink-0 mt-0.5 transition-colors" />
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-300 font-medium group-hover:text-zinc-100 transition-colors">Auth Service Down</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                    <span>09:12 AM</span> • <span>Resolved in 12m</span>
                  </div>
                </div>
              </div>

              <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-800/40 transition-colors cursor-pointer border border-transparent hover:border-zinc-700/50">
                <CheckCircle2 className="w-5 h-5 text-zinc-500 group-hover:text-emerald-500/70 shrink-0 mt-0.5 transition-colors" />
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-300 font-medium group-hover:text-zinc-100 transition-colors">DB Connection Pool Exhaustion</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                    <span>Yesterday</span> • <span>Resolved in 25m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: React Flow Topology */}
        <div className="lg:col-span-8 lg:col-start-5 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-2xl">
          <div className="absolute top-4 left-4 z-10 bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800 text-xs font-bold tracking-widest uppercase text-zinc-400 shadow-md">
            Dependency Topology
          </div>

          <FlowWrapper />

          <div className="absolute bottom-4 right-4 z-10 bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-zinc-800 shadow-md text-xs font-medium text-zinc-400 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
              <span>Root Cause</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span>Anomalous Service</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
              <span>Healthy Service</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ReactFlowProvider>
      <DashboardContent />
    </ReactFlowProvider>
  );
}
