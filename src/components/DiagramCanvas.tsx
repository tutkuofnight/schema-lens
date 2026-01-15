import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDiagramStore } from "@/store/diagramStore";
import { TableNode } from "./TableNode";

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
} as NodeTypes;

function DiagramCanvasInner() {
  const { nodes, edges, setNodes, setEdges, updateNodePosition } =
    useDiagramStore();
  const { fitView } = useReactFlow();
  const prevNodeCount = useRef(nodes.length);

  // Fit view when node count changes
  useEffect(() => {
    if (nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = nodes.length;
      // Small timeout to allow React Flow to process new nodes
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply changes and update store
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);

      // Also update positions in store for drag operations
      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [nodes, setNodes, updateNodePosition]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      setEdges(updatedEdges);
    },
    [edges, setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      panOnScroll={false}
      selectionOnDrag={false}
      panActivationKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      deleteKeyCode={null}
      defaultEdgeOptions={{
        type: "smoothstep",
        animated: true,
        style: { stroke: "#58a6ff", strokeWidth: 2 },
      }}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="#30363d"
      />
      <Controls
        className="!bg-bg-surface !border-border-default !rounded-lg !shadow-lg"
        showZoom
        showFitView
        showInteractive
      />
      <MiniMap
        className="!bg-bg-surface !border-border-default !rounded-lg"
        nodeColor={() => "#238636"}
        maskColor="rgba(13, 17, 23, 0.8)"
      />
    </ReactFlow>
  );
}

export function DiagramCanvas() {
  return (
    <div className="w-full h-full bg-bg-primary">
      <ReactFlowProvider>
        <DiagramCanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
