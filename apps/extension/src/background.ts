console.log('background script loaded');

import { API_URL } from './config';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // IMPORTANT: Validate the sender to ensure messages only come from your extension.
  if (sender.id !== chrome.runtime.id) {
    console.warn('Received message from untrusted sender:', sender);
    return false; // Do not process the message.
  }

  if (request.type === 'ASK_AI') {
    console.log('Received message, forwarding to backend...');

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Received response from backend:', data);
        sendResponse(data);
      })
      .catch((error) => {
        console.error('Error fetching from backend:', error);
        sendResponse({ success: false, error: error.message });
      });
  }
  // Return true to indicate you wish to send a response asynchronously
  return true;
});
