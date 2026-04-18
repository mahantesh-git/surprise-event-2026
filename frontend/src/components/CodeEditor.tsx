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

function defineQuestTheme(monaco: Monaco) {
  if (!intellisenseRegistered) {
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

          LANGUAGE_COMPLETIONS[lang].forEach(keyword => {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range
            });
          });

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

  monaco.editor.defineTheme('quest-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
      { token: 'keyword', foreground: '95FF00', fontStyle: 'bold' },
      { token: 'string', foreground: 'a8e6cf' },
      { token: 'number', foreground: '68d391' },
      { token: 'type', foreground: '63b3ed' },
      { token: 'function', foreground: 'f6ad55' },
      { token: 'variable', foreground: 'e2e8f0' },
      { token: 'delimiter', foreground: '718096' },
    ],
    colors: {
      'editor.background': '#1C1C1C',           // --color-bg-surface
      'editor.foreground': '#E2E8F0',
      'editor.lineHighlightBackground': '#131314', // --color-bg-void
      'editor.selectionBackground': '#EE3A1730',  // --color-accent + 30 alpha
      'editorCursor.foreground': '#EE3A17',       // --color-accent
      'editorLineNumber.foreground': '#2D3748',
      'editorLineNumber.activeForeground': '#EE3A17', // --color-accent
      'editor.inactiveSelectionBackground': '#EE3A1715',
      'editorIndentGuide.background1': '#1A1D21',
      'editorIndentGuide.activeBackground1': '#2D3748',
      'scrollbarSlider.background': '#2D374850',
      'scrollbarSlider.hoverBackground': '#4A556850',
      'editorWidget.background': '#131314',       // --color-bg-void
      'input.background': '#131314',              // --color-bg-void
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
    <div className="flex flex-col overflow-hidden border border-white/10 bg-[var(--color-bg-surface)]">
      {/* Language Tabs */}
      <div className="flex items-center border-b border-white/10 bg-[var(--color-bg-void)] overflow-x-auto scrollbar-hide">
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
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]'
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
          cursorBlinking: 'phase',
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
  );
}
