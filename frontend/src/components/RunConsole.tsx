import React, { useState, useRef, useEffect } from 'react';
import { Terminal, ChevronUp, ChevronDown, Trash2, Copy, Check } from 'lucide-react';

export interface ConsoleEvent {
  timestamp: string;
  type: string;
  message: string;
  data?: any;
}

interface RunConsoleProps {
  events: ConsoleEvent[];
  onClear: () => void;
}

export const RunConsole: React.FC<RunConsoleProps> = ({ events, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, isOpen]);

  const handleCopy = () => {
    const text = events.map((e) => `[${e.timestamp}] [${e.type}] ${e.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border shadow-sm">
      {/* Console Header / Toggle Bar */}
      <div className="h-8 px-4 flex items-center justify-between bg-panel text-xs font-mono select-none border-b border-border">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-heading hover:text-primary transition-colors focus:outline-none"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-semibold">Run Console</span>
          <span className="text-secondary">({events.length} events)</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center space-x-2">
          {events.length > 0 && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 px-1.5 py-0.5 text-[11px] text-secondary hover:text-heading"
                title="Copy log to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={onClear}
                className="flex items-center space-x-1 px-1.5 py-0.5 text-[11px] text-secondary hover:text-critical"
                title="Clear console"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Console Content */}
      {isOpen && (
        <div className="h-44 overflow-y-auto p-2 bg-[#FAF9F6] font-mono text-[11px] space-y-1">
          {events.length === 0 ? (
            <div className="text-secondary italic p-2">
              Console idle. Start an experiment to inspect live execution telemetry and trace events.
            </div>
          ) : (
            events.map((e, idx) => (
              <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-secondary shrink-0">{e.timestamp}</span>
                <span className="px-1 py-0.2 bg-panel text-heading rounded text-[10px] uppercase font-semibold shrink-0">
                  {e.type}
                </span>
                <span className="text-heading break-all">{e.message}</span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};
