import { OneSignal, LogLevel } from 'react-native-onesignal';

const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;

export function initializeNotifications() {
  if (!appId) return;
  OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Warn : LogLevel.None);
  OneSignal.initialize(appId);
}

export async function requestNotificationPermission() {
  if (!appId) return false;
  return OneSignal.Notifications.requestPermission(true);
}

export function identifyNotificationUser(userId: string) { if (appId) OneSignal.login(userId); }
export function clearNotificationUser() { if (appId) OneSignal.logout(); }
