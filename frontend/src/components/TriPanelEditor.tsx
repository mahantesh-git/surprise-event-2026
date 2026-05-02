import React, { useState, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

export interface TriPanelCode {
  html: string;
  css: string;
  js: string;
}

interface TriPanelEditorProps {
  initialCode: TriPanelCode;
  onChange: (code: TriPanelCode) => void;
  teamId: string;
  activePanel?: 'html' | 'css' | 'js';
  showPreview?: boolean;
}

export function TriPanelEditor({ initialCode, onChange, teamId, activePanel = 'html', showPreview = false }: TriPanelEditorProps) {
  const [code, setCode] = useState<TriPanelCode>(initialCode);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>(activePanel);
  const monaco = useMonaco();

  // Update local state when initialCode changes (e.g. on new slot)
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode.html, initialCode.css, initialCode.js]);

  // Setup Monaco theme
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('tactical-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: '', background: '000000' }
        ],
        colors: {
          'editor.background': '#00000000',
          'editor.lineHighlightBackground': '#ffffff05',
          'editorLineNumber.foreground': '#ffffff40',
          'editorLineNumber.activeForeground': '#ffffffaa',
          'editorIndentGuide.background': '#ffffff10',
          'editorIndentGuide.activeBackground': '#ffffff30',
        }
      });
      monaco.editor.setTheme('tactical-dark');
    }
  }, [monaco]);

  const handleEditorChange = (value: string | undefined, type: 'html' | 'css' | 'js') => {
    const newCode = { ...code, [type]: value || '' };
    setCode(newCode);
    onChange(newCode);
  };

  // Generate iframe source (used only when showPreview=true)
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: sans-serif; background: #fff; color: #000; }
          ${code.css}
        </style>
      </head>
      <body>
        ${code.html}
        <script>
          try {
            ${code.js}
          } catch(e) {
            console.error(e);
          }
        </script>
      </body>
    </html>
  `;

  return (
    <div className="flex flex-col w-full bg-black/40 border border-white/10 rounded-lg overflow-hidden" style={{ height: '100%' }}>
      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/60">
        {(['html', 'css', 'js'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-black tracking-widest uppercase transition-colors ${
              activeTab === tab 
                ? 'bg-[var(--color-accent)] text-black' 
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
        {showPreview && (
          <button
            onClick={() => setActiveTab('preview' as any)}
            className={`flex-1 py-2 text-xs font-black tracking-widest uppercase transition-colors ${
              activeTab === ('preview' as any)
                ? 'bg-[var(--color-accent)] text-black' 
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            PREVIEW
          </button>
        )}
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 relative min-h-0">
        {activeTab !== ('preview' as any) ? (
          <Editor
            height="100%"
            language={activeTab === 'js' ? 'javascript' : activeTab}
            value={code[activeTab]}
            theme="tactical-dark"
            onChange={(val) => handleEditorChange(val, activeTab)}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'IBM Plex Mono', monospace",
              wordWrap: 'on',
              lineNumbersMinChars: 3,
              readOnly: false,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              formatOnPaste: true,
              automaticLayout: true,
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto'
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-white">
            <iframe
              srcDoc={srcDoc}
              title="preview"
              sandbox="allow-scripts"
              className="w-full h-full border-none bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
