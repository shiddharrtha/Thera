import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { notifyTip, notifyWeeklyDigest } from '../services/notificationTriggers';
import { pickNotificationTip } from '../services/notificationTips';

const LAST_DIGEST_WEEK_KEY = 'thera_last_weekly_digest_week';
const LAST_TIP_DATE_KEY = 'thera_last_tip_date';

function getIsoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const start = Date.parse(`${a}T00:00:00Z`);
  const end = Date.parse(`${b}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

/** Weekly digest (Mondays) and agronomy tips when the app is open. */
export function useNotificationScheduler(): void {
  const { user } = useAuth();
  const { data, loading } = useAppData();

  useEffect(() => {
    if (!user || loading) return;
    if (!data.settings.weeklyDigest && !data.settings.tipsAndBestPractices) return;

    let cancelled = false;

    async function runScheduledNotifications() {
      const now = new Date();
      const todayKey = getDateKey(now);
      const isMonday = now.getDay() === 1;

      if (data.settings.weeklyDigest && isMonday) {
        const weekKey = getIsoWeekKey(now);
        const lastDigestWeek = await AsyncStorage.getItem(LAST_DIGEST_WEEK_KEY);
        if (lastDigestWeek !== weekKey) {
          await notifyWeeklyDigest(data.settings, data);
          await AsyncStorage.setItem(LAST_DIGEST_WEEK_KEY, weekKey);
        }
      }

      if (data.settings.tipsAndBestPractices) {
        const lastTipDate = await AsyncStorage.getItem(LAST_TIP_DATE_KEY);
        const shouldShowTip = !lastTipDate || daysBetween(lastTipDate, todayKey) >= 3;
        if (shouldShowTip) {
          const seed = now.getDate() + now.getMonth() * 31;
          await notifyTip(data.settings, pickNotificationTip(seed));
          await AsyncStorage.setItem(LAST_TIP_DATE_KEY, todayKey);
        }
      }
    }

    const timer = setTimeout(() => {
      void runScheduledNotifications();
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, loading, data]);
}
