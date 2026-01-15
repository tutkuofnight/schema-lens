// Drizzle ORM type definitions for Monaco Editor
// These are comprehensive type stubs to provide full intellisense in the editor

// PostgreSQL Core Types
const pgCoreTypes = `
/**
 * Column builder base interface with common methods
 */
interface ColumnBuilderBase<T = unknown> {
  /** Make this column NOT NULL */
  notNull(): this;
  /** Set a default value for this column */
  default(value: T): this;
  /** Set default to current timestamp (for date/time columns) */
  defaultNow(): this;
  /** Make this column the primary key */
  primaryKey(): this;
  /** Add a unique constraint to this column */
  unique(): this;
  /** Add a foreign key reference to another table */
  references<TRef>(ref: () => TRef, options?: { onDelete?: 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default'; onUpdate?: 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default' }): this;
  /** Add a generated expression */
  generatedAlwaysAs(expression: any): this;
}

interface PgColumnBuilder<T = unknown> extends ColumnBuilderBase<T> {}

// ==================== NUMERIC TYPES ====================

/**
 * Auto-incrementing 4-byte integer (1 to 2147483647)
 * @param name - Column name in the database
 */
export function serial(name: string): PgColumnBuilder<number>;

/**
 * Auto-incrementing 8-byte integer (1 to 9223372036854775807)
 * @param name - Column name in the database
 */
export function bigserial(name: string): PgColumnBuilder<bigint>;

/**
 * Signed 4-byte integer (-2147483648 to 2147483647)
 * @param name - Column name in the database
 */
export function integer(name: string): PgColumnBuilder<number>;

/**
 * Signed 8-byte integer
 * @param name - Column name in the database
 * @param config - Optional configuration
 */
export function bigint(name: string, config?: { mode?: 'number' | 'bigint' }): PgColumnBuilder<number | bigint>;

/**
 * Signed 2-byte integer (-32768 to 32767)
 * @param name - Column name in the database
 */
export function smallint(name: string): PgColumnBuilder<number>;

/**
 * Single precision floating-point number (4 bytes)
 * @param name - Column name in the database
 */
export function real(name: string): PgColumnBuilder<number>;

/**
 * Double precision floating-point number (8 bytes)
 * @param name - Column name in the database
 */
export function doublePrecision(name: string): PgColumnBuilder<number>;

/**
 * Exact numeric with configurable precision
 * @param name - Column name in the database
 * @param config - Precision and scale configuration
 */
export function numeric(name: string, config?: { precision?: number; scale?: number }): PgColumnBuilder<string>;

/**
 * Alias for numeric - exact decimal number
 * @param name - Column name in the database
 * @param config - Precision and scale configuration
 */
export function decimal(name: string, config?: { precision?: number; scale?: number }): PgColumnBuilder<string>;

// ==================== STRING TYPES ====================

/**
 * Variable-length string with unlimited length
 * @param name - Column name in the database
 */
export function text(name: string): PgColumnBuilder<string>;

/**
 * Variable-length string with optional length limit
 * @param name - Column name in the database
 * @param config - Maximum length configuration
 */
export function varchar(name: string, config?: { length?: number }): PgColumnBuilder<string>;

/**
 * Fixed-length string, padded with spaces
 * @param name - Column name in the database
 * @param config - Exact length configuration
 */
export function char(name: string, config?: { length?: number }): PgColumnBuilder<string>;

// ==================== BOOLEAN TYPE ====================

/**
 * Boolean type (true/false)
 * @param name - Column name in the database
 */
export function boolean(name: string): PgColumnBuilder<boolean>;

// ==================== DATE/TIME TYPES ====================

/**
 * Timestamp with optional timezone
 * @param name - Column name in the database
 * @param config - Timestamp configuration
 */
export function timestamp(name: string, config?: { mode?: 'string' | 'date'; precision?: number; withTimezone?: boolean }): PgColumnBuilder<Date | string>;

/**
 * Calendar date (year, month, day)
 * @param name - Column name in the database
 * @param config - Date configuration
 */
export function date(name: string, config?: { mode?: 'string' | 'date' }): PgColumnBuilder<Date | string>;

/**
 * Time of day (without date)
 * @param name - Column name in the database
 * @param config - Time configuration
 */
export function time(name: string, config?: { precision?: number; withTimezone?: boolean }): PgColumnBuilder<string>;

/**
 * Time interval
 * @param name - Column name in the database
 */
export function interval(name: string): PgColumnBuilder<string>;

// ==================== JSON TYPES ====================

/**
 * JSON data stored as text
 * @param name - Column name in the database
 */
export function json<T = unknown>(name: string): PgColumnBuilder<T>;

/**
 * JSON data stored in binary format (faster queries)
 * @param name - Column name in the database
 */
export function jsonb<T = unknown>(name: string): PgColumnBuilder<T>;

// ==================== UUID TYPE ====================

/**
 * Universally Unique Identifier (UUID)
 * @param name - Column name in the database
 */
export function uuid(name: string): PgColumnBuilder<string>;

// ==================== TABLE DEFINITION ====================

interface TableConfig {
  [key: string]: PgColumnBuilder<any>;
}

interface PgTable<T extends TableConfig = TableConfig> {
  [K in keyof T]: T[K];
}

/**
 * Define a PostgreSQL table
 * @param name - Table name in the database
 * @param columns - Column definitions object
 * @example
 * const users = pgTable('users', {
 *   id: serial('id').primaryKey(),
 *   name: text('name').notNull(),
 *   email: varchar('email', { length: 255 }).unique(),
 *   createdAt: timestamp('created_at').defaultNow(),
 * });
 */
export function pgTable<T extends TableConfig>(
  name: string,
  columns: T
): PgTable<T>;

/**
 * Create a PostgreSQL schema namespace
 * @param name - Schema name
 */
export function pgSchema(name: string): {
  table: typeof pgTable;
};

/**
 * Define a PostgreSQL enum type
 * @param name - Enum type name in the database
 * @param values - Array of allowed values
 * @example
 * const statusEnum = pgEnum('status', ['pending', 'active', 'archived']);
 */
export function pgEnum<T extends string>(
  name: string,
  values: readonly [T, ...T[]]
): { (name: string): PgColumnBuilder<T>; enumName: string; enumValues: readonly [T, ...T[]] };

// ==================== INDEXES & CONSTRAINTS ====================

/** Create an index */
export function index(name?: string): any;
/** Create a unique index */
export function uniqueIndex(name?: string): any;
/** Create a composite primary key */
export function primaryKey(...columns: any[]): any;
/** Create a foreign key constraint */
export function foreignKey(config: any): any;
`;

