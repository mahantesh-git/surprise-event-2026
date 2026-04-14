import React from 'react';

export function highlightCode(code: string): React.ReactNode[] {
  const keywords = /\b(def|return|if|else|for|while|import|from|as|in|is|not|and|or|print|yield|try|except|finally|with|class|lambda)\b/g;
  const numbers = /\b\d+(\.\d+)?\b/g;
  const strings = /(['"])(?:(?!\1)[^\\]|\\.)*\1/g;
  const comments = /#.*$/;
  const operators = /([+\-*/%=<>!&|^~]+)/g;

  return code.split('\n').map((line, i) => {
    let lastIndex = 0;
    const items: React.ReactNode[] = [];
    
    // Combine all regexes into one to find matches in order
    const combined = new RegExp(`(${strings.source})|(${comments.source})|(${keywords.source})|(${numbers.source})|(${operators.source})`, 'g');
    
    let match;
    while ((match = combined.exec(line)) !== null) {
      // Add plain text before match
      if (match.index > lastIndex) {
        items.push(line.substring(lastIndex, match.index));
      }
      
      const text = match[0];
      let type = '';
      if (match[1]) type = 'syntax-string';
      else if (match[2]) type = 'syntax-comment';
      else if (match[3]) type = 'syntax-keyword';
      else if (match[4]) type = 'syntax-number';
      else if (match[6]) type = 'syntax-op'; // match[5] is the decimal point group in numbers

      items.push(<span key={match.index} className={type}>{text}</span>);
      lastIndex = combined.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      items.push(line.substring(lastIndex));
    }

    return (
      <div key={i} className="min-h-[1.5em] flex gap-4">
        <span className="w-8 text-white/10 select-none text-right font-mono text-[10px]">{i + 1}</span>
        <div className="flex-1 whitespace-pre">{items.length > 0 ? items : "\u00A0"}</div>
      </div>
    );
  });
}
