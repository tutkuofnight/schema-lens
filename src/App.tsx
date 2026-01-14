import { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { CodeEditor } from "@/components/CodeEditor";
import { DiagramCanvas } from "@/components/DiagramCanvas";
import { useDiagramStore } from "@/store/diagramStore";

function App() {
  const [editorExpanded, setEditorExpanded] = useState(true);
  const [editorHeight, setEditorHeight] = useState(40); // percentage
  const { parseCode } = useDiagramStore();

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-bg-primary">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-bg-surface border-b border-border-default flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              Drag tables to arrange • Scroll to zoom • Auto-updates on edit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={parseCode}
              aria-label="Regenerate diagram"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent-green hover:bg-accent-green-light text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>

            <button
              onClick={() => setEditorExpanded(!editorExpanded)}
              aria-label={
                editorExpanded ? "Hide Code Editor" : "Show Code Editor"
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
            >
              {editorExpanded ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Hide Editor
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Editor
                </>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0">
          <div
            className="flex-1 min-h-0 relative"
            style={{
              height: editorExpanded ? `${100 - editorHeight}%` : "100%",
            }}
          >
            <DiagramCanvas />
          </div>

          {editorExpanded && (
            <>
              <div
                className="h-1.5 bg-bg-elevated hover:bg-accent-blue cursor-row-resize flex items-center justify-center group transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startHeight = editorHeight;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const deltaY = startY - moveEvent.clientY;
                    const containerHeight = window.innerHeight - 48; // 48 is header height
                    const deltaPercent = (deltaY / containerHeight) * 100;
                    const newHeight = Math.min(
                      80,
                      Math.max(20, startHeight + deltaPercent)
                    );
                    setEditorHeight(newHeight);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener("mousemove", handleMouseMove);
                    document.removeEventListener("mouseup", handleMouseUp);
                  };

                  document.addEventListener("mousemove", handleMouseMove);
                  document.addEventListener("mouseup", handleMouseUp);
                }}
              >
                <div className="w-12 h-1 bg-border-default group-hover:bg-accent-blue rounded-full transition-colors" />
              </div>

              <div
                className="bg-bg-primary border-t border-border-default overflow-hidden"
                style={{ height: `${editorHeight}%` }}
              >
                <div className="h-full p-3">
                  <CodeEditor />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
