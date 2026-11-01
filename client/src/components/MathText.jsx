import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

function renderTextWithBold(text, keyPrefix) {
  if (!text) return null;
  const boldParts = text.split(/(\*\*[^*]+?\*\*)/g);
  return boldParts.map((sub, i) => {
    if (sub.startsWith('**') && sub.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-foreground">
          {sub.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-t-${i}`}>{sub}</span>;
  });
}

export default function MathText({ text = '', className = '' }) {
  if (!text) return null;

  // 1. Normalize LaTeX delimiters:
  // \( math \) -> $math$
  // \[ math \] -> $$math$$
  const normalized = String(text)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);

  // 2. Tokenize by $$...$$ (block math) and $...$ (inline math)
  const regex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
  const parts = normalized.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          return (
            <span key={index} className="block my-2 text-center overflow-x-auto">
              <BlockMath math={math} renderError={() => <code className="font-mono text-xs">{math}</code>} />
            </span>
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          return (
            <InlineMath key={index} math={math} renderError={() => <code className="font-mono text-xs">{math}</code>} />
          );
        }
        return renderTextWithBold(part, index);
      })}
    </span>
  );
}

