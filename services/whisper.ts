/**
 * Service pour la transcription audio avec OpenAI Whisper
 */

export async function transcribeAudio(audioUri: string | Blob): Promise<string> {
  try {
    const formData = new FormData();

    if (audioUri instanceof Blob) {
      // Web: append the blob directly
      formData.append('file', audioUri, 'recording.webm');
    } else {
      // Mobile: append file info object
      // @ts-ignore - FormData in React Native handles files differently
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
    }
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Whisper API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error(`Impossible de transcrire l'audio: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
