// Types for database schema representation
export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  isNullable: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    column: string;
  };
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface Relation {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  relationType: "one-to-one" | "one-to-many" | "many-to-many";
}

export interface ParsedSchema {
  tables: Table[];
  relations: Relation[];
}

export type SchemaFormat = "drizzle" | "prisma" | "sql" | "auto";
