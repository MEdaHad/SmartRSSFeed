'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Word {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  punctuated_word?: string;
  speaker?: number;
}

interface TranscriptCardsProps {
  words: Word[];
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
}

interface TranscriptChunk {
  words: Word[];
  text: string;
  startTime: number;
  endTime: number;
}

const WORDS_PER_CHUNK = 100;

export default function TranscriptCards({ words, currentTime, isPlaying, onTimeUpdate }: TranscriptCardsProps) {
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [dragDirection, setDragDirection] = useState<number>(0);
  const [gotoPage, setGotoPage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Split transcript into chunks
  useEffect(() => {
    if (!words.length) return;

    const newChunks: TranscriptChunk[] = [];
    let currentChunk: Word[] = [];
    let wordCount = 0;

    words.forEach((word, index) => {
      currentChunk.push(word);
      wordCount++;

      // Check if we should create a new chunk
      const isLastWord = index === words.length - 1;
      const endsWithPunctuation = word.word.match(/[.!?]$/);
      const reachedWordLimit = wordCount >= WORDS_PER_CHUNK;

      if (isLastWord || (endsWithPunctuation && reachedWordLimit)) {
        newChunks.push({
          words: [...currentChunk],
          text: currentChunk.map(w => w.word).join(' '),
          startTime: currentChunk[0].start,
          endTime: currentChunk[currentChunk.length - 1].end
        });
        currentChunk = [];
        wordCount = 0;
      }
    });

    setChunks(newChunks);
  }, [words]);

  // Auto-advance chunks based on current time
  useEffect(() => {
    if (!isPlaying || !chunks.length) return;

    const currentChunk = chunks.findIndex(
      chunk => currentTime >= chunk.startTime && currentTime <= chunk.endTime
    );

    if (currentChunk !== -1 && currentChunk !== currentChunkIndex) {
      setCurrentChunkIndex(currentChunk);
    }
  }, [currentTime, chunks, isPlaying, currentChunkIndex]);

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (Math.abs(velocity) >= 100 || Math.abs(offset) >= threshold) {
      if (velocity > 0 && currentChunkIndex > 0) {
        navigateChunk(-1);
      } else if (velocity < 0 && currentChunkIndex < chunks.length - 1) {
        navigateChunk(1);
      }
    }
  };

  const navigateChunk = (direction: number) => {
    const newIndex = currentChunkIndex + direction;
    if (newIndex >= 0 && newIndex < chunks.length) {
      setCurrentChunkIndex(newIndex);
      setDragDirection(direction);
      
      // Jump to the first word's timestamp in the new chunk
      if (chunks[newIndex] && onTimeUpdate) {
        onTimeUpdate(chunks[newIndex].startTime);
      }
    }
  };

  const handleGotoPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(gotoPage);
    if (pageNumber > 0 && pageNumber <= chunks.length) {
      const newIndex = pageNumber - 1;
      setCurrentChunkIndex(newIndex);
      setGotoPage('');
      
      // Jump to the first word's timestamp in the new chunk
      if (chunks[newIndex] && onTimeUpdate) {
        onTimeUpdate(chunks[newIndex].startTime);
      }
    }
  };

  const handleWordClick = (e: React.MouseEvent, word: Word) => {
    if (e.ctrlKey && onTimeUpdate) {
      onTimeUpdate(word.start);
    }
  };

  if (!chunks.length) return null;

  return (
    <div className="relative w-full bg-white rounded-lg shadow-sm">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 rounded-t-lg">
        <div
          className="h-full bg-blue-500 rounded-t-lg transition-all duration-300"
          style={{ width: `${((currentChunkIndex + 1) / chunks.length) * 100}%` }}
        />
      </div>

      {/* Navigation buttons */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 z-10">
        <button
          onClick={() => navigateChunk(-1)}
          disabled={currentChunkIndex === 0}
          className={`p-2 rounded-full bg-white shadow-lg transition-all
            ${currentChunkIndex === 0 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-50 hover:text-blue-600'
            }`}
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-10">
        <button
          onClick={() => navigateChunk(1)}
          disabled={currentChunkIndex === chunks.length - 1}
          className={`p-2 rounded-full bg-white shadow-lg transition-all
            ${currentChunkIndex === chunks.length - 1 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-50 hover:text-blue-600'
            }`}
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Cards container */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden pt-6 px-16 pb-4"
      >
        <AnimatePresence initial={false} custom={dragDirection}>
          <motion.div
            key={currentChunkIndex}
            custom={dragDirection}
            initial={{ opacity: 0, x: dragDirection > 0 ? 200 : -200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dragDirection > 0 ? -200 : 200 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={containerRef}
            onDragEnd={handleDragEnd}
            className="min-h-[200px] p-8 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="space-y-4">
              {chunks[currentChunkIndex].words.map((word, index) => (
                <span
                  key={`${currentChunkIndex}-${index}`}
                  onClick={(e) => handleWordClick(e, word)}
                  className={`inline-block transition-all duration-300 mx-1 my-0.5 cursor-pointer
                    ${currentTime >= word.start && currentTime <= word.end
                      ? 'bg-black text-white px-3 py-1 rounded-full transform scale-105'
                      : 'text-gray-700 hover:text-gray-900'
                    }
                    ${word.speaker ? `speaker-${word.speaker}` : ''}
                    ${word.word.match(/[.!?]$/) ? 'mr-2' : ''}
                  `}
                >
                  {word.word}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Page Navigation and Controls */}
      <div className="mt-8 pb-6 px-16">
        <div className="flex flex-col items-center space-y-4 border-t pt-6">
          {/* Page counter */}
          <div className="text-sm font-medium text-gray-700">
            Page {currentChunkIndex + 1} of {chunks.length}
          </div>

          {/* Go to page form */}
          <form onSubmit={handleGotoPage} className="flex items-center space-x-3">
            <label className="text-sm text-gray-600">Go to page:</label>
            <input
              type="number"
              min="1"
              max={chunks.length}
              value={gotoPage}
              onChange={(e) => setGotoPage(e.target.value)}
              className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Page"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go
            </button>
          </form>

          {/* Pagination dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {chunks.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 
                  ${index === currentChunkIndex 
                    ? 'bg-blue-500 scale-125' 
                    : 'bg-gray-300'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 