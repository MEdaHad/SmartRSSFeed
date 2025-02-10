import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Check for API key
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  console.error('Google Gemini API key is missing. Please add it to your .env.local file');
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

interface ChatRequest {
  message: string;
  type: 'summary' | 'qa';
  transcript: string;
}

interface BulletPoint {
  text: string;
  timestamp: number;
}

export async function POST(req: Request) {
  try {
    console.log('Starting chat request processing...');
    
    // Validate API key
    if (!apiKey) {
      console.error('API key validation failed: No API key found');
      return NextResponse.json(
        { error: 'Google Gemini API key is not configured. Please add it to your environment variables.' },
        { status: 500 }
      );
    }

    const { message, type, transcript }: ChatRequest = await req.json();
    console.log('Request data:', { type, messageLength: message?.length, transcriptLength: transcript?.length });

    // Validate request data
    if (!message) {
      console.error('Validation failed: Message is required');
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!transcript) {
      console.error('Validation failed: Transcript is required');
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    let systemPrompt = '';
    if (type === 'summary') {
      systemPrompt = `You are an AI assistant that provides insightful summaries of podcast content. Your task is to:

1. Create clear, concise bullet points highlighting the most important insights from the transcript
2. Each bullet point MUST start with a timestamp in [MM:SS] or [HH:MM:SS] format
3. Focus on extracting meaningful, specific insights rather than generic summaries
4. Include direct quotes or key statements when relevant
5. Organize points chronologically based on when they appear in the podcast
6. Keep each bullet point focused on a single, clear insight

Format each point exactly like this:
[timestamp] Key insight or quote here

Example:
[02:15] Host discusses the impact of AI on healthcare, highlighting the breakthrough in diagnostic accuracy
[05:30] "AI models are now achieving 95% accuracy in early detection" - Dr. Smith explains the significance
[08:45] Three key challenges in AI implementation are discussed: data privacy, training costs, and integration`;
    } else {
      systemPrompt = `You are an AI assistant that answers questions about podcast content. Your task is to:

1. Provide detailed answers based on the transcript
2. Include relevant timestamps in [MM:SS] or [HH:MM:SS] format for each key point
3. Use bullet points to structure your response when appropriate
4. Quote directly from the transcript when relevant
5. Keep your answers focused and specific to the question
6. Highlight the exact moments in the podcast where the information appears

Format each point exactly like this:
[timestamp] Answer point or relevant quote

Example:
[03:20] The speaker directly addresses this topic, stating that...
[07:15] Additional context is provided when they discuss...
[12:30] "Direct quote from the transcript" - provides supporting evidence`;
    }

    try {
      console.log('Preparing Gemini API request...');
      const prompt = `${systemPrompt}\n\nTranscript: ${transcript}\n\nUser Query: ${message}\n\nRemember to format ALL responses with proper timestamps in [MM:SS] or [HH:MM:SS] format at the start of each point.`;
      
      console.log('Sending request to Gemini API...');
      const result = await model.generateContent(prompt);
      const responseContent = result.response.text();
      console.log('Received response from Gemini API:', { responseLength: responseContent?.length });
      
      if (!responseContent) {
        console.error('No content in Gemini response');
        throw new Error('No response content from Gemini');
      }
      
      // Enhanced parsing of the response to extract bullet points and timestamps
      console.log('Parsing bullet points from response...');
      const bulletPoints: BulletPoint[] = responseContent.split('\n')
        .filter((line: string) => {
          // More precise regex to match timestamp patterns
          const hasTimestamp = line.match(/^\[((\d{1,2}:)?[0-5]?\d:[0-5]\d)\]/);
          return line.trim() && hasTimestamp;
        })
        .map((line: string) => {
          const timestampMatch = line.match(/^\[((\d{1,2}:)?[0-5]?\d:[0-5]\d)\]/);
          if (timestampMatch) {
            const timestamp = parseTimestamp(timestampMatch[1]);
            // Get everything after the timestamp, removing any extra spaces
            const text = line.replace(/^\[.*?\]/, '').trim();
            return { text, timestamp };
          }
          return null;
        })
        .filter((point: BulletPoint | null): point is BulletPoint => 
          point !== null && point.text.length > 0 && !isNaN(point.timestamp)
        );
      
      console.log('Successfully processed response with', bulletPoints.length, 'bullet points');

      // Format the response to ensure it's readable even without bullet point parsing
      const formattedResponse = responseContent
        .split('\n')
        .filter(line => line.trim())
        .join('\n\n');

      return NextResponse.json({
        message: formattedResponse,
        type,
        bulletPoints
      });

    } catch (geminiError) {
      console.error('Gemini API error:', {
        error: geminiError,
        message: geminiError instanceof Error ? geminiError.message : 'Unknown error',
        stack: geminiError instanceof Error ? geminiError.stack : undefined
      });
      return NextResponse.json(
        { error: 'Failed to process request with Gemini API. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Chat route error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to process request. Please check your input and try again.' },
      { status: 500 }
    );
  }
}

function parseTimestamp(timestamp: string): number {
  try {
    // Handle different timestamp formats (HH:MM:SS or MM:SS)
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  } catch (error) {
    console.error('Error parsing timestamp:', timestamp, error);
    return 0;
  }
} 