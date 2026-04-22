import axios from 'axios';
import { getTeamsCollection } from './db';
import { ChatMessage } from './types';

let webhookUrl: string | null = null;

/**
 * Initializes the Discord bridge using a Webhook URL (HTTP only, no WebSocket).
 * This works on all hosting platforms including Render free tier.
 */
export function initDiscordBridge() {
  const url = process.env.DISCORD_WEBHOOK_URL;

  if (!url) {
    console.warn('Discord Bridge: DISCORD_WEBHOOK_URL not set. Bridge disabled.');
    return;
  }

  webhookUrl = url;
  console.log('Discord Bridge: Webhook mode active.');
}

/**
 * Sends an alert to the admin channel via Discord Webhook.
 * Returns the message ID if available (webhooks don't return IDs by default unless ?wait=true).
 */
export async function sendAdminAlert(text: string, location?: { lat: number; lng: number }): Promise<string | null> {
  if (!webhookUrl) {
    console.warn('Discord Bridge: Cannot send alert. Webhook not configured.');
    return null;
  }

  try {
    let content = text;
    if (location) {
      content += `\n📍 LOCATION: ${location.lat}, ${location.lng}\n🗺️ MAP: https://www.google.com/maps?q=${location.lat},${location.lng}`;
    }

    // ?wait=true makes Discord return the created message so we can get its ID
    const response = await axios.post(`${webhookUrl}?wait=true`, {
      content,
      username: 'QUEST HQ',
      avatar_url: 'https://i.imgur.com/4M34hi2.png',
    });

    const messageId = response.data?.id ?? null;
    console.log('Discord Bridge: Alert sent via webhook, messageId:', messageId);
    return messageId;
  } catch (error: any) {
    console.error('Discord Bridge: Failed to send webhook alert', error?.response?.data ?? error?.message);
    return null;
  }
}
