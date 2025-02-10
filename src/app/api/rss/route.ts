import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import axios from 'axios';

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['description', 'description'],
    ],
  },
});

export async function POST(request: Request) {
  try {
    const { feedUrl } = await request.json();

    if (!feedUrl) {
      return NextResponse.json({ error: 'Invalid feed URL' }, { status: 400 });
    }

    const response = await axios.get(feedUrl);
    const feed = await parser.parseString(response.data);
    
    // Get the most recent 25 items
    const items = feed.items.slice(0, 25).map(item => ({
      id: item.guid || item.link,
      title: item.title,
      description: item.description || item.contentSnippet || '',
      content: item.content || item.description || '',
      date: item.pubDate || item.isoDate,
      link: item.link,
      enclosure: item.enclosure,
    }));

    return NextResponse.json({
      title: feed.title,
      description: feed.description,
      items,
    });
  } catch (error) {
    console.error('Failed to fetch RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSS feed' },
      { status: 500 }
    );
  }
} 