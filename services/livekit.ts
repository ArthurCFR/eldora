/**
 * LiveKit Service
 * Handles LiveKit room connections and token management
 */

// Use environment variable if available, otherwise default to WSL IP for LAN mode
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || 'http://172.28.191.115:3001';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
}

export async function getLiveKitToken(
  roomName: string,
  participantName: string,
  metadata?: Record<string, any>
): Promise<LiveKitTokenResponse> {
  try {
    const response = await fetch(`${PROXY_URL}/api/livekit-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName,
        participantName,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LiveKit token error: ${error.error || 'Unknown error'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get LiveKit token:', error);
    throw error;
  }
}

export function generateRoomName(userId: string, timestamp: number = Date.now()): string {
  return `voyaltis-${userId}-${timestamp}`;
}
