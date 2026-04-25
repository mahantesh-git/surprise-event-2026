import { useRef, useEffect } from 'react';
import MonacoEditor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

export type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'c' | 'cpp' | 'go';

export const LANGUAGE_OPTIONS: { id: SupportedLanguage; label: string; monacoLang: string }[] = [
  { id: 'python', label: 'Python', monacoLang: 'python' },
  { id: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { id: 'typescript', label: 'TypeScript', monacoLang: 'typescript' },
  { id: 'java', label: 'Java', monacoLang: 'java' },
  { id: 'c', label: 'C', monacoLang: 'c' },
  { id: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { id: 'go', label: 'Go', monacoLang: 'go' },
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

const LANGUAGE_COMPLETIONS: Record<string, string[]> = {
  python: ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'while', 'for', 'in', 'try', 'except', 'finally', 'with', 'as', 'pass', 'break', 'continue', 'yield', 'lambda', 'global', 'nonlocal', 'assert', 'del', 'True', 'False', 'None', 'and', 'or', 'not', 'is', 'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'open', 'type', 'sum', 'min', 'max', 'abs'],
  java: ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'String', 'System.out.println', 'System.out.print', 'Math'],
  c: ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'printf', 'scanf', 'malloc', 'free', 'NULL', '#include'],
  cpp: ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'class', 'catch', 'const_cast', 'delete', 'dynamic_cast', 'explicit', 'export', 'false', 'friend', 'inline', 'mutable', 'namespace', 'new', 'operator', 'private', 'protected', 'public', 'reinterpret_cast', 'static_cast', 'template', 'this', 'throw', 'true', 'try', 'typeid', 'typename', 'using', 'virtual', 'cout', 'cin', 'endl', 'std', 'vector', 'string', 'map', 'set', '#include'],
  go: ['break', 'default', 'func', 'interface', 'select', 'case', 'defer', 'go', 'map', 'struct', 'chan', 'else', 'goto', 'package', 'switch', 'const', 'fallthrough', 'if', 'range', 'type', 'continue', 'for', 'import', 'return', 'var', 'fmt.Println', 'fmt.Printf', 'make', 'new', 'len', 'cap', 'append', 'close', 'panic', 'recover', 'string', 'int', 'int64', 'float64', 'bool'],
};

const LANGUAGE_SNIPPETS: Record<string, { label: string, insertText: string, documentation?: string }[]> = {
  python: [
    { label: 'def', insertText: 'def ${1:name}(${2:args}):\n\t${3:pass}', documentation: 'Function definition' },
    { label: 'class', insertText: 'class ${1:Name}:\n\tdef __init__(self):\n\t\t${2:pass}', documentation: 'Class definition' },
    { label: 'for', insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', documentation: 'For loop' },
    { label: 'if', insertText: 'if ${1:condition}:\n\t${2:pass}', documentation: 'If statement' },
  ],
  java: [
    { label: 'sout', insertText: 'System.out.println(${1});', documentation: 'Print to standard output' },
    { label: 'psvm', insertText: 'public static void main(String[] args) {\n\t${1}\n}', documentation: 'Main method' },
    { label: 'fori', insertText: 'for (int i = 0; i < ${1:length}; i++) {\n\t${2}\n}', documentation: 'For loop' },
    { label: 'class', insertText: 'public class ${1:Name} {\n\t${2}\n}', documentation: 'Class definition' },
  ],
  c: [
    { label: 'main', insertText: 'int main() {\n\t${1}\n\treturn 0;\n}', documentation: 'Main function' },
    { label: 'for', insertText: 'for (int i = 0; i < ${1:length}; i++) {\n\t${2}\n}', documentation: 'For loop' },
    { label: 'printf', insertText: 'printf("${1:%d}\\n", ${2:var});', documentation: 'Print formatted' },
  ],
  cpp: [
    { label: 'main', insertText: 'int main() {\n\t${1}\n\treturn 0;\n}', documentation: 'Main function' },
    { label: 'fori', insertText: 'for (int i = 0; i < ${1:length}; i++) {\n\t${2}\n}', documentation: 'For loop' },
    { label: 'cout', insertText: 'std::cout << ${1} << std::endl;', documentation: 'Print to standard output' },
  ],
  go: [
    { label: 'main', insertText: 'func main() {\n\t${1}\n}', documentation: 'Main function' },
    { label: 'for', insertText: 'for ${1:i} := 0; $1 < ${2:length}; $1++ {\n\t${3}\n}', documentation: 'For loop' },
    { label: 'forr', insertText: 'for ${1:i}, ${2:v} := range ${3:iterable} {\n\t${4}\n}', documentation: 'For range loop' },
    { label: 'func', insertText: 'func ${1:name}(${2:args}) ${3:ret} {\n\t${4}\n}', documentation: 'Function definition' },
    { label: 'fmt.Println', insertText: 'fmt.Println(${1})', documentation: 'Print line' },
  ],
};

let intellisenseRegistered = false;

function registerIntellisense(monaco: Monaco) {
  if (intellisenseRegistered) return;
  intellisenseRegistered = true;

  Object.keys(LANGUAGE_COMPLETIONS).forEach((lang) => {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];

        // Add Keywords
        LANGUAGE_COMPLETIONS[lang].forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range
          });
        });

        // Add Snippets
        if (LANGUAGE_SNIPPETS[lang]) {
          LANGUAGE_SNIPPETS[lang].forEach(snippet => {
            suggestions.push({
              label: snippet.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: snippet.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: snippet.documentation,
              range
            });
          });
        }

        return { suggestions };
      }
    });
  });
}

