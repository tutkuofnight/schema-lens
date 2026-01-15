import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type {
  ParsedSchema,
  SchemaFormat,
  Table,
  Relation,
} from "@/types/schema";
import { parseSchema, detectSchemaFormat } from "@/lib/parser";
import { drizzleSchema, prismaSchema, sqlSchema } from "@/schemas";

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
      return drizzleSchema;
    case "prisma":
      return prismaSchema;
    case "sql":
      return sqlSchema;
    default:
      return drizzleSchema;
  }
};

// Convert parsed schema to React Flow nodes and edges
function schemaToFlow(schema: ParsedSchema): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  console.log(
    `[schemaToFlow] Converting ${schema.tables.length} tables to nodes`
  );

  // Calculate positions in a grid layout
  const cols = Math.ceil(Math.sqrt(schema.tables.length)) || 1;
  const nodeWidth = 280;
  const nodeHeight = 200;
  const gapX = 100;
  const gapY = 80;

  schema.tables.forEach((table: Table, index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    console.log(
      `[schemaToFlow] Creating node for table: ${table.name} at position (${col}, ${row})`
    );

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

  console.log(
    `[schemaToFlow] Created ${nodes.length} nodes and ${edges.length} edges`
  );
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

    console.log(
      `[parseCode] Parsed schema has ${schema.tables.length} tables:`,
      schema.tables.map((t) => t.name)
    );

    // Convert schema to flow but preserve positions
    const { nodes: newNodes, edges } = schemaToFlow(schema);

    console.log(
      `[parseCode] New nodes:`,
      newNodes.map((n) => n.id)
    );
    console.log(
      `[parseCode] Existing nodes:`,
      existingNodes.map((n) => n.id)
    );

    // Collect preserved positions from existing nodes
    const preservedPositions: Map<string, { x: number; y: number }> = new Map();

    // First pass: preserve positions of existing nodes
    const mergedNodes = newNodes.map((newNode) => {
      const existingNode = existingNodes.find((n) => n.id === newNode.id);
      if (existingNode) {
        preservedPositions.set(newNode.id, existingNode.position);
        return {
          ...newNode,
          position: existingNode.position,
        };
      }
      return newNode;
    });

    // Second pass: check for overlapping positions and fix them
    const usedPositions = new Set<string>();
    const finalNodes = mergedNodes.map((node) => {
      const posKey = `${node.position.x},${node.position.y}`;

      if (usedPositions.has(posKey)) {
        // This position is already taken, find a new one
        console.log(
          `[parseCode] Position conflict for ${node.id} at (${node.position.x}, ${node.position.y}), finding new position`
        );

        // Find a free position
        let newX = node.position.x;
        let newY = node.position.y;
        let attempts = 0;
        const nodeWidth = 280;
        const nodeHeight = 200;
        const gapX = 100;
        const gapY = 80;

        while (usedPositions.has(`${newX},${newY}`) && attempts < 100) {
          // Try next column
          newX += nodeWidth + gapX;
          // If we've gone too far right, start a new row
          if (attempts % 5 === 4) {
            newX = 50;
            newY += nodeHeight + gapY;
          }
          attempts++;
        }

        console.log(
          `[parseCode] New position for ${node.id}: (${newX}, ${newY})`
        );
        usedPositions.add(`${newX},${newY}`);
        return { ...node, position: { x: newX, y: newY } };
      }

      usedPositions.add(posKey);
      return node;
    });

    console.log(
      `[parseCode] Final nodes:`,
      finalNodes.map((n) => `${n.id} at (${n.position.x}, ${n.position.y})`)
    );

    set({ schema, nodes: finalNodes, edges });
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
