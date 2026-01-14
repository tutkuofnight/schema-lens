import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type {
  ParsedSchema,
  SchemaFormat,
  Table,
  Relation,
} from "@/types/schema";
import { parseSchema, detectSchemaFormat } from "@/lib/parser";
import { drizzleSchema, prismaSchema, sqlSchema } from "@/schemas"

interface DiagramState {
  // Code Editor
  code: string;
  format: SchemaFormat;

  // Parsed Data
  schema: ParsedSchema;

  // React Flow
  nodes: Node[];
  edges: Edge[];

  // UI State
  sidebarOpen: boolean;
  selectedTable: string | null;

  // Actions
  setCode: (code: string) => void;
  setFormat: (format: SchemaFormat) => void;
  parseCode: () => void;
  loadSample: (format: "drizzle" | "prisma" | "sql") => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number }
  ) => void;
  toggleSidebar: () => void;
  setSelectedTable: (tableName: string | null) => void;
}

const sampleSchemaByFormat = (format: SchemaFormat) => {
  switch (format) {
    case "drizzle":
      return drizzleSchema
    case "prisma":
      return prismaSchema
    case "sql":
      return sqlSchema
    default:
      return drizzleSchema
  }
}

// Convert parsed schema to React Flow nodes and edges
function schemaToFlow(schema: ParsedSchema): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Calculate positions in a grid layout
  const cols = Math.ceil(Math.sqrt(schema.tables.length));
  const nodeWidth = 280;
  const nodeHeight = 200;
  const gapX = 100;
  const gapY = 80;

  schema.tables.forEach((table: Table, index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    nodes.push({
      id: table.name,
      type: "tableNode",
      position: {
        x: col * (nodeWidth + gapX) + 50,
        y: row * (nodeHeight + gapY) + 50,
      },
      data: { table },
    });
  });

  // Create edges for relations
  schema.relations.forEach((relation: Relation) => {
    edges.push({
      id: relation.id,
      source: relation.targetTable,
      target: relation.sourceTable,
      sourceHandle: `${relation.targetTable}-${relation.targetColumn}`,
      targetHandle: `${relation.sourceTable}-${relation.sourceColumn}`,
      type: "smoothstep",
      animated: true,
      style: {
        stroke: "#58a6ff",
        strokeWidth: 2,
      },
      labelStyle: { fill: "#e6edf3", fontWeight: 700 },
      labelBgStyle: { fill: "#21262d", fillOpacity: 0.8 },
    });
  });

  return { nodes, edges };
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  // Initial State
  code: drizzleSchema,
  format: "drizzle",
  schema: { tables: [], relations: [] },
  nodes: [],
  edges: [],
  sidebarOpen: true,
  selectedTable: null,

  // Actions
  setCode: (code) => {
    const detectedFormat = detectSchemaFormat(code);
    set({
      code,
      format: detectedFormat !== "auto" ? detectedFormat : get().format,
    });
  },

  setFormat: (format) => set({ format }),

  parseCode: () => {
    const { code, format, nodes: existingNodes } = get();
    const schema = parseSchema(code, format);

    // Convert schema to flow but preserve positions
    const { nodes: newNodes, edges } = schemaToFlow(schema);

    // Merge positions
    const mergedNodes = newNodes.map((newNode) => {
      const existingNode = existingNodes.find((n) => n.id === newNode.id);
      if (existingNode) {
        return {
          ...newNode,
          position: existingNode.position,
        };
      }
      return newNode;
    });

    set({ schema, nodes: mergedNodes, edges });
  },

  loadSample: (format) => {
    const code = sampleSchemaByFormat(format);
    set({ code, format });
    // Parse immediately after loading
    const schema = parseSchema(code, format);
    const { nodes, edges } = schemaToFlow(schema);
    set({ schema, nodes, edges });
  },

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  updateNodePosition: (nodeId, position) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      ),
    }));
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSelectedTable: (tableName) => set({ selectedTable: tableName }),
}));

// Initialize with sample data
useDiagramStore.getState().parseCode();
