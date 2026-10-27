import React from 'react';
import { ResourceGraphNode, ResourceGraphEdge, CoffmanState } from '../types';
import { Lock, ShieldAlert, CheckCircle, AlertOctagon } from 'lucide-react';
import { STATUS_COLORS } from '../utils/colors';

interface DeadlockGraphProps {
  nodes: ResourceGraphNode[];
  edges: ResourceGraphEdge[];
  coffman: CoffmanState;
  cycleDetected: boolean;
  cycleNodes: string[];
}

export const DeadlockGraph: React.FC<DeadlockGraphProps> = ({
  nodes,
  edges,
  coffman,
  cycleDetected,
  cycleNodes,
}) => {
  // Pre-calculated layout coordinates for up to 5 tasks and 5 resources
  const taskCoords: Record<string, { x: number; y: number }> = {
    T1: { x: 120, y: 70 },
    T2: { x: 380, y: 70 },
    T3: { x: 250, y: 20 },
    T4: { x: 80, y: 150 },
    T5: { x: 420, y: 150 },
  };

  const resourceCoords: Record<string, { x: number; y: number }> = {
    R1: { x: 120, y: 190 },
    R2: { x: 380, y: 190 },
    R3: { x: 250, y: 240 },
    R4: { x: 80, y: 90 },
    R5: { x: 420, y: 90 },
  };

  return (
    <div className="space-y-4">
      {/* SVG Resource Allocation Graph */}
      <div className="bg-card border border-border rounded p-4">
        <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-heading" />
            <h4 className="text-sm font-semibold text-heading">
              Resource Allocation Graph (RAG)
            </h4>
          </div>
          {cycleDetected ? (
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-critical/15 text-critical border border-critical/30 text-xs font-mono font-semibold">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>DEADLOCK CYCLE DETECTED</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#14532D]/10 text-primary border border-primary/20 text-xs font-mono font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>ACYCLIC / SAFE</span>
            </span>
          )}
        </div>

        <div className="flex justify-center bg-paper border border-border rounded p-2 overflow-x-auto">
          <svg width={500} height={270} className="select-none">
            <defs>
              <marker
                id="arrow-owns"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#14532D" />
              </marker>
              <marker
                id="arrow-waits"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#B8860B" />
              </marker>
              <marker
                id="arrow-cycle"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#B42318" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map((edge, idx) => {
              const srcPt = taskCoords[edge.source] || resourceCoords[edge.source] || { x: 50, y: 50 };
              const dstPt = taskCoords[edge.target] || resourceCoords[edge.target] || { x: 100, y: 100 };
              const isCycleEdge = edge.is_cycle || (cycleNodes.includes(edge.source) && cycleNodes.includes(edge.target));

              const strokeColor = isCycleEdge
                ? STATUS_COLORS.critical
                : edge.type === 'owns'
                ? '#14532D'
                : '#B8860B';

              const markerId = isCycleEdge
                ? 'url(#arrow-cycle)'
                : edge.type === 'owns'
                ? 'url(#arrow-owns)'
                : 'url(#arrow-waits)';

              return (
                <g key={idx}>
                  <line
                    x1={srcPt.x}
                    y1={srcPt.y}
                    x2={dstPt.x}
                    y2={dstPt.y}
                    stroke={strokeColor}
                    strokeWidth={isCycleEdge ? 2.5 : 1.5}
                    strokeDasharray={edge.type === 'waits_for' && !isCycleEdge ? '4,4' : undefined}
                    markerEnd={markerId}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isTask = node.type === 'task';
              const pt = (isTask ? taskCoords[node.id] : resourceCoords[node.id]) || { x: 200, y: 100 };
              const isInCycle = cycleNodes.includes(node.id);

              return (
                <g key={node.id} transform={`translate(${pt.x}, ${pt.y})`}>
                  {isTask ? (
                    // Task: Circle
                    <circle
                      r={18}
                      fill={isInCycle ? '#FEE4E2' : '#FFFFFF'}
                      stroke={isInCycle ? STATUS_COLORS.critical : '#18352A'}
                      strokeWidth={isInCycle ? 2 : 1.5}
                    />
                  ) : (
                    // Resource: Square/Box
                    <rect
                      x={-16}
                      y={-16}
                      width={32}
                      height={32}
                      rx={3}
                      fill={isInCycle ? '#FEF0C7' : '#EDE4D3'}
                      stroke={isInCycle ? STATUS_COLORS.warning : '#686B63'}
                      strokeWidth={isInCycle ? 2 : 1.5}
                    />
                  )}
                  <text
                    textAnchor="middle"
                    dy=".3em"
                    fontSize={11}
                    fontFamily="IBM Plex Mono"
                    fontWeight="600"
                    fill="#18352A"
                  >
                    {node.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono mt-3 px-1">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span className="w-3.5 h-3.5 rounded-full border border-heading bg-card" />
              <span className="text-secondary">Task Node (Thread)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3.5 h-3.5 rounded-sm border border-secondary bg-panel" />
              <span className="text-secondary">Resource (Lock)</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span className="w-4 h-0.5 bg-[#14532D]" />
              <span className="text-secondary">Task Owns Lock</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-4 h-0.5 border-b border-dashed border-[#B8860B]" />
              <span className="text-secondary">Task Waiting for Lock</span>
            </span>
          </div>
        </div>
      </div>

      {/* Coffman Conditions Panel */}
      <div className="bg-card border border-border rounded p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-heading" />
            <h4 className="text-sm font-semibold text-heading">
              Live Coffman Conditions State
            </h4>
          </div>
          <span className="text-[11px] font-mono text-secondary">
            All 4 must hold for deadlock
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
          {/* Condition 1 */}
          <div className="p-2.5 rounded border border-border bg-paper">
            <div className="text-secondary uppercase text-[10px]">1. Mutual Exclusion</div>
            <div className="text-heading font-semibold mt-1 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-critical" />
              <span>YES (Active)</span>
            </div>
            <div className="text-[11px] text-secondary mt-1">Resources are non-shareable mutex locks.</div>
          </div>

          {/* Condition 2 */}
          <div className="p-2.5 rounded border border-border bg-paper">
            <div className="text-secondary uppercase text-[10px]">2. Hold and Wait</div>
            <div className="text-heading font-semibold mt-1 flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${coffman.hold_and_wait ? 'bg-critical' : 'bg-primary'}`} />
              <span>{coffman.hold_and_wait ? 'YES (Active)' : 'BROKEN'}</span>
            </div>
            <div className="text-[11px] text-secondary mt-1">
              {coffman.hold_and_wait ? 'Tasks hold one lock while requesting another.' : 'Lock ordering prevents hold-and-wait.'}
            </div>
          </div>

          {/* Condition 3 */}
          <div className="p-2.5 rounded border border-border bg-paper">
            <div className="text-secondary uppercase text-[10px]">3. No Preemption</div>
            <div className="text-heading font-semibold mt-1 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-critical" />
              <span>YES (Active)</span>
            </div>
            <div className="text-[11px] text-secondary mt-1">Locks cannot be forcibly seized by the OS.</div>
          </div>

          {/* Condition 4 */}
          <div className="p-2.5 rounded border border-border bg-paper">
            <div className="text-secondary uppercase text-[10px]">4. Circular Wait</div>
            <div className="text-heading font-semibold mt-1 flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${coffman.circular_wait ? 'bg-critical' : 'bg-primary'}`} />
              <span>{coffman.circular_wait ? 'YES (Cycle)' : 'NO (Acyclic)'}</span>
            </div>
            <div className="text-[11px] text-secondary mt-1">
              {coffman.circular_wait ? 'Closed loop of waiting tasks detected.' : 'No cyclic wait-for dependency.'}
            </div>
          </div>
        </div>

        <div className="bg-panel p-2.5 rounded text-xs text-heading leading-relaxed">
          {coffman.explanation}
        </div>
      </div>
    </div>
  );
};
