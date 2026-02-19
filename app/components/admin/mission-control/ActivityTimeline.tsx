'use client';

import ActivityEntry from './ActivityEntry';

interface Activity {
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

export default function ActivityTimeline({ entries }: { entries: Activity[] }) {
  // Group by date
  const groupedByDate = entries.reduce(
    (acc, entry) => {
      const date = new Date(entry.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    },
    {} as Record<string, Activity[]>
  );

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-8">
      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date header */}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2">
            {date}
          </h3>

          {/* Timeline entries for this date */}
          <div className="space-y-4">
            {groupedByDate[date].map((entry, index) => (
              <ActivityEntry
                key={entry.id}
                entry={entry}
                isFirst={index === 0}
                isLast={index === groupedByDate[date].length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