// Main drizzle-orm types
const drizzleOrmMainTypes = `
// ==================== RELATIONS ====================

interface RelationsHelpers {
  /** Define a one-to-one or many-to-one relation */
  one: <T>(table: T, config?: { fields: any[]; references: any[]; relationName?: string }) => any;
  /** Define a one-to-many relation */
  many: <T>(table: T, config?: { relationName?: string }) => any;
}

/**
 * Define relations for a table
 * @param table - The table to define relations for
 * @param callback - Function that receives relation helpers
 * @example
 * export const usersRelations = relations(users, ({ one, many }) => ({
 *   posts: many(posts),
 *   profile: one(profiles),
 * }));
 */
export function relations<T>(table: T, callback: (helpers: RelationsHelpers) => any): any;

// ==================== SQL UTILITIES ====================

/**
 * Raw SQL template literal
 * @example
 * sql\`NOW()\`
 * sql\`\${column} + 1\`
 */
export function sql<T = unknown>(strings: TemplateStringsArray, ...values: any[]): T;

/** Check if column equals value */
export function eq<T>(column: T, value: any): any;
/** Check if column does not equal value */
export function ne<T>(column: T, value: any): any;
/** Check if column is greater than value */
export function gt<T>(column: T, value: any): any;
/** Check if column is greater than or equal to value */
export function gte<T>(column: T, value: any): any;
/** Check if column is less than value */
export function lt<T>(column: T, value: any): any;
/** Check if column is less than or equal to value */
export function lte<T>(column: T, value: any): any;
/** Combine conditions with AND */
export function and(...conditions: any[]): any;
/** Combine conditions with OR */
export function or(...conditions: any[]): any;
/** Negate a condition */
export function not(condition: any): any;
/** Check if column is NULL */
export function isNull<T>(column: T): any;
/** Check if column is NOT NULL */
export function isNotNull<T>(column: T): any;
/** Check if column value is in array */
export function inArray<T>(column: T, values: any[]): any;
/** Check if column value is not in array */
export function notInArray<T>(column: T, values: any[]): any;
/** Check if column value is between min and max */
export function between<T>(column: T, min: any, max: any): any;
/** Pattern matching with LIKE */
export function like<T>(column: T, pattern: string): any;
/** Case-insensitive pattern matching with ILIKE */
export function ilike<T>(column: T, pattern: string): any;
/** Order by ascending */
export function asc<T>(column: T): any;
/** Order by descending */
export function desc<T>(column: T): any;
`;

