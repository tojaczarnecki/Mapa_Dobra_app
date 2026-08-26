"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Minus, Quote, Redo2, Undo2 } from "lucide-react";
import { useUnsavedChanges } from "@/components/admin/unsaved-changes";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function safeHref(value: string) {
  const href = value.trim();
  if (href.startsWith("/")) return href;
  if (/^https?:\/\//iu.test(href)) return href;
  return "";
}

function inlineMarkdown(value: string) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/gu, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gu, (_, label: string, href: string) => {
    const safe = safeHref(href);
    return safe ? `<a href="${escapeHtml(safe)}">${label}</a>` : label;
  });
  html = html.replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/gu, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/gu, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/gu, "<em>$1</em>");
  return html;
}

function markdownToHtml(value: string) {
  const lines = value.split(/\r?\n/u);
  const output: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let ordered = false;
  const flushParagraph = () => { if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`); paragraph = []; };
  const flushList = () => { if (!list.length) return; const tag = ordered ? "ol" : "ul"; output.push(`<${tag}>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${tag}>`); list = []; };
  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{2,3})\s+(.+)$/u);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/u);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/u);
    if (!trimmed) { flushParagraph(); flushList(); continue; }
    if (heading) { flushParagraph(); flushList(); output.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`); continue; }
    if (bullet || numbered) { flushParagraph(); if (list.length && ordered !== Boolean(numbered)) flushList(); ordered = Boolean(numbered); list.push((bullet ?? numbered)![1]); continue; }
    if (trimmed === "---") { flushParagraph(); flushList(); output.push("<hr>"); continue; }
    if (trimmed.startsWith("> ")) { flushParagraph(); flushList(); output.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`); continue; }
    paragraph.push(trimmed);
  }
  flushParagraph(); flushList();
  return output.join("");
}

function nodeMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return Array.from(node.childNodes).map(nodeMarkdown).join("");
  const content = Array.from(node.childNodes).map(nodeMarkdown).join("");
  const tag = node.tagName.toLowerCase();
  if (tag === "strong" || tag === "b") return `**${content}**`;
  if (tag === "em" || tag === "i") return `*${content}*`;
  if (tag === "code") return `\`${content}\``;
  if (tag === "a") { const href = safeHref(node.getAttribute("href") ?? ""); return href ? `[${content}](${href})` : content; }
  if (tag === "br") return "\n";
  if (tag === "hr") return "---";
  if (tag === "blockquote") return content.split("\n").map((line) => `> ${line}`).join("\n");
  if (tag === "li") return content;
  if (tag === "ul") return Array.from(node.children).map((item) => `- ${nodeMarkdown(item)}`).join("\n");
  if (tag === "ol") return Array.from(node.children).map((item, index) => `${index + 1}. ${nodeMarkdown(item)}`).join("\n");
  if (["h2", "h3"].includes(tag)) return `${"#".repeat(Number(tag.slice(1)))} ${content}`;
  if (["p", "div"].includes(tag)) return content;
  return content;
}

function htmlToMarkdown(root: HTMLElement) {
  return Array.from(root.childNodes).map(nodeMarkdown).join("\n\n").replace(/\n{3,}/gu, "\n\n").trim();
}

function cleanPastedHtml(value: string) {
  const doc = new DOMParser().parseFromString(value, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,svg").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name.startsWith("on") || ["style", "class", "id"].includes(attribute.name)) node.removeAttribute(attribute.name);
    }
    if (node instanceof HTMLAnchorElement) {
      const href = safeHref(node.getAttribute("href") ?? "");
      if (href) node.setAttribute("href", href); else node.replaceWith(...Array.from(node.childNodes));
    }
  });
  return doc.body.innerHTML;
}

type Props = { name: string; initialValue?: string; value?: string; onValueChange?: (value: string) => void; required?: boolean };
const toolButton = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-brand-strong hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand";

