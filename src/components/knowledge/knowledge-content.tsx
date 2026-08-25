import Link from "next/link";

function inlineText(value: string) {
  return value.split(/(\[[^\]]+\]\([^\)]+\))/gu).map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/u);
    if (!match) return <span key={index}>{part}</span>;
    const [, label, href] = match;
    if (href.startsWith("/")) return <Link key={index} href={href}>{label}</Link>;
    if (!/^https?:\/\//iu.test(href)) return <span key={index}>{label}</span>;
    return <a key={index} href={href} target="_blank" rel="noreferrer">{label}</a>;
  });
}

export function KnowledgeContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/u);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let ordered = false;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p-${blocks.length}`}>{inlineText(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    const items = list.map((item) => <li key={item}>{inlineText(item)}</li>);
    blocks.push(ordered ? <ol key={`ol-${blocks.length}`}>{items}</ol> : <ul key={`ul-${blocks.length}`}>{items}</ul>);
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{2,3})\s+(.+)$/u);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/u);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/u);
    if (!trimmed) { flushParagraph(); flushList(); continue; }
    if (heading) { flushParagraph(); flushList(); const level = heading[1].length; blocks.push(level === 2 ? <h2 key={`h-${blocks.length}`}>{inlineText(heading[2])}</h2> : <h3 key={`h-${blocks.length}`}>{inlineText(heading[2])}</h3>); continue; }
    if (bullet || numbered) { flushParagraph(); if (ordered !== Boolean(numbered) && list.length) flushList(); ordered = Boolean(numbered); list.push((bullet ?? numbered)![1]); continue; }
    if (trimmed.startsWith("> ")) { flushParagraph(); flushList(); blocks.push(<aside className="knowledge-callout" key={`c-${blocks.length}`}>{inlineText(trimmed.slice(2))}</aside>); continue; }
    paragraph.push(trimmed);
  }
  flushParagraph(); flushList();
  return <div className="knowledge-content">{blocks}</div>;
}
