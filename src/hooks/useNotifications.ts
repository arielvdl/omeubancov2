import { useEffect, useRef } from 'react';
import type * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  addNotificationListener,
} from '@/src/services/notifications';

export function useNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>(null);

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = addNotificationListener((notification) => {
      // Handle incoming notification while app is foregrounded
      console.log('Notification received:', notification.request.content.title);
    });

    return () => {
      notificationListener.current?.remove();
    };
  }, []);
}
