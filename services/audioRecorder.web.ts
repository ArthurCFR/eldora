/**
 * Web-specific audio recording using MediaRecorder API
 */

export class WebAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    try {
      console.log('WebAudioRecorder: Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log('WebAudioRecorder: Creating MediaRecorder...');
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log('WebAudioRecorder: Recording started');
    } catch (error) {
      console.error('WebAudioRecorder: Failed to start recording', error);
      throw error;
    }
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        console.log('WebAudioRecorder: Recording stopped, creating blob...');
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        console.log('WebAudioRecorder: Blob created, size:', audioBlob.size);

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}
