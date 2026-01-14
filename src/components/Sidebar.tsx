import { useDiagramStore } from "@/store/diagramStore";
import {
  Database,
  FileCode,
  Code2,
  PanelLeftClose,
  PanelLeft,
  Github,
} from "lucide-react";
import type { SchemaFormat, Table, Column } from "@/types/schema";

const formatOptions: {
  value: SchemaFormat;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "drizzle",
    label: "Drizzle",
    icon: <FileCode className="w-4 h-4" />,
  },
  { value: "prisma", label: "Prisma", icon: <Database className="w-4 h-4" /> },
  { value: "sql", label: "SQL", icon: <Code2 className="w-4 h-4" /> },
];

export function Sidebar() {
  const { format, loadSample, sidebarOpen, toggleSidebar, schema } =
    useDiagramStore();

  return (
    <>
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-bg-surface border border-border-default rounded-lg hover:bg-bg-elevated transition-colors"
        >
          <PanelLeft className="w-5 h-5 text-text-secondary" />
        </button>
      )}

      <aside
        className={`h-full bg-bg-surface border-r border-border-default flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-80" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4 border-b border-border-default flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='86'>🗃️</text></svg>" />
            </div>
            <div>
              <h1 className="font-bold text-text-primary text-lg">
                SchemaLens
              </h1>
              <p className="text-xs text-text-secondary">
                DB Schema Visualizer
              </p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <PanelLeftClose className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-4 border-b border-border-default">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
            Load Sample Schema
          </label>
          <div className="grid grid-cols-3 gap-2">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  loadSample(option.value as "drizzle" | "prisma" | "sql")
                }
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all duration-200 ${
                  format === option.value
                    ? "bg-bg-elevated border-accent-blue text-accent-blue"
                    : "border-border-default text-text-secondary hover:bg-bg-elevated hover:border-text-secondary"
                }`}
              >
                {option.icon}
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="p-4 border-b border-border-default">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3 block">
            Schema Stats
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-primary rounded-lg p-3 border border-border-default">
              <div className="text-2xl font-bold text-accent-blue">
                {schema.tables.length}
              </div>
              <div className="text-xs text-text-secondary">Tables</div>
            </div>
            <div className="bg-bg-primary rounded-lg p-3 border border-border-default">
              <div className="text-2xl font-bold text-accent-orange">
                {schema.relations.length}
              </div>
              <div className="text-xs text-text-secondary">Relations</div>
            </div>
            <div className="bg-bg-primary rounded-lg p-3 border border-border-default">
              <div className="text-2xl font-bold text-accent-purple">
                {schema.tables.reduce(
                  (acc: number, t: Table) =>
                    acc +
                    t.columns.filter((c: Column) => c.isPrimaryKey).length,
                  0
                )}
              </div>
              <div className="text-xs text-text-secondary">Primary Keys</div>
            </div>
            <div className="bg-bg-primary rounded-lg p-3 border border-border-default">
              <div className="text-2xl font-bold text-success">
                {schema.tables.reduce(
                  (acc: number, t: Table) => acc + t.columns.length,
                  0
                )}
              </div>
              <div className="text-xs text-text-secondary">Columns</div>
            </div>
          </div>
        </section>

        <nav className="flex-1 overflow-y-auto p-4">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3 block">
            Tables
          </label>
          <div className="space-y-2">
            {schema.tables.map((table: Table) => (
              <div
                key={table.name}
                className="bg-bg-primary rounded-lg p-3 border border-border-default hover:border-accent-blue transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-primary text-sm">
                    {table.name}
                  </span>
                  <span className="text-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                    {table.columns.length} cols
                  </span>
                </div>
              </div>
            ))}
          </div>
        </nav>

        <section className="p-4 border-t border-border-default">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-text-secondary transition-colors"
            >
              <Github className="w-4 h-4" />
              View Source
            </a>
            <span>v1.0.0</span>
          </div>
        </section>
      </aside>
    </>
  );
}
