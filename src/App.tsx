import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { Bot, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { CodeEditor } from "@/components/CodeEditor";
import { DiagramCanvas } from "@/components/DiagramCanvas";
import { AgentChat } from "@/components/AgentChat";
import {
  useDiagramStore,
  type EditorPosition,
  type SidebarPosition,
} from "@/store/diagramStore";

type PositionOption<T extends string> = {
  value: T;
  label: string;
};

const sidebarPositionOptions: PositionOption<SidebarPosition>[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const editorPositionOptions: PositionOption<EditorPosition>[] = [
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: PositionOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <div className="flex rounded-lg border border-border-default bg-bg-primary p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              value === option.value
                ? "bg-accent-blue text-bg-primary"
                : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [editorExpanded, setEditorExpanded] = useState(true);
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const {
    parseCode,
    sidebarPosition,
    setSidebarPosition,
    editorPosition,
    setEditorPosition,
    editorSize,
    setEditorSize,
  } = useDiagramStore();
  const editorIsBottom = editorPosition === "bottom";

  const handleEditorResizeMouseDown = (
    event: ReactMouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startSize = editorSize;
    const containerRect = event.currentTarget.parentElement?.getBoundingClientRect();
    const containerSize = editorIsBottom
      ? containerRect?.height ?? window.innerHeight
      : containerRect?.width ?? window.innerWidth;

    if (containerSize <= 0) {
      return;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = editorIsBottom
        ? startY - moveEvent.clientY
        : editorPosition === "left"
        ? moveEvent.clientX - startX
        : startX - moveEvent.clientX;
      const deltaPercent = (delta / containerSize) * 100;

      setEditorSize(startSize + deltaPercent);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const editorResizeHandle = (
    <div
      className={`bg-bg-elevated hover:bg-accent-blue flex items-center justify-center group transition-colors ${
        editorIsBottom
          ? "h-1.5 cursor-row-resize"
          : "w-1.5 cursor-col-resize"
      }`}
      onMouseDown={handleEditorResizeMouseDown}
      role="separator"
      aria-orientation={editorIsBottom ? "horizontal" : "vertical"}
    >
      <div
        className={`bg-border-default group-hover:bg-accent-blue rounded-full transition-colors ${
          editorIsBottom ? "w-12 h-1" : "w-1 h-12"
        }`}
      />
    </div>
  );

  const editorPanel = (
    <div
      className={`bg-bg-primary overflow-hidden ${
        editorIsBottom
          ? "border-t border-border-default"
          : editorPosition === "left"
          ? "border-r border-border-default"
          : "border-l border-border-default"
      }`}
      style={
        editorIsBottom
          ? { height: `${editorSize}%` }
          : { width: `${editorSize}%` }
      }
    >
      <div className="h-full p-3">
        <CodeEditor />
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-bg-primary">
      {sidebarPosition === "left" && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-12 bg-bg-surface border-b border-border-default flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden text-sm text-text-secondary xl:inline">
              Drag tables to arrange • Scroll to zoom • Auto-updates on edit
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="hidden items-center gap-3 md:flex">
              <SegmentedControl
                label="Sidebar"
                value={sidebarPosition}
                options={sidebarPositionOptions}
                onChange={setSidebarPosition}
              />
              <SegmentedControl
                label="Editor"
                value={editorPosition}
                options={editorPositionOptions}
                onChange={setEditorPosition}
              />
            </div>

            <button
              onClick={() => setAgentChatOpen(true)}
              aria-label="Open Agent Chat"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-blue hover:bg-bg-elevated font-medium rounded-lg transition-colors"
            >
              <Bot className="w-4 h-4" />
              Agent Chat
            </button>

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

        <main
          className={`flex-1 flex min-h-0 ${
            editorIsBottom ? "flex-col" : "flex-row"
          }`}
        >
          {editorExpanded && editorPosition === "left" && (
            <>
              {editorPanel}
              {editorResizeHandle}
            </>
          )}

          <div className="flex-1 min-h-0 min-w-0 relative">
            <DiagramCanvas />
          </div>

          {editorExpanded && editorPosition === "bottom" && (
            <>
              {editorResizeHandle}
              {editorPanel}
            </>
          )}

          {editorExpanded && editorPosition === "right" && (
            <>
              {editorResizeHandle}
              {editorPanel}
            </>
          )}
        </main>
      </div>

      {sidebarPosition === "right" && <Sidebar />}

      <AgentChat
        isOpen={agentChatOpen}
        onClose={() => setAgentChatOpen(false)}
        onSchemaApplied={() => setEditorExpanded(true)}
      />
    </div>
  );
}

export default App;
