import { HopInfo } from '../types/message';

interface MeshGraphProps {
  messagePath: HopInfo[];
  keyPath?: HopInfo[];
  title?: string;
}

export function MeshGraph({ messagePath, keyPath, title }: MeshGraphProps) {
  const allNodes = new Set<string>();
  messagePath.forEach((hop) => allNodes.add(hop.nodeId));
  keyPath?.forEach((hop) => allNodes.add(hop.nodeId));

  const nodes = Array.from(allNodes);
  const nodeCount = nodes.length;
  const radius = Math.max(150, nodeCount * 40);
  const centerX = 200;
  const centerY = 150;

  const getNodePosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  const nodePositions = nodes.reduce((acc, node, idx) => {
    acc[node] = getNodePosition(idx, nodeCount);
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  return (
    <div className="w-full h-64 bg-gray-50 rounded-lg border border-gray-200 p-4 overflow-auto">
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      )}
      <svg width="100%" height="100%" viewBox="0 0 400 300" className="overflow-visible">
        {/* Message path (blue) */}
        {messagePath.length > 1 &&
          messagePath.slice(1).map((hop, idx) => {
            const from = messagePath[idx];
            const to = hop;
            const fromPos = nodePositions[from.nodeId];
            const toPos = nodePositions[to.nodeId];
            if (!fromPos || !toPos) return null;
            return (
              <line
                key={`msg-${idx}`}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="#3b82f6"
                strokeWidth="2"
                markerEnd="url(#arrow-blue)"
              />
            );
          })}

        {/* Key path (green) */}
        {keyPath &&
          keyPath.length > 1 &&
          keyPath.slice(1).map((hop, idx) => {
            const from = keyPath[idx];
            const to = hop;
            const fromPos = nodePositions[from.nodeId];
            const toPos = nodePositions[to.nodeId];
            if (!fromPos || !toPos) return null;
            return (
              <line
                key={`key-${idx}`}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4,4"
                markerEnd="url(#arrow-green)"
              />
            );
          })}

        {/* Arrow markers */}
        <defs>
          <marker
            id="arrow-blue"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
          </marker>
          <marker
            id="arrow-green"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
          </marker>
        </defs>

        {/* Nodes */}
        {nodes.map((node, idx) => {
          const pos = nodePositions[node];
          const isInMessagePath = messagePath.some((h) => h.nodeId === node);
          const isInKeyPath = keyPath?.some((h) => h.nodeId === node);
          const isAdmin = idx === 0 && keyPath; // First node if it's an E2E graph

          return (
            <g key={node}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isAdmin ? 12 : 8}
                fill={
                  isAdmin
                    ? '#f59e0b'
                    : isInKeyPath && isInMessagePath
                    ? '#8b5cf6'
                    : isInKeyPath
                    ? '#10b981'
                    : '#3b82f6'
                }
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={pos.x}
                y={pos.y + 25}
                textAnchor="middle"
                fontSize="10"
                fill="#374151"
                className="font-mono"
              >
                {node.substring(0, 6)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Message Path</span>
        </div>
        {keyPath && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-dashed"></div>
              <span>Key Path</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>Admin Node</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

