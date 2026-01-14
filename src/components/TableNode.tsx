import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Key, Link, Fingerprint, Hash } from "lucide-react";
import type { Table, Column } from "@/types/schema";

interface TableNodeData extends Record<string, unknown> {
  table: Table;
}

const ColumnRow = memo(
  ({ column, tableName }: { column: Column; tableName: string }) => {
    return (
      <div className="group flex items-center justify-between px-3 py-1.5 hover:bg-bg-elevated transition-colors relative">
        <Handle
          type="target"
          position={Position.Left}
          id={`${tableName}-${column.name}`}
          className="!w-2 !h-2 !bg-accent-blue !border-none !-left-1 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {column.isPrimaryKey && (
              <Key className="w-3 h-3 text-accent-purple" />
            )}
            {column.isForeignKey && (
              <Link className="w-3 h-3 text-accent-orange" />
            )}
            {column.isUnique && !column.isPrimaryKey && (
              <Fingerprint className="w-3 h-3 text-accent-blue" />
            )}
            {!column.isPrimaryKey &&
              !column.isForeignKey &&
              !column.isUnique && <Hash className="w-3 h-3 text-text-muted" />}
          </div>

          <span
            className={`text-sm truncate ${
              column.isPrimaryKey
                ? "text-accent-purple font-medium"
                : column.isForeignKey
                ? "text-accent-orange"
                : "text-text-primary"
            }`}
          >
            {column.name}
          </span>
        </div>

        <span className="text-xs text-text-secondary ml-2 flex-shrink-0 font-mono">
          {column.type}
          {column.isNullable && <span className="text-text-muted">?</span>}
        </span>

        <Handle
          type="source"
          position={Position.Right}
          id={`${tableName}-${column.name}`}
          className="!w-2 !h-2 !bg-accent-blue !border-none !-right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    );
  }
);

ColumnRow.displayName = "ColumnRow";

interface TableNodeProps {
  data: TableNodeData;
}

export const TableNode = memo(({ data }: TableNodeProps) => {
  const { table } = data;

  return (
    <div className="min-w-[240px] max-w-[320px] bg-bg-surface border border-border-default rounded-lg shadow-xl overflow-hidden animate-fade-in">
      <div className="bg-gradient-to-r from-accent-green to-accent-green-light px-4 py-2.5 border-b border-border-default">
        <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 11h16M9 4v16"
            />
          </svg>
          {table.name}
        </h3>
      </div>

      <div className="py-1 max-h-[300px] overflow-y-auto">
        {table.columns.map((column: Column) => (
          <ColumnRow key={column.name} column={column} tableName={table.name} />
        ))}
      </div>

      <div className="px-3 py-1.5 bg-bg-primary border-t border-border-default flex items-center justify-between text-xs text-text-muted">
        <span>{table.columns.length} columns</span>
        <div className="flex items-center gap-2">
          {table.columns.filter((c: Column) => c.isPrimaryKey).length > 0 && (
            <span className="flex items-center gap-0.5">
              <Key className="w-3 h-3 text-accent-purple" />
              {table.columns.filter((c: Column) => c.isPrimaryKey).length}
            </span>
          )}
          {table.columns.filter((c: Column) => c.isForeignKey).length > 0 && (
            <span className="flex items-center gap-0.5">
              <Link className="w-3 h-3 text-accent-orange" />
              {table.columns.filter((c: Column) => c.isForeignKey).length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

TableNode.displayName = "TableNode";
