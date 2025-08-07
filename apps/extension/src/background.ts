console.log('background script loaded');

const API_URL = 'http://localhost:3001/api/ask'; // Your backend server URL

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
