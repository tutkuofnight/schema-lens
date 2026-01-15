import { useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useDiagramStore } from "@/store/diagramStore";
import { useDebounce } from "@/hooks/useDebounce";
import { addDrizzleTypesToMonaco } from "@/lib/monacoTypes";

export function CodeEditor() {
  const { code, format, setCode, parseCode } = useDiagramStore();

  // Debounce the code value
  const debouncedCode = useDebounce(code, 500);

  // Auto-parse when debounced code changes
  useEffect(() => {
    if (debouncedCode) {
      parseCode();
    }
  }, [debouncedCode, parseCode]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  // Configure Monaco before mounting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBeforeMount = (monaco: any) => {
    // Add Drizzle ORM type definitions
    addDrizzleTypesToMonaco(monaco);
  };

  // Get language for Monaco based on format
  const getLanguage = () => {
    switch (format) {
      case "drizzle":
        return "typescript";
      case "prisma":
        return "graphql";
      case "sql":
        return "sql";
      default:
        return "typescript";
    }
  };

  // Get file path for Monaco based on format
  const getPath = () => {
    switch (format) {
      case "drizzle":
        return "schema.ts";
      case "prisma":
        return "schema.prisma";
      case "sql":
        return "schema.sql";
      default:
        return "schema.ts";
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-1 overflow-hidden rounded-lg border border-border-default">
        <Editor
          height="100%"
          path={getPath()}
          defaultLanguage={getLanguage()}
          language={getLanguage()}
          value={code}
          onChange={handleEditorChange}
          beforeMount={handleBeforeMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "line",
            bracketPairColorization: { enabled: true },
            // Autocomplete settings
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: "currentDocument",
            parameterHints: {
              enabled: true,
              cycle: true,
            },
            suggest: {
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showKeywords: true,
              showWords: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showSnippets: true,
              insertMode: "insert",
              filterGraceful: true,
              snippetsPreventQuickSuggestions: false,
              localityBonus: true,
              shareSuggestSelections: true,
              showIcons: true,
              preview: true,
              previewMode: "prefix",
            },
          }}
        />
      </div>
    </div>
  );
}
