'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  type?: 'summary' | 'qa' | 'regular';
  bulletPoints?: {
    text: string;
    timestamp: number;
  }[];
}

interface BulletPoint {
  text: string;
  timestamp: number;
  isPlaying: boolean;
}

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBulletPoint, setSelectedBulletPoint] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        // Trigger play/pause in the main audio player
        // This will be handled through a callback prop
      }

      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        setSelectedBulletPoint(prev => {
          if (prev === null) return 0;
          const bulletPoints = messages.flatMap(m => m.bulletPoints || []);
          const newIndex = prev + (e.code === 'ArrowUp' ? -1 : 1);
          return Math.max(0, Math.min(newIndex, bulletPoints.length - 1));
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Listen for transcript updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TRANSCRIPT_READY') {
        setTranscript(event.data.transcript);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle bullet point click
  const handleBulletPointClick = (timestamp: number) => {
    window.postMessage({
      type: 'PLAY_AUDIO',
      timestamp
    }, '*');
  };

  // Add clear chat function
  const handleClearChat = () => {
    setMessages([]);
    setSelectedBulletPoint(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !transcript) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          type: userMessage.toLowerCase().includes('summarize') ? 'summary' : 'qa',
          transcript
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message,
        type: data.type,
        bulletPoints: data.bulletPoints
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: transcript 
          ? error instanceof Error 
            ? error.message
            : 'Sorry, I encountered an error. Please try again.' 
          : 'Please wait for the transcript to be ready before asking questions.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderBulletPoints = (bulletPoints?: { text: string; timestamp: number }[]) => {
    if (!bulletPoints) return null;

    return (
      <div className="space-y-3 mt-3">
        {bulletPoints.map((point, index) => (
          <div 
            key={index}
            className={`group flex items-start space-x-3 p-3 rounded-lg transition-all duration-200
              ${selectedBulletPoint === index 
                ? 'bg-blue-50 ring-1 ring-blue-200' 
                : 'hover:bg-gray-50'
              }`}
          >
            {/* Play Button */}
            <button
              onClick={() => {
                setSelectedBulletPoint(index);
                handleBulletPointClick(point.timestamp);
              }}
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                ${selectedBulletPoint === index
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-md'
                }`}
              aria-label="Play from this timestamp"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={selectedBulletPoint === index
                    ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" // Pause icon
                    : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" // Play icon
                  }
                />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              {/* Timestamp */}
              <button
                onClick={() => handleBulletPointClick(point.timestamp)}
                className={`inline-block mb-1 px-2 py-0.5 text-xs font-medium rounded transition-all duration-200
                  ${selectedBulletPoint === index
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                  }`}
              >
                {formatTimestamp(point.timestamp)}
              </button>

              {/* Content */}
              <p className={`text-sm leading-relaxed transition-colors duration-200
                ${selectedBulletPoint === index ? 'text-blue-900' : 'text-gray-700'}
              `}>
                {point.text}
              </p>
            </div>

            {/* Hover Indicator */}
            <div className={`flex-shrink-0 w-1 self-stretch rounded-full transition-all duration-200
              ${selectedBulletPoint === index 
                ? 'bg-blue-500' 
                : 'bg-transparent group-hover:bg-blue-200'
              }`}
            />
          </div>
        ))}
      </div>
    );
  };

  // Add this helper function for timestamp formatting
  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-[4.5rem] h-[4.5rem] rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-10 h-10">
            {/* Rotating circle animation */}
            <div className={`absolute inset-0 border-2 border-white rounded-full ${isOpen ? '' : 'animate-spin'}`} />
            {/* Robot face */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" 
                />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 left-0 w-[30rem] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          >
            {/* Chat Header */}
            <div className="p-5 bg-blue-500 text-white">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold">Hagazi AI</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleClearChat}
                    className="p-2 hover:bg-blue-600 rounded-full transition-colors"
                    title="Clear chat history"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-blue-600 rounded-full transition-colors"
                    title="Close chat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-base opacity-90">
                {transcript 
                  ? 'Ask questions or type "summarize" for key points'
                  : 'Waiting for transcript... Please generate it first.'
                }
              </p>
            </div>

            {/* Messages Container */}
            <div 
              ref={chatContainerRef}
              className="h-[520px] overflow-y-auto p-5 space-y-4"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.role === 'assistant' && renderBulletPoints(message.bulletPoints)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3 rounded-bl-none">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={transcript 
                    ? 'Ask a question or type "summarize" for key points...'
                    : 'Please generate transcript first...'
                  }
                  disabled={!transcript}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || !transcript}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 