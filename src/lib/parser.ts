import type {
  ParsedSchema,
  Table,
  Column,
  Relation,
  SchemaFormat,
} from "@/types/schema";

// Detect schema format
export function detectSchemaFormat(code: string): SchemaFormat {
  if (/(pg|mysql|sqlite)Table|drizzle-orm/.test(code)) {
    return "drizzle";
  }
  if (
    (/@id/.test(code) && /@relation/.test(code)) ||
    /model\s+\w+\s*\{/.test(code)
  ) {
    return "prisma";
  }
  if (/CREATE\s+TABLE|create\s+table/i.test(code)) {
    return "sql";
  }
  return "auto";
}

// Parse Drizzle schema - improved version
function parseDrizzleSchema(code: string): ParsedSchema {
  const tables: Table[] = [];
  const relations: Relation[] = [];
  const variableToTableMap: Record<string, string> = {};

  // Remove comments
  const cleanCode = code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  // Simple approach: Find all pgTable/mysqlTable/sqliteTable calls
  // Pattern: variableName = pgTable("tableName", { columns })
  const tablePattern =
    /(\w+)\s*=\s*(?:\w+\.)?(?:pg|mysql|sqlite)Table\s*\(\s*["']([^"']+)["']\s*,\s*\{/g;

  let match;
  while ((match = tablePattern.exec(cleanCode)) !== null) {
    const variableName = match[1];
    const tableName = match[2];
    variableToTableMap[variableName] = tableName;

    // Find the opening brace position (it's at the end of our match)
    const openBracePos = match.index + match[0].length - 1;

    // Find matching closing brace for the columns object
    let depth = 1;
    let pos = openBracePos + 1;
    while (depth > 0 && pos < cleanCode.length) {
      if (cleanCode[pos] === "{") depth++;
      if (cleanCode[pos] === "}") depth--;
      pos++;
    }

    const columnsBlock = cleanCode.substring(openBracePos + 1, pos - 1);

    const columns: Column[] = [];

    // Split by top-level commas (not inside parentheses or braces)
    const parts: string[] = [];
    let current = "";
    let parenDepth = 0;
    let braceDepth = 0;

    for (const char of columnsBlock) {
      if (char === "(") parenDepth++;
      if (char === ")") parenDepth--;
      if (char === "{") braceDepth++;
      if (char === "}") braceDepth--;

      if (char === "," && parenDepth === 0 && braceDepth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());

    for (const part of parts) {
      // Match column definitions: columnName: type(...)
      const colMatch = part.match(/^\s*(\w+)\s*:\s*(\w+)\s*\(/);
      if (!colMatch) {
        continue;
      }

      const colName = colMatch[1];
      const colType = colMatch[2];

      // Find modifiers after the type function call
      let pDepth = 0;
      let typeEnd = -1;
      let started = false;

      for (let i = 0; i < part.length; i++) {
        if (part[i] === "(") {
          pDepth++;
          started = true;
        } else if (part[i] === ")") {
          pDepth--;
        }
        if (started && pDepth === 0) {
          typeEnd = i + 1;
          break;
        }
      }

      const modifiers = typeEnd !== -1 ? part.substring(typeEnd) : "";

      const isPrimaryKey = modifiers.includes(".primaryKey()");
      const isUnique = modifiers.includes(".unique()");
      const isNullable = !modifiers.includes(".notNull()");

      // Check for references
      const refMatch = modifiers.match(
        /\.references\s*\(\s*\(\)\s*=>\s*(\w+)\.(\w+)/
      );

      const column: Column = {
        name: colName,
        type: colType,
        isPrimaryKey,
        isForeignKey: !!refMatch,
        isUnique,
        isNullable,
      };

      if (refMatch) {
        column.references = {
          table: refMatch[1],
          column: refMatch[2],
        };
      }

      columns.push(column);
    }

    tables.push({ name: tableName, columns });
  }

  // Resolve references and build relations
  for (const table of tables) {
    for (const column of table.columns) {
      if (column.references) {
        const targetVarName = column.references.table;
        const targetTableName =
          variableToTableMap[targetVarName] || targetVarName;

        relations.push({
          id: `${table.name}-${column.name}-${targetTableName}-${column.references.column}`,
          sourceTable: table.name,
          sourceColumn: column.name,
          targetTable: targetTableName,
          targetColumn: column.references.column,
          relationType: "one-to-many",
        });

        column.references.table = targetTableName;
      }
    }
  }

  return { tables, relations };
}

// Parse Prisma schema
function parsePrismaSchema(code: string): ParsedSchema {
  const tables: Table[] = [];
  const relations: Relation[] = [];

  // Match model definitions
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;

  let match;
  while ((match = modelRegex.exec(code)) !== null) {
    const [, tableName, fieldsBlock] = match;
    const columns: Column[] = [];

    const lines = fieldsBlock
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"));

    for (const line of lines) {
      const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?\??(.*)$/);
      if (fieldMatch) {
        const [, fieldName, fieldType, isArray, modifiers] = fieldMatch;

        // Skip relation fields (they don't have @relation but have model type)
        if (isArray) continue;

        const isPrimaryKey = modifiers.includes("@id");
        const isUnique = modifiers.includes("@unique");
        const isNullable = line.includes("?");

        // Check for relation
        const relationMatch = modifiers.match(
          /@relation\s*\([^)]*fields:\s*\[(\w+)\][^)]*references:\s*\[(\w+)\]/
        );

        if (relationMatch) {
          const refColumn = relationMatch[1];
          relations.push({
            id: `${tableName}-${refColumn}-${fieldType}-${relationMatch[2]}`,
            sourceTable: tableName,
            sourceColumn: refColumn,
            targetTable: fieldType,
            targetColumn: relationMatch[2],
            relationType: "one-to-many",
          });
        } else if (
          ![
            "Int",
            "String",
            "Boolean",
            "DateTime",
            "Float",
            "Json",
            "Bytes",
            "BigInt",
            "Decimal",
          ].includes(fieldType)
        ) {
          // Skip model reference fields
          continue;
        }

        columns.push({
          name: fieldName,
          type: fieldType,
          isPrimaryKey,
          isForeignKey: !!relationMatch,
          isUnique,
          isNullable,
        });
      }
    }

    if (columns.length > 0) {
      tables.push({ name: tableName, columns });
    }
  }

  return { tables, relations };
}

// Parse raw SQL schema
function parseSQLSchema(code: string): ParsedSchema {
  const tables: Table[] = [];
  const relations: Relation[] = [];

  // Normalize and split by CREATE TABLE
  const normalizedCode = code.replace(/\r\n/g, "\n");
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([^;]+)\)/gi;

  let match;
  while ((match = tableRegex.exec(normalizedCode)) !== null) {
    const [, tableName, columnsBlock] = match;
    const columns: Column[] = [];

    // Split by comma but not inside parentheses
    const columnDefs = columnsBlock.split(/,(?![^()]*\))/);

    for (const colDef of columnDefs) {
      const trimmed = colDef.trim();

      // Skip constraints
      if (
        /^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)/i.test(trimmed)
      ) {
        // Handle PRIMARY KEY constraint
        const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(\s*([^)]+)\s*\)/i);
        if (pkMatch) {
          const pkCols = pkMatch[1].split(",").map((c) => c.trim());
          pkCols.forEach((pk) => {
            const col = columns.find((c) => c.name === pk);
            if (col) col.isPrimaryKey = true;
          });
        }
        continue;
      }

      // Parse column definition
      const colMatch = trimmed.match(/^(\w+)\s+(\w+(?:\([^)]+\))?)\s*(.*)?$/i);
      if (colMatch) {
        const [, colName, colType, modifiers = ""] = colMatch;

        const isPrimaryKey = /PRIMARY\s+KEY/i.test(modifiers);
        const isUnique = /UNIQUE/i.test(modifiers);
        const isNullable = !/NOT\s+NULL/i.test(modifiers);

        // Check for REFERENCES
        const refMatch = modifiers.match(
          /REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)/i
        );

        const column: Column = {
          name: colName,
          type: colType.toUpperCase(),
          isPrimaryKey,
          isForeignKey: !!refMatch,
          isUnique,
          isNullable,
        };

        if (refMatch) {
          column.references = {
            table: refMatch[1],
            column: refMatch[2],
          };

          relations.push({
            id: `${tableName}-${colName}-${refMatch[1]}-${refMatch[2]}`,
            sourceTable: tableName,
            sourceColumn: colName,
            targetTable: refMatch[1],
            targetColumn: refMatch[2],
            relationType: "one-to-many",
          });
        }

        columns.push(column);
      }
    }

    if (columns.length > 0) {
      tables.push({ name: tableName, columns });
    }
  }

  return { tables, relations };
}

// Main parse function
export function parseSchema(
  code: string,
  format: SchemaFormat = "auto"
): ParsedSchema {
  const detectedFormat = format === "auto" ? detectSchemaFormat(code) : format;

  switch (detectedFormat) {
    case "drizzle":
      return parseDrizzleSchema(code);
    case "prisma":
      return parsePrismaSchema(code);
    case "sql":
      return parseSQLSchema(code);
    default: {
      // Try each parser
      let result = parseDrizzleSchema(code);
      if (result.tables.length > 0) return result;

      result = parsePrismaSchema(code);
      if (result.tables.length > 0) return result;

      result = parseSQLSchema(code);
      return result;
    }
  }
}