function defineQuestTheme(monaco: Monaco) {
  monaco.editor.defineTheme('quest-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '666666', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'D91F40', fontStyle: 'bold' },
      { token: 'string', foreground: 'E3E3E3' },
      { token: 'number', foreground: 'D91F40' },
      { token: 'type', foreground: 'E3E3E3' },
      { token: 'function', foreground: 'D91F40' },
      { token: 'variable', foreground: 'FFFFFF' },
      { token: 'delimiter', foreground: '444444' },
    ],
    colors: {
      'editor.background': '#00000000',
      'editor.foreground': '#E2E8F0',
      'editor.lineHighlightBackground': '#D91F4008',
      'editor.selectionBackground': '#D91F4030',
      'editorCursor.foreground': '#D91F40',
      'editorLineNumber.foreground': '#2D3748',
      'editorLineNumber.activeForeground': '#D91F40',
      'editor.inactiveSelectionBackground': '#D91F4015',
      'editorIndentGuide.background1': '#1A1D21',
      'editorIndentGuide.activeBackground1': '#2D3748',
      'scrollbarSlider.background': '#D91F4010',
      'scrollbarSlider.hoverBackground': '#D91F4020',
      'editorWidget.background': '#100F2CF0',
      'input.background': '#100F2C',
      'focusBorder': '#000000',
      'editor.focusBorder': '#000000',
    },
  });
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage, starterCode: string) => void;
  onRun?: (code?: string) => void;
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
  const onRunRef = useRef(onRun);

  // Sync ref with latest prop
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  // Global Ctrl/Cmd+Enter shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        // Always grab latest from editor if mounted, otherwise fallback to prop value
        const currentCode = editorRef.current?.getValue() || value;
        onRunRef.current?.(currentCode);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [value]);

  const handleMount = (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = ed;
    defineQuestTheme(monaco);
    registerIntellisense(monaco);
    monaco.editor.setTheme('quest-dark');
    // Ctrl+Enter inside the editor
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const currentCode = ed.getValue();
      onRunRef.current?.(currentCode);
    });
  };

  const handleBeforeMount = (monaco: Monaco) => {
    defineQuestTheme(monaco);
    registerIntellisense(monaco);
  };

  const handleLanguageSwitch = (lang: SupportedLanguage) => {
    const starter =
      lang === defaultLanguage && defaultCode ? defaultCode : LANGUAGE_TEMPLATES[lang];
    onLanguageChange(lang, starter);
  };

  const monacoLang = LANGUAGE_OPTIONS.find(l => l.id === language)?.monacoLang ?? 'plaintext';

  return (
    <div className="flex flex-col overflow-hidden glass-morphism rounded-none border border-[var(--color-accent)]/20 shadow-[0_0_20px_rgba(217,31,64,0.1)]">
      {/* Language Tabs */}
      <div className="flex items-center glass-morphism-bar overflow-x-auto scrollbar-hide border-b border-[var(--color-accent)]/20">
        {LANGUAGE_OPTIONS.map(opt => {
          const active = opt.id === language;
          return (
            <button
              key={opt.id}
              onClick={() => handleLanguageSwitch(opt.id)}
              className={[
                'flex-shrink-0 px-5 py-3 text-[10px] font-mono uppercase tracking-widest relative overflow-hidden transition-all duration-200',
                'border-r border-white/5',
                active
                  ? 'text-white'
                  : 'text-white/20 hover:text-white/50 hover:bg-white/[0.02]',
              ].join(' ')}
            >
              {active && (
                <>
                  <div className="absolute inset-0 bg-black/60" />
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/5" />
                </>
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
        <div className="ml-auto flex-shrink-0 px-4 py-2 text-[9px] font-mono text-white/20 uppercase tracking-widest whitespace-nowrap">
          Ctrl+Enter ▶ Run
        </div>
      </div>

      {/* Monaco Editor Wrapper */}
      <div className="glass-morphism-editor border-t-0 [&_textarea]:caret-transparent">
        <MonacoEditor
          height={height}
          language={monacoLang}
          value={value}
          onChange={v => onChange(v ?? '')}
          beforeMount={defineQuestTheme}
          onMount={handleMount}
          theme="quest-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontLigatures: true,
            lineHeight: 22,
            padding: { top: 14, bottom: 14 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
            automaticLayout: true,
            cursorStyle: 'line',
            cursorBlinking: 'solid',
            renderLineHighlight: 'line',
            renderWhitespace: 'none',
            smoothScrolling: true,
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            contextmenu: false,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
          }}
        />
      </div>
    </div>
  );
}
