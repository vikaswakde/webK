import React from 'react';
import ReactDOM, { type Root } from 'react-dom/client';
import ChatModal from './ChatModal';
import modalStyles from './style.css?inline';
import propertiesStyles from './tailwind-properties.css?inline';
import DOMPurify from 'dompurify';

console.log('[Web‑K] content script loaded');

// Prevent duplicate listeners if the content script evaluates more than once
if ((window as any).__WEBK_INSTALLED__) {
  console.debug('[Web‑K] content already initialized');
} else {
  (window as any).__WEBK_INSTALLED__ = true;
}

const MODAL_ROOT_ID = 'web-k-modal-root';
const PROPERTIES_STYLE_ID = 'web-k-properties';

let shadowRootRef: ShadowRoot | null = null;
let hostRef: HTMLDivElement | null = null;
let modalContainerRef: HTMLDivElement | null = null;
let reactRootRef: Root | null = null;

// Inject Tailwind @property declarations into the main document (outside shadow root)
// This works around the limitation that @property isn't supported in shadow roots
const injectPropertiesStyles = () => {
  if (document.getElementById(PROPERTIES_STYLE_ID)) return; // Already injected
  
  const styleEl = document.createElement('style');
  styleEl.id = PROPERTIES_STYLE_ID;
  styleEl.textContent = propertiesStyles;
  document.head.appendChild(styleEl);
  console.debug('[Web‑K] Injected Tailwind @property declarations into main document');
};

const removeModal = () => {
  if (reactRootRef) {
    try { reactRootRef.unmount(); } catch {}
    reactRootRef = null;
  }
  if (modalContainerRef) {
    modalContainerRef.innerHTML = '';
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
  // Use DOMPurify to prevent XSS.
  // It is configured to be safe by default.
  return DOMPurify.sanitize(html);
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

function ensureShadowHost(): { shadow: ShadowRoot; modal: HTMLDivElement } {
  if (shadowRootRef && modalContainerRef) {
    return { shadow: shadowRootRef, modal: modalContainerRef };
  }
  
  // Inject @property declarations into main document first
  injectPropertiesStyles();
  
  // Host
  hostRef = document.getElementById(MODAL_ROOT_ID) as HTMLDivElement | null;
  if (!hostRef) {
    hostRef = document.createElement('div');
    hostRef.id = MODAL_ROOT_ID;
    document.documentElement.appendChild(hostRef);
  }
  const shadow = (shadowRootRef ||= hostRef.attachShadow({ mode: 'open' }));

  // Styles inside shadow
  const resetEl = document.createElement('style');
  resetEl.textContent = `:host{all:initial; contain: content}`;
  shadow.appendChild(resetEl);
  const styleEl = document.createElement('style');
  styleEl.textContent = modalStyles;
  shadow.appendChild(styleEl);

  // Containers
  modalContainerRef = document.createElement('div');
  modalContainerRef.id = 'webk-modal-container';
  shadow.appendChild(modalContainerRef);

  return { shadow, modal: modalContainerRef };
}

const openModal = (selectedText: string) => {
  const { modal } = ensureShadowHost();
  removeModal();

  reactRootRef = ReactDOM.createRoot(modal);
  const pageContext = buildPageContext(selectedText);
  reactRootRef.render(
    <React.StrictMode>
      <ChatModal selectedText={selectedText} pageContext={pageContext} onClose={removeModal} />
    </React.StrictMode>
  );
  console.debug('[Web‑K] modal rendered');
};

// Helper retained for potential future use; currently unused.
// function getSelectedText(): string {
//   return window.getSelection()?.toString() ?? '';
// }

const keyHandler = (event: KeyboardEvent) => {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const modifierKey = isMac ? event.metaKey : event.ctrlKey;
  const isKeyK = event.code === 'KeyK' || event.key.toLowerCase() === 'k';

  const acceptsPrimaryCombo = modifierKey && event.shiftKey && isKeyK; // Cmd/Ctrl+Shift+K
  const acceptsAltCombo = event.altKey && isKeyK; // Alt+K fallback (avoids some browser-reserved shortcuts)

  if (acceptsPrimaryCombo || acceptsAltCombo) {
    const selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) {
      console.debug('[Web‑K] hotkey pressed but no selection');
      return;
    }
    // Try to prevent browser/website handlers from hijacking
    event.preventDefault();
    event.stopPropagation();
    console.debug('[Web‑K] hotkey detected');
    if (window !== window.top) {
      // Relay to top frame so the modal appears relative to the full page
      window.top?.postMessage({ __webk: true, type: 'OPEN', selectedText }, '*');
    } else {
      openModal(selectedText);
    }
  }
};

// Capture early to beat site handlers; also listen on window
window.addEventListener('keydown', keyHandler, { capture: true });
document.addEventListener('keydown', keyHandler, { capture: true });

// Listen only in the top frame for open requests from child frames
const messageHandler = (event: MessageEvent) => {
  const data = (event && (event as MessageEvent).data) as any;
  if (!data || data.__webk !== true || data.type !== 'OPEN') return;
  if (window !== window.top) return;
  const selectedText = typeof data.selectedText === 'string' ? data.selectedText.trim() : '';
  if (!selectedText) return;
  console.debug('[Web‑K] message received from frame → opening modal');
  openModal(selectedText);
};
window.addEventListener('message', messageHandler, true);

// No selection bubble — hotkey only
