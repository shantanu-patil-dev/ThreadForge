import React, { useState, useMemo, useRef } from 'react';
import { TraceEvent } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Download, Table, Layers, Filter, Eye } from 'lucide-react';
import { CHART_PALETTE, STATUS_COLORS } from '../utils/colors';

interface ThreadTimelineProps {
  traces: TraceEvent[];
  runId: string;
  isSimulation?: boolean;
}

export const ThreadTimeline: React.FC<ThreadTimelineProps> = ({
  traces,
  runId,
  isSimulation = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isTableView, setIsTableView] = useState(false);
  const [highlightCriticalPath, setHighlightCriticalPath] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Derive workers and temporal bounds
  const { workers, minTimeNs, maxTimeNs, durationNs, lanes } = useMemo(() => {
    if (!traces || traces.length === 0) {
      return { workers: [], minTimeNs: 0, maxTimeNs: 1, durationNs: 1, lanes: {} };
    }
    const workerSet = new Set<string>();
    let minT = Infinity;
    let maxT = -Infinity;

    traces.forEach((t) => {
      workerSet.add(t.worker_id);
      if (t.t_ns < minT) minT = t.t_ns;
      const endT = t.t_ns + (t.duration_ns || 0);
      if (endT > maxT) maxT = endT;
    });

    const wList = Array.from(workerSet).sort();
    const laneMap: Record<string, number> = {};
    wList.forEach((w, idx) => {
      laneMap[w] = idx;
    });

    return {
      workers: wList,
      minTimeNs: minT,
      maxTimeNs: maxT,
      durationNs: Math.max(1, maxT - minT),
      lanes: laneMap,
    };
  }, [traces]);

  // Filter traces
  const filteredTraces = useMemo(() => {
    return traces.filter((t) => {
      if (selectedWorker && t.worker_id !== selectedWorker) return false;
      if (statusFilter !== 'all' && t.kind !== statusFilter) return false;
      return true;
    });
  }, [traces, selectedWorker, statusFilter]);

  // Selected task inspector info
  const taskInspector = useMemo(() => {
    if (selectedTask === null) return null;
    const taskEvents = traces.filter((t) => t.task_id === selectedTask);
    const startEv = taskEvents.find((e) => e.kind === 'started');
    const finishEv = taskEvents.find((e) => e.kind === 'finished');
    const waitingEv = taskEvents.find((e) => e.kind === 'waiting');
    const acquiredEv = taskEvents.find((e) => e.kind === 'acquired');

    let totalDurationMs = 0;
    if (startEv && finishEv) {
      totalDurationMs = (finishEv.t_ns - startEv.t_ns) / 1_000_000;
    }
    let waitDurationMs = 0;
    if (waitingEv && acquiredEv) {
      waitDurationMs = (acquiredEv.t_ns - waitingEv.t_ns) / 1_000_000;
    }

    return {
      taskId: selectedTask,
      events: taskEvents,
      workerId: taskEvents[0]?.worker_id || 'unknown',
      totalDurationMs: totalDurationMs.toFixed(3),
      waitDurationMs: waitDurationMs.toFixed(3),
    };
  }, [traces, selectedTask]);

  // Chart dimensions
  const laneHeight = 36;
  const headerHeight = 30;
  const chartHeight = Math.max(160, workers.length * laneHeight + headerHeight);
  const chartWidth = 760;

  const getEventColor = (kind: string) => {
    switch (kind) {
      case 'started':
      case 'finished':
        return CHART_PALETTE[0]; // Forest green
      case 'waiting':
        return CHART_PALETTE[2]; // Ochre
      case 'acquired':
      case 'released':
        return CHART_PALETTE[1]; // Olive
      case 'failed':
        return STATUS_COLORS.critical;
      case 'cancelled':
        return STATUS_COLORS.warning;
      case 'queued':
        return CHART_PALETTE[7]; // Sand
      default:
        return CHART_PALETTE[5]; // Sage
    }
  };

  const exportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thread_timeline_${runId}.svg`;
    a.click();
  };

  if (traces.length === 0) {
    return (
      <div className="bg-card border border-border rounded p-8 text-center text-xs font-mono text-secondary">
        No trace events recorded for this run. Run an experiment to stream real timeline execution data.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded p-4 space-y-3">
      {/* Timeline Controls & Tags */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          {isSimulation ? (
            <span className="px-2 py-0.5 rounded bg-warning/15 text-warning border border-warning/30 text-[11px] font-mono font-semibold">
              SIMULATION MODEL
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-[#14532D]/10 text-primary border border-primary/20 text-[11px] font-mono font-semibold">
              REAL TRACE: {runId}
            </span>
          )}
          <span className="text-xs font-mono text-secondary">
            {durationNs > 0 ? `${(durationNs / 1_000_000).toFixed(2)} ms total` : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {/* Zoom & Pan Controls */}
          <div className="flex items-center border border-border rounded overflow-hidden">
            <button
              onClick={() => setZoom((z) => Math.min(5, z + 0.5))}
              className="px-2 py-1 hover:bg-panel border-r border-border"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5 text-heading" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              className="px-2 py-1 hover:bg-panel border-r border-border"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5 text-heading" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPanX(0);
              }}
              className="px-2 py-1 hover:bg-panel"
              title="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5 text-heading" />
            </button>
          </div>

          {/* Table View Toggle */}
          <button
            onClick={() => setIsTableView(!isTableView)}
            className={`flex items-center space-x-1 px-2.5 py-1 border rounded transition-colors ${
              isTableView ? 'bg-panel font-semibold' : 'hover:bg-panel'
            }`}
            title="Toggle table view"
          >
            <Table className="w-3.5 h-3.5 text-heading" />
            <span>{isTableView ? 'Gantt' : 'Table'}</span>
          </button>

          {/* Export SVG */}
          <button
            onClick={exportSvg}
            className="flex items-center space-x-1 px-2.5 py-1 border border-border rounded hover:bg-panel transition-colors"
            title="Export timeline as SVG"
          >
            <Download className="w-3.5 h-3.5 text-heading" />
            <span className="hidden sm:inline">SVG</span>
          </button>
        </div>
      </div>

      {/* Legend & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono pt-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-sm bg-[#14532D]" />
            <span className="text-secondary">Running</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-sm bg-[#B8860B]" />
            <span className="text-secondary">Waiting</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-sm bg-[#5E6E1E]" />
            <span className="text-secondary">Lock Held</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-sm bg-[#8C7355]" />
            <span className="text-secondary">Queued</span>
          </span>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1">
          <Filter className="w-3.5 h-3.5 text-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-paper border border-border rounded px-1.5 py-0.5 text-xs text-heading"
          >
            <option value="all">All Events</option>
            <option value="started">Started</option>
            <option value="waiting">Waiting</option>
            <option value="acquired">Acquired</option>
            <option value="finished">Finished</option>
          </select>
        </div>
      </div>

      {/* SVG Gantt Chart */}
      {!isTableView ? (
        <div className="overflow-x-auto border border-border rounded bg-paper">
          <svg
            ref={svgRef}
            width={chartWidth * zoom}
            height={chartHeight}
            className="w-full select-none"
            aria-label="Worker timeline Gantt chart"
          >
            {/* Grid & Headers */}
            <g>
              <rect x={0} y={0} width={chartWidth * zoom} height={headerHeight} fill="#EDE4D3" />
              <text x={12} y={20} fill="#18352A" fontSize={11} fontFamily="IBM Plex Mono" fontWeight="600">
                Worker Lane
              </text>
              <text x={chartWidth * zoom - 80} y={20} fill="#18352A" fontSize={11} fontFamily="IBM Plex Mono">
                Time (ms)
              </text>
            </g>

            {/* Worker Lanes */}
            {workers.map((w, idx) => {
              const y = headerHeight + idx * laneHeight;
              return (
                <g key={w}>
                  <rect
                    x={0}
                    y={y}
                    width={chartWidth * zoom}
                    height={laneHeight}
                    fill={idx % 2 === 0 ? '#FFFFFF' : '#FAF9F6'}
                    stroke="#DED8CC"
                    strokeWidth={0.5}
                  />
                  <text
                    x={12}
                    y={y + 22}
                    fill="#18352A"
                    fontSize={11}
                    fontFamily="IBM Plex Mono"
                    fontWeight="500"
                  >
                    {w}
                  </text>
                </g>
              );
            })}

            {/* Trace Event Bars */}
            <g transform={`translate(${120}, 0)`}>
              {filteredTraces.map((t, idx) => {
                const laneIdx = lanes[t.worker_id] ?? 0;
                const y = headerHeight + laneIdx * laneHeight + 8;
                const relativeT = t.t_ns - minTimeNs;
                const usableWidth = (chartWidth * zoom) - 160;
                const x = (relativeT / durationNs) * usableWidth;
                const barWidth = Math.max(4, ((t.duration_ns || 500_000) / durationNs) * usableWidth);
                const isSelected = selectedTask === t.task_id;

                return (
                  <g
                    key={idx}
                    onClick={() => setSelectedTask(t.task_id)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={20}
                      fill={getEventColor(t.kind)}
                      stroke={isSelected ? '#14532D' : '#DED8CC'}
                      strokeWidth={isSelected ? 2 : 0.5}
                      rx={3}
                      opacity={isSelected ? 1 : 0.85}
                    />
                    <title>
                      {`Task: ${t.task_id}\nWorker: ${t.worker_id}\nKind: ${t.kind}\nTime: ${(t.t_ns / 1_000_000).toFixed(2)} ms`}
                    </title>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto max-h-64 border border-border rounded text-xs font-mono">
          <table className="w-full text-left border-collapse">
            <thead className="bg-panel sticky top-0 border-b border-border text-heading font-semibold">
              <tr>
                <th className="p-2">Task</th>
                <th className="p-2">Worker</th>
                <th className="p-2">Event</th>
                <th className="p-2">Time (ms)</th>
                <th className="p-2">Duration</th>
                <th className="p-2">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {filteredTraces.map((t, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedTask(t.task_id)}
                  className={`hover:bg-panel/40 cursor-pointer ${
                    selectedTask === t.task_id ? 'bg-panel font-medium' : ''
                  }`}
                >
                  <td className="p-2">{t.task_id}</td>
                  <td className="p-2">{t.worker_id}</td>
                  <td className="p-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] text-white font-semibold uppercase"
                      style={{ backgroundColor: getEventColor(t.kind) }}
                    >
                      {t.kind}
                    </span>
                  </td>
                  <td className="p-2 tabular-nums">{(t.t_ns / 1_000_000).toFixed(3)}</td>
                  <td className="p-2 tabular-nums">
                    {t.duration_ns ? `${(t.duration_ns / 1_000_000).toFixed(3)} ms` : '-'}
                  </td>
                  <td className="p-2 text-secondary">{t.meta ? JSON.stringify(t.meta) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Inspector Panel */}
      {taskInspector && (
        <div className="bg-paper border border-border rounded p-3 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between border-b border-border/70 pb-1.5">
            <span className="font-semibold text-heading">
              Task #{taskInspector.taskId} Inspector
            </span>
            <button
              onClick={() => setSelectedTask(null)}
              className="text-secondary hover:text-heading"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-secondary text-[10px] uppercase block">Assigned Worker</span>
              <span className="text-heading font-semibold">{taskInspector.workerId}</span>
            </div>
            <div>
              <span className="text-secondary text-[10px] uppercase block">Execution Time</span>
              <span className="text-heading font-semibold">{taskInspector.totalDurationMs} ms</span>
            </div>
            <div>
              <span className="text-secondary text-[10px] uppercase block">Lock Wait Time</span>
              <span className="text-heading font-semibold">{taskInspector.waitDurationMs} ms</span>
            </div>
            <div>
              <span className="text-secondary text-[10px] uppercase block">Event Count</span>
              <span className="text-heading font-semibold">{taskInspector.events.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
