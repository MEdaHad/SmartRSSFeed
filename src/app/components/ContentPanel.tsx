'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useRef, useEffect } from 'react';
import { useAudio } from 'react-use';
import DOMPurify from 'isomorphic-dompurify';
import TranscriptCards from './TranscriptCards';

interface Word {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  punctuated_word?: string;
  speaker?: number;
}

interface ContentPanelProps {
  content?: string;
  title?: string;
  date?: string;
  link?: string;
  audioUrl?: string;
}

const contentStyles = `
  .content-html {
    color: #374151;
    line-height: 1.6;
  }
  .content-html p {
    margin-bottom: 1rem;
  }
  .content-html a {
    color: #2563eb;
    text-decoration: underline;
    transition: color 0.2s;
  }
  .content-html a:hover {
    color: #1d4ed8;
  }
  .content-html strong, .content-html b {
    font-weight: 600;
  }
  .content-html em, .content-html i {
    font-style: italic;
  }
  .content-html h1, .content-html h2, .content-html h3, 
  .content-html h4, .content-html h5, .content-html h6 {
    font-weight: 600;
    line-height: 1.25;
    margin: 1.5rem 0 1rem;
    color: #111827;
  }
  .content-html h1 { font-size: 2rem; }
  .content-html h2 { font-size: 1.5rem; }
  .content-html h3 { font-size: 1.25rem; }
  .content-html h4 { font-size: 1.125rem; }
  .content-html h5, .content-html h6 { font-size: 1rem; }
`;

export default function ContentPanel({ content, title, date, link, audioUrl }: ContentPanelProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isTranscribed, setIsTranscribed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);

  // Reset states and handle audio switching when audioUrl changes
  useEffect(() => {
    // Reset transcript states
    setIsTranscribing(false);
    setTranscript(null);
    setWords([]);
    setTranscriptError(null);
    setIsTranscribed(false);
    setCurrentTime(0);

    // Reset and update audio player
    if (audioRef.current) {
      // Stop current audio playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      
      // Load new audio if available
      if (audioUrl) {
        audioRef.current.load();
      }
    }
  }, [audioUrl]);

  // Handle audio player events
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    // Add event listeners
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    // Cleanup event listeners
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioRef.current]); // Only re-run if audio element changes

  // Handle audio playback request from AI chatbot
  const handleAudioRequest = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
    }
  };

  // Share transcript with AI chatbot
  const handleGetTranscript = async () => {
    if (!audioUrl) return;
    
    setIsTranscribing(true);
    setTranscriptError(null);
    setTranscript(null);
    setWords([]);
    setIsTranscribed(false);
    
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      
      if (!data.text || !Array.isArray(data.words)) {
        throw new Error('Invalid transcription response');
      }

      setTranscript(data.text);
      setWords(data.words.map((word: any) => ({
        word: word.punctuated_word || word.word,
        start: parseFloat(word.start),
        end: parseFloat(word.end),
        confidence: word.confidence,
        speaker: word.speaker ? parseInt(word.speaker) : undefined,
      })));
      setIsTranscribed(true);

      // Share transcript with AI chatbot context
      window.postMessage({
        type: 'TRANSCRIPT_READY',
        transcript: data.text
      }, '*');

    } catch (err) {
      console.error('Transcription error:', err);
      setTranscriptError(
        err instanceof Error 
          ? err.message 
          : 'Failed to generate transcript. Please try again.'
      );
      setIsTranscribed(false);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Listen for audio playback requests from AI chatbot
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'PLAY_AUDIO' && event.data.timestamp) {
        handleAudioRequest(event.data.timestamp);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (words.length > 0) {
      const currentWord = words.find(
        word => currentTime >= word.start && currentTime <= word.end
      );
      
      if (currentWord && highlightRef.current) {
        highlightRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentTime, words]);

  const handleTimeUpdate = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (!isPlaying) {
        audioRef.current.play();
      }
    }
  };

  if (!content) {
    return (
      <div className="flex-1 overflow-y-auto bg-white border-l border-gray-200">
        <div className="h-full flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-500">Select an item to view its content</p>
          </div>
        </div>
      </div>
    );
  }

  const formatContent = (htmlContent: string) => {
    // First clean the HTML content
    const cleanHtml = DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: ['p', 'a', 'b', 'i', 'em', 'strong', 'div', 'span', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });

    // Convert common HTML entities
    const decodedHtml = cleanHtml
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<br\s*\/?>/gi, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return decodedHtml;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white border-l border-gray-200">
      <style jsx global>{contentStyles}</style>
      <div className="max-w-3xl mx-auto p-8">
        {/* Header section */}
        <header className="mb-8 pb-8 border-b border-gray-200">
          {title && <h1 className="text-3xl font-bold text-black mb-3">{title}</h1>}
          <div className="flex items-center justify-between text-sm text-gray-500">
            {date && (
              <time dateTime={new Date(date).toISOString()}>
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            )}
            {link && (
              <a 
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 flex items-center"
              >
                <span>View Original</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </header>

        {/* Audio and Transcript Controls */}
        {audioUrl && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold text-gray-900">Episode Audio</h2>
                  {isPlaying && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Playing
                    </span>
                  )}
                </div>
                <button
                  onClick={handleGetTranscript}
                  disabled={isTranscribing}
                  className={`relative px-6 py-2 rounded-md text-sm font-medium transition-all duration-300
                    ${isTranscribing 
                      ? 'bg-blue-100 text-blue-500 cursor-not-allowed scale-95' 
                      : isTranscribed
                        ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                        : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg transform hover:-translate-y-0.5'
                    }
                    before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full 
                    before:rounded-md before:bg-white before:opacity-0 before:transition-opacity 
                    active:before:opacity-20 overflow-hidden
                    ${isTranscribing ? 'animate-pulse' : ''}
                  `}
                >
                  <span className="relative z-10 flex items-center">
                    {isTranscribing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="inline-flex items-center">
                          Transcribing
                          <span className="ml-1 opacity-75">...</span>
                        </span>
                      </>
                    ) : isTranscribed ? (
                      <>
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Transcribed
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Generate Transcript
                      </>
                    )}
                  </span>
                </button>
              </div>
              
              <div className="relative group">
                <audio 
                  ref={audioRef}
                  controls 
                  className="w-full"
                  preload="metadata"
                >
                  <source src={audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <div className={`absolute left-0 right-0 -bottom-2 h-1 bg-blue-50 rounded-full overflow-hidden transition-opacity duration-200
                  ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <div 
                    className="h-full bg-blue-500 transition-all duration-200"
                    style={{ 
                      width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>

              {transcriptError && (
                <div className="text-red-500 text-sm flex items-center animate-fade-in">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {transcriptError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transcript Section */}
        {isTranscribing ? (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-6 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-4 rounded-full bg-blue-200 animate-bounce"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
          </div>
        ) : transcript && words.length > 0 ? (
          <TranscriptCards
            words={words}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTimeUpdate={handleTimeUpdate}
          />
        ) : null}

        {/* Content section */}
        <article className="prose prose-slate max-w-none prose-headings:text-black prose-a:text-blue-600">
          <div 
            className="content-html"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(content || '', {
                ALLOWED_TAGS: ['p', 'a', 'b', 'i', 'em', 'strong', 'div', 'span', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                ALLOWED_ATTR: ['href', 'target', 'rel']
              })
            }}
          />
        </article>
      </div>
    </div>
  );
} 