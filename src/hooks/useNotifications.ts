import { useEffect, useRef } from 'react';
import type * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  addNotificationListener,
} from '@/src/services/notifications';

export function useNotifications(enabled = true) {
  const notificationListener = useRef<Notifications.EventSubscription>(null);

  useEffect(() => {
    if (!enabled) return;

    registerForPushNotifications().catch((err) => {
      console.warn('[Notifications] Registration failed:', err);
    });

    notificationListener.current = addNotificationListener((notification) => {
      console.log('Notification received:', notification.request.content.title);
    });

    return () => {
      notificationListener.current?.remove();
    };
  }, [enabled]);
}
