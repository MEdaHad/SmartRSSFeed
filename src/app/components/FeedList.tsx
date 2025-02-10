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

interface FeedListProps {
  onItemSelect: (item: FeedItem) => void;
  selectedItemId?: string;
  selectedFeed?: Feed | 'all';
  allFeeds: Feed[];
}

export default function FeedList({ onItemSelect, selectedItemId, selectedFeed, allFeeds }: FeedListProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedFeed) {
      setItems([]);
      return;
    }

    const fetchFeed = async (feed: Feed) => {
      try {
        const response = await fetch('/api/rss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedUrl: feed.url }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch feed: ${feed.name}`);
        }

        const data = await response.json();
        return data.items.map((item: FeedItem) => ({
          ...item,
          feedName: feed.name,
        }));
      } catch (err) {
        console.error(`Error fetching feed ${feed.name}:`, err);
        return [];
      }
    };

    const fetchAllFeeds = async () => {
      setLoading(true);
      setError('');

      try {
        if (selectedFeed === 'all') {
          // Fetch all feeds in parallel
          const allItems = await Promise.all(allFeeds.map(fetchFeed));
          // Combine and sort all items by date
          const combinedItems = allItems
            .flat()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 25); // Keep only the 25 most recent items
          setItems(combinedItems);
        } else {
          const feedItems = await fetchFeed(selectedFeed);
          setItems(feedItems);
        }
      } catch (err) {
        setError('Failed to load feed items');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllFeeds();
  }, [selectedFeed, allFeeds]);

  if (!selectedFeed) {
    return (
      <div className="w-[400px] overflow-y-auto bg-white border-l border-gray-200">
        <div className="h-full flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📰</div>
            <p className="text-gray-500">Select a feed to view its contents</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-[400px] overflow-y-auto bg-white border-l border-gray-200">
        <div className="h-full flex items-center justify-center">
          <div className="text-center p-6">
            <div className="animate-spin text-4xl mb-4">⚡</div>
            <p className="text-gray-500">Loading feed items...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-[400px] overflow-y-auto bg-white border-l border-gray-200">
        <div className="h-full flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] overflow-y-auto bg-white border-l border-gray-200">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            {selectedFeed === 'all' ? 'All Feeds' : selectedFeed.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedFeed === 'all' 
              ? `Latest ${items.length} items from ${allFeeds.length} feeds`
              : `${items.length} items`
            }
          </p>
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <article 
              key={item.id} 
              className={`group p-4 rounded-lg transition-all duration-200 cursor-pointer
                ${selectedItemId === item.id 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : 'hover:bg-gray-50 border-transparent hover:shadow-sm'
                } border-2`}
              onClick={() => onItemSelect(item)}
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className={`text-xl font-semibold transition-colors duration-200 group-hover:text-blue-600
                  ${selectedItemId === item.id 
                    ? 'text-blue-700' 
                    : 'text-black'
                  }`}>
                  {item.title}
                </h2>
                <time className="text-sm text-gray-500 shrink-0 ml-4 tabular-nums">
                  {new Date(item.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </time>
              </div>
              {selectedFeed === 'all' && item.feedName && (
                <div className="flex items-center text-sm text-blue-500 mb-2">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                  {item.feedName}
                </div>
              )}
              <p className={`text-gray-600 line-clamp-2 transition-colors duration-200
                ${selectedItemId === item.id ? 'text-blue-600/80' : ''}`}>
                {item.description.replace(/<[^>]*>/g, '')}
              </p>
              {item.link && (
                <div className="mt-2 flex items-center text-sm text-gray-400 group-hover:text-blue-500 transition-colors">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="truncate">{new URL(item.link).hostname}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
} 