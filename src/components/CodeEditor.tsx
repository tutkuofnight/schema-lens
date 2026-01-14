import { useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useDiagramStore } from "@/store/diagramStore";
import { useDebounce } from "@/hooks/useDebounce";

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

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-1 overflow-hidden rounded-lg border border-border-default">
        <Editor
          height="100%"
          defaultLanguage={getLanguage()}
          language={getLanguage()}
          value={code}
          onChange={handleEditorChange}
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
          }}
        />
      </div>
    </div>
  );
}