// MySQL Core Types
const mysqlCoreTypes = `
interface ColumnBuilderBase<T = unknown> {
  notNull(): this;
  default(value: T): this;
  defaultNow(): this;
  primaryKey(): this;
  unique(): this;
  references<TRef>(ref: () => TRef, options?: { onDelete?: string; onUpdate?: string }): this;
  autoincrement(): this;
}

interface MySqlColumnBuilder<T = unknown> extends ColumnBuilderBase<T> {}

export function serial(name: string): MySqlColumnBuilder<number>;
export function int(name: string): MySqlColumnBuilder<number>;
export function bigint(name: string, config?: { mode?: 'number' | 'bigint' }): MySqlColumnBuilder<number | bigint>;
export function tinyint(name: string): MySqlColumnBuilder<number>;
export function smallint(name: string): MySqlColumnBuilder<number>;
export function mediumint(name: string): MySqlColumnBuilder<number>;
export function float(name: string): MySqlColumnBuilder<number>;
export function double(name: string): MySqlColumnBuilder<number>;
export function decimal(name: string, config?: { precision?: number; scale?: number }): MySqlColumnBuilder<string>;

export function text(name: string): MySqlColumnBuilder<string>;
export function varchar(name: string, config: { length: number }): MySqlColumnBuilder<string>;
export function char(name: string, config?: { length?: number }): MySqlColumnBuilder<string>;
export function tinytext(name: string): MySqlColumnBuilder<string>;
export function mediumtext(name: string): MySqlColumnBuilder<string>;
export function longtext(name: string): MySqlColumnBuilder<string>;

export function boolean(name: string): MySqlColumnBuilder<boolean>;

export function timestamp(name: string): MySqlColumnBuilder<Date>;
export function datetime(name: string): MySqlColumnBuilder<Date>;
export function date(name: string): MySqlColumnBuilder<Date>;
export function time(name: string): MySqlColumnBuilder<string>;
export function year(name: string): MySqlColumnBuilder<number>;

export function json<T = unknown>(name: string): MySqlColumnBuilder<T>;

interface TableConfig {
  [key: string]: MySqlColumnBuilder<any>;
}

interface MySqlTable<T extends TableConfig = TableConfig> {
  [K in keyof T]: T[K];
}

/**
 * Define a MySQL table
 * @param name - Table name in the database
 * @param columns - Column definitions object
 */
export function mysqlTable<T extends TableConfig>(
  name: string,
  columns: T
): MySqlTable<T>;

export function mysqlEnum<T extends string>(
  name: string,
  values: readonly [T, ...T[]]
): MySqlColumnBuilder<T>;
`;

// SQLite Core Types
const sqliteCoreTypes = `
interface ColumnBuilderBase<T = unknown> {
  notNull(): this;
  default(value: T): this;
  primaryKey(): this;
  unique(): this;
  references<TRef>(ref: () => TRef, options?: { onDelete?: string; onUpdate?: string }): this;
}

interface SQLiteColumnBuilder<T = unknown> extends ColumnBuilderBase<T> {}

/**
 * SQLite integer column (also used for booleans and timestamps)
 * @param name - Column name
 * @param config - Mode configuration
 */
export function integer(name: string, config?: { mode?: 'number' | 'timestamp' | 'timestamp_ms' | 'boolean' }): SQLiteColumnBuilder<number>;

/** SQLite real (floating-point) column */
export function real(name: string): SQLiteColumnBuilder<number>;

/** SQLite text column */
export function text(name: string, config?: { mode?: 'text' | 'json'; length?: number }): SQLiteColumnBuilder<string>;

/** SQLite blob column */
export function blob(name: string, config?: { mode?: 'buffer' | 'bigint' | 'json' }): SQLiteColumnBuilder<Buffer>;

interface TableConfig {
  [key: string]: SQLiteColumnBuilder<any>;
}

interface SQLiteTable<T extends TableConfig = TableConfig> {
  [K in keyof T]: T[K];
}

/**
 * Define a SQLite table
 * @param name - Table name
 * @param columns - Column definitions
 */
export function sqliteTable<T extends TableConfig>(
  name: string,
  columns: T
): SQLiteTable<T>;
`;

// Function to add types to Monaco
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addDrizzleTypesToMonaco(monaco: any) {
  const ts = monaco.languages.typescript;

  // Configure compiler options FIRST for proper module resolution
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    strict: false,
    esModuleInterop: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    noEmit: true,
    isolatedModules: true,
    lib: ["esnext"],
    jsx: ts.JsxEmit?.React || 4,
  });

  // Add each module as a separate file with proper path
  ts.typescriptDefaults.addExtraLib(
    pgCoreTypes,
    "file:///node_modules/drizzle-orm/pg-core/index.d.ts"
  );

  ts.typescriptDefaults.addExtraLib(
    drizzleOrmMainTypes,
    "file:///node_modules/drizzle-orm/index.d.ts"
  );

  ts.typescriptDefaults.addExtraLib(
    mysqlCoreTypes,
    "file:///node_modules/drizzle-orm/mysql-core/index.d.ts"
  );

  ts.typescriptDefaults.addExtraLib(
    sqliteCoreTypes,
    "file:///node_modules/drizzle-orm/sqlite-core/index.d.ts"
  );

  // Set diagnostic options
  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      2307, // Cannot find module
      1259, // Module augmentation
      2792, // Cannot find module (for subpaths)
      2339, // Property 'x' does not exist on type 'y' (for dynamic table.column references)
      2345, // Argument of type 'x' is not assignable to parameter of type 'y'
      2322, // Type 'x' is not assignable to type 'y'
      7006, // Parameter implicitly has an 'any' type
      7031, // Binding element implicitly has an 'any' type
    ],
  });
}
