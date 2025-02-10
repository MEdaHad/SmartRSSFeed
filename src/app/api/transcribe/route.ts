import { createClient } from '@deepgram/sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    console.log('Environment variables loaded:', {
      hasApiKey: !!deepgramApiKey,
      keyLength: deepgramApiKey?.length
    });
    
    // Check for API key first
    if (!deepgramApiKey) {
      console.error('Deepgram API key not found in environment variables');
      return NextResponse.json(
        { error: 'Transcription service configuration error. Please check API key.' },
        { status: 500 }
      );
    }

    const { audioUrl } = await req.json();
    if (!audioUrl) {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
    }

    // Initialize Deepgram client
    const deepgram = createClient(deepgramApiKey);
    console.log('Deepgram client initialized successfully');

    // Fetch audio buffer first to validate the URL
    console.log('Fetching audio file:', audioUrl);
    const audioBuffer = await fetchAudioWithRedirects(audioUrl);
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      throw new Error('Empty audio file received');
    }

    console.log('Audio buffer size:', audioBuffer.byteLength);

    // Try transcription with buffer
    const response = await deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(audioBuffer),
      {
        mimetype: 'audio/mpeg',
        model: 'nova-2',
        smart_format: true,
        punctuate: true,
        diarize: true,
        paragraphs: true,
        utterances: true,
        language: 'en-US',
      }
    );

    console.log('Transcription response received');

    if (!response?.result?.results?.channels?.[0]?.alternatives?.[0]) {
      throw new Error('No transcription results available');
    }

    const transcript = response.result.results.channels[0].alternatives[0];
    return NextResponse.json({
      text: transcript.transcript,
      words: transcript.words.map((word: any) => ({
        word: word.punctuated_word || word.word,
        start: word.start,
        end: word.end,
        confidence: word.confidence,
        speaker: word.speaker
      }))
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message.includes('Invalid credentials') || error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Invalid Deepgram API key. Please check your configuration.' },
          { status: 401 }
        );
      }
      if (error.message.includes('HTML') || error.message.includes('webpage')) {
        return NextResponse.json(
          { error: 'Invalid audio URL: URL points to a webpage instead of an audio file' },
          { status: 400 }
        );
      }
      if (error.message.includes('Too many redirects')) {
        return NextResponse.json(
          { error: 'Could not reach the audio file: too many redirects' },
          { status: 400 }
        );
      }
      
      // Return the actual error message for other cases
      return NextResponse.json(
        { error: `Transcription failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'An unexpected error occurred during transcription' },
      { status: 500 }
    );
  }
}

async function fetchAudioWithRedirects(url: string, maxRedirects = 5): Promise<ArrayBuffer> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    try {
      console.log('Attempting to fetch:', currentUrl);
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      // Get the response as array buffer
      const buffer = await response.arrayBuffer();

      // Check for HTML content in the first few bytes
      const firstBytes = Buffer.from(buffer.slice(0, 100)).toString().trim().toLowerCase();
      if (firstBytes.includes('<!doctype') || firstBytes.includes('<html')) {
        console.log('Detected HTML in response');
        // Try to extract audio URL from HTML if possible
        const matches = firstBytes.match(/https?:\/\/[^"']*\.mp3/);
        if (matches && matches[0] && redirectCount < maxRedirects - 1) {
          console.log('Found audio URL in HTML:', matches[0]);
          currentUrl = matches[0];
          redirectCount++;
          continue;
        }
        throw new Error('Received HTML instead of audio file');
      }

      // If we got here, we should have valid audio data
      console.log('Successfully fetched audio file, size:', buffer.byteLength);
      return buffer;

    } catch (error) {
      console.error('Fetch error:', error);
      if (error instanceof Error) {
        if (error.message.includes('HTML')) {
          throw new Error('URL points to a webpage instead of an audio file');
        }
        if (redirectCount >= maxRedirects) {
          throw new Error('Too many redirects while trying to fetch audio');
        }
      }
      throw error;
    }
  }

  throw new Error('Too many redirects');
} 