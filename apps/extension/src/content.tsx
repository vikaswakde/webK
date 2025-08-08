import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatModal from './ChatModal';
import './style.css';

console.log('content script loaded');

const MODAL_ROOT_ID = 'web-k-modal-root';

const removeModal = () => {
  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  if (modalRoot) {
    modalRoot.remove();
  }
};

type PageContext = {
  title: string;
  url: string;
  lang: string;
  metaDescription?: string;
  blockText?: string;
  beforeText?: string;
  afterText?: string;
  selectionHtml?: string;
};

function sanitizeHtml(html: string): string {
  // Basic sanitization: strip script/style and inline event handlers
  try {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.querySelectorAll('script, style').forEach((el) => el.remove());
    container.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        if (/^on/i.test(attr.name)) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return container.innerHTML;
  } catch {
    return '';
  }
}

function buildPageContext(selectedText: string): PageContext {
  const title = document.title || '';
  const url = location.href;
  const lang = document.documentElement.getAttribute('lang') || '';
  const metaDescription = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content || '';

  let blockText: string | undefined;
  let beforeText: string | undefined;
  let afterText: string | undefined;
  let selectionHtml: string | undefined;

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0).cloneRange();
    // selection HTML
    const frag = range.cloneContents();
    const div = document.createElement('div');
    div.appendChild(frag);
    selectionHtml = sanitizeHtml(div.innerHTML).slice(0, 4000);

    // find a reasonable block ancestor for context
    let node: Node | null = range.commonAncestorContainer;
    let el: HTMLElement | null = node instanceof HTMLElement ? node : node?.parentElement || null;
    const isBlock = (e: Element) => {
      const disp = getComputedStyle(e).display;
      return disp === 'block' || disp === 'list-item' || disp === 'table' || e.tagName.toLowerCase() === 'p' || e.tagName.toLowerCase().startsWith('h');
    };
    while (el && !isBlock(el) && el.parentElement) {
      el = el.parentElement;
    }
    if (el) {
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (text) {
        blockText = text.slice(0, 6000);
        const selected = selectedText;
        const idx = text.indexOf(selected);
        if (idx >= 0) {
          beforeText = text.slice(Math.max(0, idx - 1500), idx);
          afterText = text.slice(idx + selected.length, idx + selected.length + 1500);
        }
      }
    }
  }

  return { title, url, lang, metaDescription, blockText, beforeText, afterText, selectionHtml };
}

const openModal = (selectedText: string) => {
  // Ensure no old modal is present
  removeModal();

  const modalRoot = document.createElement('div');
  modalRoot.id = MODAL_ROOT_ID;
  document.body.appendChild(modalRoot);

  const root = ReactDOM.createRoot(modalRoot);
  const pageContext = buildPageContext(selectedText);
  root.render(
    <React.StrictMode>
      <ChatModal selectedText={selectedText} pageContext={pageContext} onClose={removeModal} />
    </React.StrictMode>
  );
};

document.addEventListener('keydown', (event) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? event.metaKey : event.ctrlKey;

  if (modifierKey && event.shiftKey && event.key === 'K') {
    const selectedText = window.getSelection()?.toString().trim();
    if (selectedText) {
      openModal(selectedText);
    } else {
      console.log('No text selected.');
    }
  }
});
