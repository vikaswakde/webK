import React, { useState } from 'react';

interface ChatModalProps {
  selectedText: string;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ selectedText, onClose }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = () => {
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setResponse('');

    chrome.runtime.sendMessage(
      {
        type: 'ASK_AI',
        payload: {
          selectedText,
          question,
        },
      },
      (res) => {
        setIsLoading(false);
        if (chrome.runtime.lastError) {
          setError(`Error: ${chrome.runtime.lastError.message}`);
        } else if (res.success) {
          setResponse(res.response);
        } else {
          setError(`Error: ${res.error || 'An unknown error occurred.'}`);
        }
      }
    );
  };

  return (
    <div className="fixed top-4 right-4 z-2147483647 w-96 bg-white rounded-lg shadow-2xl border border-gray-300 font-sans flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Web-K AI</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
          &times;
        </button>
      </div>
      <div className="p-4 grow max-h-96 overflow-y-auto">
        <div className="p-2 rounded-md bg-gray-50 max-h-40 overflow-y-auto mb-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            <strong>Selected Text:</strong>
            <br />
            {selectedText}
          </p>
        </div>

        {isLoading && <p className="text-sm text-center text-gray-500">Asking AI...</p>}
        {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
        {response && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-gray-200">
        <textarea
          rows={3}
          placeholder="Ask a question about the selected text..."
          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isLoading}
        />
        <button
          onClick={handleAsk}
          className="mt-2 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? 'Thinking...' : 'Ask'}
        </button>
      </div>
    </div>
  );
};

export default ChatModal;
