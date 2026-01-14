import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDiagramStore } from "@/store/diagramStore";
import { TableNode } from "./TableNode";

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
} as NodeTypes;

export function DiagramCanvas() {
  const { nodes: storeNodes, edges: storeEdges } = useDiagramStore();

  const [, , onNodesChange] = useNodesState(storeNodes);
  const [, , onEdgesChange] = useEdgesState(storeEdges);

  // Sync nodes with store
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Update store on drag end
      changes.forEach((change) => {
        if (change.type === "position" && change.position) {
          useDiagramStore
            .getState()
            .updateNodePosition(change.id, change.position);
        }
      });
    },
    [onNodesChange]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  return (
    <div className="w-full h-full bg-bg-primary">
      <ReactFlow
        nodes={storeNodes}
        edges={storeEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
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
    </div>
  );
}
