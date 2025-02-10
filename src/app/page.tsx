'use client';

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import FeedList from './components/FeedList';
import ContentPanel from './components/ContentPanel';
import { defaultFeeds } from './lib/defaultFeeds';
import Logo from './components/Logo';

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

const STORAGE_KEY = 'smartRssFeedFeeds';

export default function Home() {
  const [selectedFeed, setSelectedFeed] = useState<Feed | 'all' | undefined>();
  const [selectedItem, setSelectedItem] = useState<FeedItem | undefined>();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load feeds from localStorage and merge with default feeds if first time
  useEffect(() => {
    const loadFeeds = async () => {
      setIsLoading(true);
      try {
        // Try to get stored feeds
        const storedFeedsJson = localStorage.getItem(STORAGE_KEY);
        let storedFeeds: Feed[] = [];
        
        if (storedFeedsJson) {
          storedFeeds = JSON.parse(storedFeedsJson);
        } else {
          // If no stored feeds, this is first time - load defaults
          const validFeeds = await Promise.all(
            defaultFeeds.map(async (feed) => {
              try {
                const response = await fetch('/api/rss', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ feedUrl: feed.url }),
                });

                if (!response.ok) {
                  console.warn(`Failed to validate feed: ${feed.name}`);
                  return null;
                }

                const data = await response.json();
                return {
                  ...feed,
                  name: data.title || feed.name,
                };
              } catch (error) {
                console.warn(`Error validating feed: ${feed.name}`, error);
                return null;
              }
            })
          );

          storedFeeds = validFeeds.filter((feed): feed is Feed => feed !== null);
          // Save default feeds to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(storedFeeds));
        }

        setFeeds(storedFeeds);
        
        // Set the view to show all feeds if we have any
        if (storedFeeds.length > 0) {
          setSelectedFeed('all');
        }
      } catch (error) {
        console.error('Error loading feeds:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeeds();
  }, []); // Empty dependency array means this runs once on mount

  // Save feeds to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
    }
  }, [feeds, isLoading]);

  const handleFeedSelect = (feed: Feed | 'all') => {
    setSelectedFeed(feed);
    setSelectedItem(undefined);
  };

  const handleFeedAdd = (feed: Feed) => {
    setFeeds(prev => [...prev, feed]);
    setSelectedFeed(feed);
    setSelectedItem(undefined);
  };

  const handleFeedDelete = (feedId: string) => {
    setFeeds(prev => prev.filter(feed => feed.id !== feedId));
    if (selectedFeed && typeof selectedFeed !== 'string' && selectedFeed.id === feedId) {
      setSelectedFeed('all');
    }
  };

  return (
    <>
      {/* Modern Header with Glass Effect */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200/80 z-30 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Logo />
            <div className="flex items-center space-x-4">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-500">Loading feeds...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600 font-medium">
                    {feeds.length} {feeds.length === 1 ? 'feed' : 'feeds'} active
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Adjusted with top padding for fixed header */}
      <main className="flex flex-col md:flex-row h-screen pt-[73px] pb-[48px] bg-gray-50">
        {/* Feed List Section */}
        <div className="w-full md:w-1/4 border-r border-gray-200 bg-white">
          <div className="sticky top-0 border-b border-gray-200 bg-white px-4 py-3 z-20">
            <h2 className="text-lg font-semibold text-gray-800">Podcast Feeds</h2>
          </div>
          <div className="h-full overflow-y-auto">
            <Sidebar 
              onFeedSelect={handleFeedSelect}
              selectedFeedId={selectedFeed === 'all' ? 'all' : selectedFeed?.id}
              onFeedAdd={handleFeedAdd}
              onFeedDelete={handleFeedDelete}
              feeds={feeds}
              onItemSelect={setSelectedItem}
              selectedItemId={selectedItem?.id}
            />
          </div>
        </div>

        {/* Episodes List Section */}
        <div className="w-full md:w-1/4 border-r border-gray-200 bg-white">
          <div className="sticky top-0 border-b border-gray-200 bg-white px-4 py-3 z-20">
            <h2 className="text-lg font-semibold text-gray-800">Episodes</h2>
          </div>
          <div className="h-full overflow-y-auto">
            <FeedList 
              selectedFeed={selectedFeed}
              onItemSelect={setSelectedItem}
              selectedItemId={selectedItem?.id}
              allFeeds={feeds}
            />
          </div>
        </div>

        {/* Content Panel Section */}
        <div className="w-full md:w-2/4 bg-white">
          <div className="sticky top-0 border-b border-gray-200 bg-white px-4 py-3 z-20">
            <h2 className="text-lg font-semibold text-gray-800">Feed Content</h2>
          </div>
          <div className="h-full overflow-y-auto">
            <ContentPanel 
              content={selectedItem?.content}
              title={selectedItem?.title}
              date={selectedItem?.date}
              link={selectedItem?.link}
              audioUrl={selectedItem?.enclosure?.url}
            />
          </div>
        </div>
      </main>
    </>
  );
}
