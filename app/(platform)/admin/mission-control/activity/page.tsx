'use client';

import { useState, useEffect } from 'react';
import ActivityTimeline from '@/app/components/admin/mission-control/ActivityTimeline';

interface ActivityEntry {
  id: string;
  actor: 'tom' | 'ryan' | 'system' | 'cron';
  action_type: string;
  title: string;
  description?: string;
  related_task_id?: string;
  related_tool?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActor, setFilterActor] = useState<string | 'all'>('all');
  const [filterActionType, setFilterActionType] = useState<string | 'all'>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | '7d' | '30d'>('all');

  useEffect(() => {
    fetchActivity();
  }, [filterActor, filterActionType, filterDateRange]);

  async function fetchActivity() {
    setLoading(true);
    try {
      let url = '/api/admin/activity?limit=500';
      if (filterActor !== 'all') url += `&actor=${filterActor}`;
      if (filterActionType !== 'all') url += `&action_type=${filterActionType}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch activity');
      let data = await res.json();

      // Apply date range filter client-side
      if (filterDateRange !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();

        if (filterDateRange === 'today') {
          cutoffDate.setHours(0, 0, 0, 0);
        } else if (filterDateRange === '7d') {
          cutoffDate.setDate(cutoffDate.getDate() - 7);
        } else if (filterDateRange === '30d') {
          cutoffDate.setDate(cutoffDate.getDate() - 30);
        }

        data = data.filter((entry: ActivityEntry) => new Date(entry.created_at) >= cutoffDate);
      }

      setActivity(data);
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  }

  const actionTypes = Array.from(new Set(activity.map((a) => a.action_type)));
  const actors = Array.from(new Set(activity.map((a) => a.actor)));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Activity Feed</h1>
          <p className="text-gray-600 dark:text-gray-400">Timeline of all meaningful actions</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actor
              </label>
              <select
                value={filterActor}
                onChange={(e) => setFilterActor(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Actors</option>
                {actors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor === 'tom' ? '🤖 Tom' : actor === 'ryan' ? '🧑 Ryan' : actor === 'system' ? '⚙️ System' : '⏰ Cron'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Type
              </label>
              <select
                value={filterActionType}
                onChange={(e) => setFilterActionType(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                {actionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value as any)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 flex gap-4">
          <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activity.length}</p>
          </div>

          {activity.filter((a) => a.action_type === 'error').length > 0 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900">
              <p className="text-sm text-red-600 dark:text-red-400">Errors</p>
              <p className="text-2xl font-bold text-red-600">{activity.filter((a) => a.action_type === 'error').length}</p>
            </div>
          )}

          {activity.filter((a) => a.action_type === 'task_completed').length > 0 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-sm text-green-600 dark:text-green-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{activity.filter((a) => a.action_type === 'task_completed').length}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading activity...</p>
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No activity entries yet</p>
          </div>
        ) : (
          <ActivityTimeline entries={activity} />
        )}
      </div>
    </div>
  );
}
