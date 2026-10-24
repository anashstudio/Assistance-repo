import { AppUsageStat, HabitInsight } from '../types';
import { localDB } from './db';

const APP_USAGE_KEY = 'app_device_usage_stats';

// Clean initial state: zero fake app statistics until user adds or tracks apps
export const INITIAL_APP_USAGE: AppUsageStat[] = [];

export async function getAppUsageStats(): Promise<AppUsageStat[]> {
  return await localDB.getSetting<AppUsageStat[]>(APP_USAGE_KEY, INITIAL_APP_USAGE);
}

export async function saveAppUsageStats(stats: AppUsageStat[]): Promise<void> {
  await localDB.setSetting(APP_USAGE_KEY, stats);
}

/**
 * AI Habit Pattern Recognition Engine
 * Analyzes app usage distributions, screen times, and peak habits when data exists.
 */
export function generateHabitInsights(stats: AppUsageStat[]): HabitInsight[] {
  if (!stats || stats.length === 0) {
    return [];
  }

  const totalMinutes = stats.reduce((sum, s) => sum + s.usageMinutesToday, 0);
  if (totalMinutes === 0) {
    return [];
  }

  const socialAndChatMinutes = stats
    .filter((s) => s.category === 'شبکه‌های اجتماعی' || s.category === 'پیام‌رسان')
    .reduce((sum, s) => sum + s.usageMinutesToday, 0);

  const insights: HabitInsight[] = [];

  // Insight 1: Social Media Habit
  if (socialAndChatMinutes > 90) {
    insights.push({
      id: 'ins_social_heavy',
      type: 'warning',
      title: 'استفاده بالا از پیام‌رسان‌ها و شبکه‌های اجتماعی',
      description: `شما امروز ${Math.round(socialAndChatMinutes / 60)} ساعت و ${socialAndChatMinutes % 60} دقیقه در پیام‌رسان‌ها و سوشال مدیا وقت صرف کرده‌اید. پیشنهاد می‌شود زمان تمرکز تعیین کنید.`,
      timeContext: 'الگوی ساعات عصر و شب',
    });
  } else if (socialAndChatMinutes > 0) {
    insights.push({
      id: 'ins_social_balance',
      type: 'positive',
      title: 'تعادل در استفاده از شبکه‌های اجتماعی',
      description: 'میزان کار با شبکه‌های اجتماعی در وضعیت متعادل و تحت کنترل است.',
      timeContext: 'روند امروز',
    });
  }

  // Insight 2: Total Screen Time Trend
  const yesterdayTotal = stats.reduce((sum, s) => sum + s.usageMinutesYesterday, 0);
  if (yesterdayTotal > 0) {
    const diff = totalMinutes - yesterdayTotal;
    if (diff < 0) {
      const percentDrop = Math.round((Math.abs(diff) / yesterdayTotal) * 100);
      insights.push({
        id: 'ins_screen_drop',
        type: 'positive',
        title: `کاهش ${percentDrop}٪ زمان استفاده از گوشی نسبت به دیروز`,
        description: `امروز ${Math.abs(diff)} دقیقه کمتر از صفحه نمایش گوشی استفاده کرده‌اید که نشانه بهبود بهره‌وری است.`,
        timeContext: 'مقایسه روزانه',
      });
    } else if (diff > 45) {
      insights.push({
        id: 'ins_screen_increase',
        type: 'warning',
        title: 'افزایش اسکرین تایم نسبت به روز گذشته',
        description: `میزان روشن بودن صفحه گوشی امروز ${diff} دقیقه افزایش یافته است. استراحت به چشمانتان را فراموش نکنید.`,
        timeContext: 'هشدار ارگونومی',
      });
    }
  }

  return insights;
}
