import { useRef, useEffect } from 'react';
import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

export type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'c' | 'cpp' | 'go';

export const LANGUAGE_OPTIONS: { id: SupportedLanguage; label: string; monacoLang: string }[] = [
  { id: 'python',     label: 'Python',     monacoLang: 'python' },
  { id: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { id: 'typescript', label: 'TypeScript', monacoLang: 'typescript' },
  { id: 'java',       label: 'Java',       monacoLang: 'java' },
  { id: 'c',          label: 'C',          monacoLang: 'c' },
  { id: 'cpp',        label: 'C++',        monacoLang: 'cpp' },
  { id: 'go',         label: 'Go',         monacoLang: 'go' },
];

export const LANGUAGE_TEMPLATES: Record<SupportedLanguage, string> = {
  python:
    '# Write your solution here\n\n',
  javascript:
    '// Write your solution here\n\n',
  typescript:
    '// Write your solution here\n\n',
  java:
    'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  c:
    '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  cpp:
    '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  go:
    'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    _ = fmt.Println\n}\n',
};

function defineQuestTheme(monaco: Monaco) {
  monaco.editor.defineTheme('quest-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment',   foreground: '4a5568', fontStyle: 'italic' },
      { token: 'keyword',   foreground: '95FF00', fontStyle: 'bold' },
      { token: 'string',    foreground: 'a8e6cf' },
      { token: 'number',    foreground: '68d391' },
      { token: 'type',      foreground: '63b3ed' },
      { token: 'function',  foreground: 'f6ad55' },
      { token: 'variable',  foreground: 'e2e8f0' },
      { token: 'delimiter', foreground: '718096' },
    ],
    colors: {
      'editor.background':                  '#0B0C0D',
      'editor.foreground':                  '#E2E8F0',
      'editor.lineHighlightBackground':     '#15171A',
      'editor.selectionBackground':         '#95FF0030',
      'editorCursor.foreground':            '#95FF00',
      'editorLineNumber.foreground':        '#2D3748',
      'editorLineNumber.activeForeground':  '#95FF00',
      'editor.inactiveSelectionBackground': '#95FF0015',
      'editorIndentGuide.background1':       '#1A1D21',
      'editorIndentGuide.activeBackground1': '#2D3748',
      'scrollbarSlider.background':         '#2D374850',
      'scrollbarSlider.hoverBackground':    '#4A556850',
      'editorWidget.background':            '#15171A',
      'input.background':                   '#15171A',
    },
  });
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage, starterCode: string) => void;
  onRun?: () => void;
  height?: string;
  /** Admin's original language for this question */
  defaultLanguage?: SupportedLanguage;
  /** Admin's starter code (restored when switching back to default language) */
  defaultCode?: string;
}

export function CodeEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  onRun,
  height = '360px',
  defaultLanguage,
  defaultCode,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Global Ctrl/Cmd+Enter shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onRun?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onRun]);

  const handleMount = (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = ed;
    defineQuestTheme(monaco);
    monaco.editor.setTheme('quest-dark');
    // Ctrl+Enter inside the editor
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.());
  };

  const handleLanguageSwitch = (lang: SupportedLanguage) => {
    const starter =
      lang === defaultLanguage && defaultCode ? defaultCode : LANGUAGE_TEMPLATES[lang];
    onLanguageChange(lang, starter);
  };

  const monacoLang = LANGUAGE_OPTIONS.find(l => l.id === language)?.monacoLang ?? 'plaintext';

  return (
    <div className="flex flex-col overflow-hidden border border-white/10 bg-[#0B0C0D]">
      {/* Language Tabs */}
      <div className="flex items-center border-b border-white/10 bg-[#15171A] overflow-x-auto scrollbar-hide">
        {LANGUAGE_OPTIONS.map(opt => {
          const active = opt.id === language;
          return (
            <button
              key={opt.id}
              onClick={() => handleLanguageSwitch(opt.id)}
              className={[
                'flex-shrink-0 px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest',
                'transition-all duration-150 border-r border-white/5',
                active
                  ? 'bg-[#95FF00]/10 text-[#95FF00] border-b-2 border-b-[#95FF00]'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
        <div className="ml-auto flex-shrink-0 px-4 py-2 text-[9px] font-mono text-white/20 uppercase tracking-widest whitespace-nowrap">
          Ctrl+Enter ▶ Run
        </div>
      </div>

      {/* Monaco Editor */}
      <MonacoEditor
        height={height}
        language={monacoLang}
        value={value}
        onChange={v => onChange(v ?? '')}
        beforeMount={defineQuestTheme}
        onMount={handleMount}
        theme="quest-dark"
        options={{
          minimap:               { enabled: false },
          fontSize:              13,
          fontFamily:            "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontLigatures:         true,
          lineHeight:            22,
          padding:               { top: 14, bottom: 14 },
          scrollBeyondLastLine:  false,
          wordWrap:              'on',
          tabSize:               4,
          automaticLayout:       true,
          cursorStyle:           'line',
          cursorBlinking:        'phase',
          renderLineHighlight:   'line',
          renderWhitespace:      'none',
          smoothScrolling:       true,
          scrollbar:             { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          overviewRulerLanes:    0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder:   false,
          lineNumbers:           'on',
          glyphMargin:           false,
          folding:               true,
          contextmenu:           false,
          quickSuggestions:      true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
        }}
      />
    </div>
  );
}
