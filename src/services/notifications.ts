import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from './api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Register device with backend
  await apiClient.post('/devices', {
    pushToken: token,
    platform: Platform.OS,
  });

  return token;
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(handler);
}
