/**
 * LiveKit Room Hook
 * Custom React hook for managing LiveKit room connections
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { getLiveKitToken, generateRoomName } from '../services/livekit';
import { loadAssistantConfig } from '../services/assistantConfig';

export interface UseLiveKitRoomOptions {
  userName: string;
  eventName?: string;
  existingReport?: any; // Pass existing report for edit mode
  onTranscription?: (text: string, isFinal: boolean) => void;
  onAgentResponse?: (text: string) => void;
  onConversationComplete?: (data: any) => void;
}

export interface UseLiveKitRoomReturn {
  room: Room | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isAgentSpeaking: boolean;
  transcription: string;
  isGeneratingReport: boolean;
}

export function useLiveKitRoom(options: UseLiveKitRoomOptions): UseLiveKitRoomReturn {
  const { userName, eventName, onTranscription, onAgentResponse, onConversationComplete } = options;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const roomNameRef = useRef<string>('');

  // Setup room event listeners
  const setupRoomListeners = useCallback((room: Room) => {
    // Connection state
    room.on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit room');
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from LiveKit room');
      setIsConnected(false);
    });

    room.on(RoomEvent.Reconnecting, () => {
      console.log('Reconnecting to LiveKit room...');
      setIsConnecting(true);
    });

    room.on(RoomEvent.Reconnected, () => {
      console.log('Reconnected to LiveKit room');
      setIsConnecting(false);
    });

    // Track subscriptions (for agent audio)
    room.on(
      RoomEvent.TrackSubscribed,
      (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track subscribed:', track.kind, participant.identity);

        if (track.kind === Track.Kind.Audio) {
          // Agent audio track - ATTACH to play it
          const audioElement = track.attach();
          audioElement.play();
          console.log('Playing agent audio');
          setIsAgentSpeaking(true);
        }
      }
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track unsubscribed:', track.kind);

        if (track.kind === Track.Kind.Audio) {
          track.detach();
          setIsAgentSpeaking(false);
        }
      }
    );

    // Transcription events
    room.on(RoomEvent.TranscriptionReceived, (transcriptions) => {
      transcriptions.forEach((transcription) => {
        if (!transcription.segments || transcription.segments.length === 0) return;

        const text = transcription.segments.map((s) => s.text).join(' ');
        const isFinal = transcription.segments.every((s) => s.final);

        console.log('Transcription:', text, 'Final:', isFinal);
        setTranscription(text);

        if (onTranscription) {
          onTranscription(text, isFinal);
        }
      });
    });

    // Track subscriptions for agent speech (to detect end of conversation)
    room.on(
      RoomEvent.TrackPublished,
      (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track published:', publication.kind, participant.identity);
      }
    );

    // Listen to local tracks being published
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      console.log('🎤 Local track published:', publication.kind, publication.trackSid);
    });

    // Data messages (for conversation completion, insights, etc.)
    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));

        console.log('Data received:', message);

        // Handle conversation ending signal - STOP RECORDING IMMEDIATELY
        if (message.type === 'conversation_ending') {
          console.log('🏁 Conversation ending signal received, disabling microphone NOW...');
          room.localParticipant.setMicrophoneEnabled(false);
          setTranscription('Enregistrement terminé, génération du rapport...');
          setIsGeneratingReport(true); // Trigger validation animation
        }
        // Handle conversation complete - show report
        else if (message.type === 'conversation_complete' && onConversationComplete) {
          setIsGeneratingReport(false); // Stop animation when report is ready
          onConversationComplete(message.data);
        } else if (message.type === 'agent_response' && onAgentResponse) {
          onAgentResponse(message.text);
        }
      } catch (e) {
        console.error('Failed to parse data message:', e);
      }
    });

    // Error handling
    room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      console.log('Connection quality changed:', quality, participant?.identity);
    });
  }, [onTranscription, onAgentResponse, onConversationComplete]);

  // Connect to room
  const connect = useCallback(async () => {
    if (roomRef.current?.state === 'connected') {
      console.log('Already connected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Generate room name
      const roomName = generateRoomName(userName);
      roomNameRef.current = roomName;

      // Load assistant config (attention points)
      const assistantConfig = await loadAssistantConfig();
      console.log('📋 Loaded assistant config:', assistantConfig);
      console.log(`📊 Attention points: ${assistantConfig.attentionPoints.length}`);
      console.log(`📊 Max questions will be: ${2 + assistantConfig.attentionPoints.length}`);

      // Check if there's an existing report to pass context
      const existingReport = options.existingReport || null;
      if (existingReport) {
        console.log('📄 Found existing report, passing context to agent');
      }

      // Get access token with full config in metadata
      const { token, url } = await getLiveKitToken(roomName, userName, {
        userName,
        eventName: eventName || '',
        timestamp: new Date().toISOString(),
        assistantConfig: assistantConfig, // Pass full config to agent
        existingReport: existingReport, // Pass existing report context for edit mode
      });

      // Create room instance
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      roomRef.current = room;

      // Setup listeners
      setupRoomListeners(room);

      // Connect to room
      await room.connect(url, token);
      console.log('✅ Room connected, now enabling microphone...');

      // Enable microphone with explicit publishing
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('✅ Microphone enabled');

        // Verify microphone track is published
        const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micTrack) {
          console.log('✅ Microphone track published:', micTrack.trackSid);
        } else {
          console.warn('⚠️ No microphone track found after enabling');
        }
      } catch (micError) {
        console.error('❌ Failed to enable microphone:', micError);
        throw new Error('Microphone access denied. Please grant microphone permission.');
      }

      console.log('Successfully connected to room:', roomName);
    } catch (err: any) {
      console.error('Failed to connect to LiveKit room:', err);
      setError(err.message || 'Failed to connect');
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [userName, eventName, setupRoomListeners]);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      setTranscription('');
      setIsGeneratingReport(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    room: roomRef.current,
    isConnecting,
    isConnected,
    error,
    connect,
    disconnect,
    isAgentSpeaking,
    transcription,
    isGeneratingReport,
  };
}
