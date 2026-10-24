import { InlineMath } from 'react-katex';

export default function MathText({ text = '' }) {
  const parts = String(text).split(/(\$[^$]+\$)/g);
  return <span>{parts.map((part, index) => part.startsWith('$') && part.endsWith('$')
    ? <InlineMath key={index} math={part.slice(1, -1)} />
    : <span key={index}>{part}</span>)}</span>;
}
