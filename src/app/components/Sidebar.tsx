'use client';

import { useState, useEffect } from 'react';

interface FeedItem {
  id: string;
  title: string;
  description: string;
  content: string;
  date: string;
  link: string;
  feedName?: string;
  enclosure?: {
    url: string;
    type?: string;
  };
}

interface Feed {
  id: string;
  name: string;
  url: string;
}

interface SidebarProps {
  onFeedSelect: (feed: Feed | 'all') => void;
  selectedFeedId?: string;
  onFeedAdd: (feed: Feed) => void;
  onItemSelect: (item: FeedItem) => void;
  selectedItemId?: string;
  feeds: Feed[];
  onFeedDelete?: (feedId: string) => void;
}

export default function Sidebar({ 
  onFeedSelect, 
  selectedFeedId, 
  onFeedAdd, 
  onItemSelect,
  selectedItemId,
  feeds,
  onFeedDelete 
}: SidebarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<Feed | 'all' | undefined>();

  const addFeed = async () => {
    if (!newFeedUrl.trim()) return;
    setError('');

    try {
      const response = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl: newFeedUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feed');
      }

      const data = await response.json();
      const newFeed: Feed = {
        id: newFeedUrl,
        name: data.title || 'Unnamed Feed',
        url: newFeedUrl,
      };

      onFeedAdd(newFeed);
      setNewFeedUrl('');
      setIsAdding(false);
    } catch (err) {
      setError('Failed to add feed. Please check the URL and try again.');
    }
  };

  const handleDeleteFeed = (e: React.MouseEvent, feedId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this feed?')) {
      onFeedDelete?.(feedId);
      if (selectedFeedId === feedId) {
        onFeedSelect('all');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Add Feed Section */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-600">{feeds.length} feeds</p>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 
                transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Feed
            </button>
          )}
        </div>
        {isAdding && (
          <div className="space-y-3">
            <input
              type="url"
              placeholder="Enter RSS feed URL"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                text-gray-900 placeholder-gray-400 bg-white"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFeed()}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex space-x-2">
              <button
                onClick={addFeed}
                className="flex-1 bg-blue-600 text-white px-3 py-2 text-sm font-medium rounded-md 
                  hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Feed
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewFeedUrl('');
                  setError('');
                }}
                className="flex-1 bg-white text-gray-700 px-3 py-2 text-sm font-medium rounded-md border border-gray-300
                  hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Feed List */}
        <div className="p-2 border-b border-gray-200 overflow-y-auto">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onFeedSelect('all')}
            onKeyDown={(e) => e.key === 'Enter' && onFeedSelect('all')}
            className={`w-full px-4 py-3 rounded-lg text-left transition-colors mb-2 group cursor-pointer
              ${selectedFeedId === 'all'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" 
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm">All Feeds</span>
            </div>
          </div>
          {feeds.map((feed) => (
            <div
              key={feed.id}
              role="button"
              tabIndex={0}
              onClick={() => onFeedSelect(feed)}
              onKeyDown={(e) => e.key === 'Enter' && onFeedSelect(feed)}
              className={`w-full px-4 py-3 rounded-lg text-left transition-colors mb-2 group cursor-pointer
                ${selectedFeedId === feed.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                  <span className="text-sm truncate">{feed.name}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteFeed(e, feed.id)}
                  className="p-1 ml-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                  title="Delete feed"
                  aria-label={`Delete ${feed.name}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Feed Items List */}
        {selectedFeed && (
          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 p-4 bg-white border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                {selectedFeed === 'all' 
                  ? `Latest ${items.length} items from all feeds`
                  : `${items.length} items from ${(selectedFeed as Feed).name}`
                }
              </h3>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onItemSelect(item)}
                      className={`w-full p-3 rounded-lg text-left transition-colors hover:bg-gray-50
                        ${selectedItemId === item.id
                          ? 'bg-blue-50 ring-1 ring-blue-200'
                          : 'bg-white'
                        }`}
                    >
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</h4>
                      {selectedFeed === 'all' && item.feedName && (
                        <p className="text-xs font-medium text-blue-600 mt-1">{item.feedName}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No items found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 