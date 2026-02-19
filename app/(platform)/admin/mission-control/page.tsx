'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Task } from '@/app/types/tasks';

interface ActivityEntry {
  id: string;
  actor: string;
  action_type: string;
  title: string;
  description?: string;
  created_at: string;
}

interface ScheduledTask {
  id: string;
  title: string;
  schedule_description: string;
  category: string;
  is_active: boolean;
  next_run_at?: string;
}

export default function MissionControlDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/tasks?priority=urgent,high')
        .then((r) => r.json())
        .then((data) => setTasks(data))
        .catch((err) => console.error('Error fetching tasks:', err)),
      fetch('/api/admin/activity?limit=10')
        .then((r) => r.json())
        .then((data) => setActivity(data))
        .catch((err) => console.error('Error fetching activity:', err)),
      fetch('/api/admin/scheduled-tasks?active_only=true')
        .then((r) => r.json())
        .then((data) => setScheduledTasks(data))
        .catch((err) => console.error('Error fetching scheduled tasks:', err)),
    ]).finally(() => setLoading(false));
  }, []);

  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completedThisWeek = tasks.filter(
    (t) =>
      t.status === 'done' &&
      t.completed_at &&
      new Date(t.completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;
  const scheduledToday = scheduledTasks.filter(
    (t) =>
      t.is_active &&
      t.next_run_at &&
      new Date(t.next_run_at).toDateString() === new Date().toDateString()
  ).length;
  const errorsToday = activity.filter(
    (a) =>
      a.action_type === 'error' &&
      new Date(a.created_at).toDateString() === new Date().toDateString()
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading Mission Control...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Mission Control</h1>
          <p className="text-gray-600 dark:text-gray-400">Overview of all active work</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <Link href="/admin/mission-control/tasks?status=blocked">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Blocked Tasks</p>
              <p className="text-2xl font-bold text-red-600">{blockedTasks}</p>
            </div>
          </Link>

          <Link href="/admin/mission-control/tasks?status=in_progress">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{inProgressTasks}</p>
            </div>
          </Link>

          <Link href="/admin/mission-control/tasks?status=done">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Completed (7d)</p>
              <p className="text-2xl font-bold text-green-600">{completedThisWeek}</p>
            </div>
          </Link>

          <Link href="/admin/mission-control/calendar">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Scheduled Today</p>
              <p className="text-2xl font-bold text-blue-600">{scheduledToday}</p>
            </div>
          </Link>

          <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg border ${errorsToday > 0 ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Errors Today</p>
            <p className={`text-2xl font-bold ${errorsToday > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {errorsToday}
            </p>
          </div>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Tasks Summary */}
          <Link href="/admin/mission-control/tasks">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer h-96 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tasks Summary</h2>
                <span className="text-blue-600 dark:text-blue-400">View All →</span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {tasks.slice(0, 10).map((task) => (
                  <div
                    key={task.id}
                    className="border-l-4 border-blue-500 pl-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {task.title}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {task.status}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {task.assigned_to}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Activity Feed */}
          <Link href="/admin/mission-control/activity">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer h-96 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                <span className="text-blue-600 dark:text-blue-400">View All →</span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {activity.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.actor === 'tom' ? '🤖' : entry.actor === 'ryan' ? '🧑' : '⚙️'} {entry.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(entry.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Calendar/Schedule */}
          <Link href="/admin/mission-control/calendar">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer h-96">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scheduled (Next 7d)</h2>
                <span className="text-blue-600 dark:text-blue-400">View All →</span>
              </div>

              <div className="space-y-2">
                {scheduledTasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="text-sm py-1 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {task.schedule_description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Memory Viewer */}
          <Link href="/admin/mission-control/memory">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition cursor-pointer h-96">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Memory</h2>
                <span className="text-blue-600 dark:text-blue-400">View All →</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Search Tom's memory files and daily logs</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