export function MarkdownEditor({ name, initialValue = "", value: controlledValue, onValueChange, required = false }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [localValue, setLocalValue] = useState(controlledValue ?? initialValue);
  const value = controlledValue ?? localValue;
  const [preview, setPreview] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const dirty = value !== initialValue;
  useUnsavedChanges(dirty);

  useEffect(() => { if (editorRef.current) editorRef.current.innerHTML = markdownToHtml(initialValue); }, [initialValue]);
  useEffect(() => {
    if (controlledValue === undefined) return;
    if (editorRef.current && htmlToMarkdown(editorRef.current) !== controlledValue) editorRef.current.innerHTML = markdownToHtml(controlledValue);
    if (hiddenRef.current) hiddenRef.current.value = controlledValue;
  }, [controlledValue]);

  function sync() {
    if (!editorRef.current) return;
    const next = htmlToMarkdown(editorRef.current);
    setLocalValue(next);
    onValueChange?.(next);
    if (hiddenRef.current) hiddenRef.current.value = next;
  }
  function command(commandName: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(commandName, false, commandValue);
    sync();
  }
  function openLink() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
    setLinkUrl("");
    setLinkOpen(true);
  }
  function applyLink() {
    const href = safeHref(linkUrl);
    if (!href || !selectionRef.current || !editorRef.current) { setLinkOpen(false); return; }
    const selection = window.getSelection();
    selection?.removeAllRanges(); selection?.addRange(selectionRef.current);
    editorRef.current.focus();
    document.execCommand("createLink", false, href);
    setLinkOpen(false); sync();
  }
  function paste(event: React.ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData("text/html");
    if (!html) return;
    event.preventDefault();
    document.execCommand("insertHTML", false, cleanPastedHtml(html));
    sync();
  }
  return <div className="overflow-hidden rounded-lg border border-border bg-white">
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-white p-2" aria-label="Narzędzia formatowania">
      <select aria-label="Format akapitu" className="h-9 rounded-md border border-border bg-white px-2 text-sm font-semibold" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}>
        <option value="p">Tekst</option><option value="h2">Nagłówek 2</option><option value="h3">Nagłówek 3</option><option value="blockquote">Wyróżnienie</option>
      </select>
      <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
      <button type="button" className={toolButton} aria-label="Pogrubienie" onMouseDown={(event) => event.preventDefault()} onClick={() => command("bold")}><Bold size={17} aria-hidden="true" /></button>
      <button type="button" className={toolButton} aria-label="Kursywa" onMouseDown={(event) => event.preventDefault()} onClick={() => command("italic")}><Italic size={17} aria-hidden="true" /></button>
      <button type="button" className={toolButton} aria-label="Lista punktowana" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertUnorderedList")}><List size={17} aria-hidden="true" /></button>
      <button type="button" className={toolButton} aria-label="Lista numerowana" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertOrderedList")}><ListOrdered size={17} aria-hidden="true" /></button>
      <button type="button" className={toolButton} aria-label="Wstaw link" onMouseDown={(event) => event.preventDefault()} onClick={openLink}><LinkIcon size={17} aria-hidden="true" /></button>
      <button type="button" className={toolButton} aria-label="Wstaw separator" onClick={() => command("insertHorizontalRule")}><Minus size={17} aria-hidden="true" /></button>
      <button type="button" className={toolButton} aria-label="Cofnij" onClick={() => command("undo")}><Undo2 size={17} aria-hidden="true" /></button>
      <button type="button" className={toolButton} aria-label="Ponów" onClick={() => command("redo")}><Redo2 size={17} aria-hidden="true" /></button>
      <button type="button" className="ml-auto min-h-9 rounded-md px-2 text-sm font-semibold text-brand-strong hover:bg-brand-soft" onClick={() => setPreview((current) => !current)}>{preview ? "Edytuj" : "Podgląd"}</button>
    </div>
    {linkOpen ? <div className="flex flex-wrap items-end gap-2 border-b border-border bg-surface-muted p-3" role="dialog" aria-label="Wstaw link">
      <label className="min-w-[220px] flex-1 text-xs font-bold">Adres URL<input autoFocus value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://… lub /mapa" className="mt-1 min-h-10 w-full rounded-md border border-border bg-white px-3 text-sm font-normal" /></label>
      <button type="button" onClick={applyLink} className="min-h-10 rounded-md bg-brand px-3 text-sm font-bold">Wstaw</button><button type="button" onClick={() => setLinkOpen(false)} className="min-h-10 rounded-md px-3 text-sm font-semibold">Anuluj</button>
    </div> : null}
    <div ref={editorRef} contentEditable={!preview} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Treść artykułu" data-placeholder="Zacznij pisać artykuł…" onInput={sync} onPaste={paste} className={`knowledge-editor min-h-[340px] p-5 outline-none ${preview ? "hidden" : ""}`} />
    {preview ? <div className="knowledge-content min-h-[340px] p-5" dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }} /> : null}
    <input ref={hiddenRef} type="hidden" name={name} value={value} readOnly required={required} />
    <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground"><Quote size={14} aria-hidden="true" />Wyróżnienie, listy i linki są zapisywane w bezpiecznym Markdown.</div>
  </div>;
}
