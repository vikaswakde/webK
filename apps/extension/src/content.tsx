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

const openModal = (selectedText: string) => {
  // Ensure no old modal is present
  removeModal();

  const modalRoot = document.createElement('div');
  modalRoot.id = MODAL_ROOT_ID;
  document.body.appendChild(modalRoot);

  const root = ReactDOM.createRoot(modalRoot);
  root.render(
    <React.StrictMode>
      <ChatModal selectedText={selectedText} onClose={removeModal} />
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
