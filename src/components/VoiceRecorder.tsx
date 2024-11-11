'use client';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { RefreshCw, Copy, Share2, Mic, Settings as SettingsIcon, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

// Add these types at the top of the file
interface GroqResponse {
  choices: [{
    message: {
      content: string;
    }
  }];
}

export default function VoiceRecorder() {
  const {
    isRecording,
    startRecording,
    stopRecording,
    clearTranscription,
  } = useVoiceRecorder();
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Load API key on component mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        // Try IndexedDB first
        if ('indexedDB' in window) {
          const db = await openDB();
          const key = await getFromDB(db, 'apiKey');
          if (key) {
            setApiKey(key);
            return;
          }
        }
        // Fallback to localStorage
        const storedKey = localStorage.getItem('groqApiKey');
        if (storedKey) {
          setApiKey(storedKey);
        }
      } catch (error) {
        console.error('Error loading API key:', error);
      }
    };

    loadApiKey();
  }, []);

  // IndexedDB functions
  const openDB = () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('VoiceRecorderDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };
    });
  };

  const saveToDb = async (db: IDBDatabase, key: string, value: string) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put(value, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };

  const getFromDB = async (db: IDBDatabase, key: string) => {
    return new Promise<string>((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };

  // Save API key
  const saveApiKey = async (newApiKey: string) => {
    try {
      // Try IndexedDB first
      if ('indexedDB' in window) {
        const db = await openDB();
        await saveToDb(db, 'apiKey', newApiKey);
      }
      // Also save to localStorage as fallback
      localStorage.setItem('groqApiKey', newApiKey);
      setApiKey(newApiKey);
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving API key:', error);
      // Fallback to just localStorage if IndexedDB fails
      localStorage.setItem('groqApiKey', newApiKey);
      setApiKey(newApiKey);
      setShowSettings(false);
    }
  };

  // Rest of your existing functions
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcribedText);
      console.log('Text copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Voice Recording Transcript',
          text: transcribedText,
        });
        console.log('Successfully shared');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await copyToClipboard();
    }
  };

  // Add this function to process text with Groq
  const processWithGroq = async (text: string) => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('https://api.groq.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that organizes and enhances text. Format lists appropriately, fix grammar, and improve clarity while maintaining the original meaning. Keep the tone natural and conversational."
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: GroqResponse = await response.json();
      setTranscribedText(data.choices[0].message.content);
    } catch (error) {
      console.error('Error processing text:', error);
      setError('Failed to process text. Please check your API key and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearTranscription = () => {
    clearTranscription();
    setTranscribedText('');
  };

  return (
    <div className="w-full min-h-[100dvh] sm:min-h-0 sm:h-[800px] max-w-full sm:max-w-[400px] mx-auto bg-[#1a1a1a] rounded-3xl shadow-xl overflow-hidden flex flex-col">
      {/* Main content - Reorganized layout */}
      <div className="flex-1 flex flex-col px-4 pb-6">
        {/* Transcription area at top */}
        <div className="relative bg-[#2a2a2a] rounded-2xl p-4 flex-1 mt-4">
          <textarea
            value={transcribedText}
            readOnly
            className="w-full h-full bg-transparent text-gray-200 resize-none focus:outline-none min-h-[200px]"
            placeholder="Transcribed text will appear here..."
          />
          
          {/* Control buttons inside transcription area */}
          <div className="absolute bottom-4 left-4">
            <button
              onClick={handleClearTranscription}
              className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              title="Clear text"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <button
              onClick={() => processWithGroq(transcribedText)}
              disabled={!transcribedText || isProcessing}
              className={`p-2 hover:bg-gray-700 rounded-full transition-colors ${
                isProcessing ? 'animate-spin' : ''
              }`}
              title="Enhance text with AI"
            >
              <Sparkles className={`w-4 h-4 ${
                isProcessing ? 'text-blue-400' : 'text-gray-400'
              }`} />
            </button>
          </div>
          <div className="absolute bottom-4 right-4">
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Bottom controls section */}
        <div className="flex items-center justify-between mt-6 px-4">
          <button
            onClick={() => setShowSettings(true)}
            className="p-4 hover:bg-gray-800 rounded-full transition-colors"
          >
            <SettingsIcon className="w-6 h-6 text-gray-400" />
          </button>

          {/* Center microphone button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-8 rounded-full transition-all transform ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 scale-110' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            <Mic className="w-8 h-8 text-white" />
          </button>

          <button
            onClick={handleShare}
            className="p-4 hover:bg-gray-800 rounded-full transition-colors"
          >
            <Share2 className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2a2a2a] rounded-2xl p-6 w-[90%] max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">Groq API</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10"
                    placeholder="Enter your Groq API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded-full transition-colors"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveApiKey(apiKey)}
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add error toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
} 