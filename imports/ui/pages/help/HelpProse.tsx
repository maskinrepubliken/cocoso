import React from 'react';
import { Link } from 'react-router';

// One piece of a help page's text, as written in help.yml: a paragraph (a
// plain string), a bulleted list, numbered steps or a note.
export type HelpBlock =
  | string
  | { list: string[] }
  | { steps: string[] }
  | { note: string };

export interface HelpSection {
  title: string;
  body: HelpBlock[];
}

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

// The two marks the text may use: **bold** and [a link](/somewhere). A
// link that starts with a slash stays inside the site.
function inline(text: string): React.ReactNode[] {
  return String(text)
    .split(INLINE)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (!link) {
        return <React.Fragment key={index}>{part}</React.Fragment>;
      }
      const [, label, href] = link;
      return href.startsWith('/') ? (
        <Link key={index} to={href}>
          {label}
        </Link>
      ) : (
        <a key={index} href={href} rel="noopener noreferrer">
          {label}
        </a>
      );
    });
}

function Block({ block }: { block: HelpBlock }) {
  if (typeof block === 'string') {
    return <p>{inline(block)}</p>;
  }
  if ('list' in block) {
    return (
      <ul>
        {block.list.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ul>
    );
  }
  if ('steps' in block) {
    return (
      <ol>
        {block.steps.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ol>
    );
  }
  if ('note' in block) {
    return <p className="help-note">{inline(block.note)}</p>;
  }
  return null;
}

export default function HelpProse({ sections }: { sections: HelpSection[] }) {
  if (!Array.isArray(sections)) {
    return null;
  }
  return (
    <>
      {sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.body?.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
    </>
  );
}
