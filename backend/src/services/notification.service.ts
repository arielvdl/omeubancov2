import { deviceRepo } from '../repositories/device.repo.js';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
}

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Expo push API error:', response.status, errorBody);
      }
    } catch (err) {
      console.error('Failed to send push notification:', err);
    }
  }
}

export const notificationService = {
  async sendToDevice(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await sendExpoPush([{ to: pushToken, title, body, data, sound: 'default' }]);
  },

  async sendToFamily(
    familyId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const familyDevices = await deviceRepo.findByFamilyId(familyId);
    if (familyDevices.length === 0) return;

    const messages: PushMessage[] = familyDevices.map((device) => ({
      to: device.pushToken,
      title,
      body,
      data,
      sound: 'default' as const,
    }));

    await sendExpoPush(messages);
  },
};
