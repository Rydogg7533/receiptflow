'use client';

interface ActivityEntryProps {
  entry: {
    id: string;
    actor: 'tom' | 'ryan' | 'system' | 'cron';
    action_type: string;
    title: string;
    description?: string;
    related_task_id?: string;
    related_tool?: string;
    metadata?: Record<string, any>;
    created_at: string;
  };
  isFirst: boolean;
  isLast: boolean;
}

const ACTION_TYPE_COLORS = {
  task_completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: '✅' },
  task_started: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: '🚀' },
  deploy: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', icon: '🚢' },
  cron_run: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200', icon: '⏰' },
  error: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: '⚠️' },
  memory_update: { bg: 'bg-cyan-100 dark:bg-cyan-900', text: 'text-cyan-800 dark:text-cyan-200', icon: '🧠' },
  file_processed: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200', icon: '📄' },
  content_generated: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-800 dark:text-indigo-200', icon: '✍️' },
  note: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', icon: '📝' },
};

const ACTOR_ICONS = {
  tom: { icon: '🤖', name: 'Tom', color: 'text-green-600' },
  ryan: { icon: '🧑', name: 'Ryan', color: 'text-blue-600' },
  system: { icon: '⚙️', name: 'System', color: 'text-gray-600' },
  cron: { icon: '⏰', name: 'Cron', color: 'text-orange-600' },
};

export default function ActivityEntry({ entry, isFirst, isLast }: ActivityEntryProps) {
  const actionColor = ACTION_TYPE_COLORS[entry.action_type as keyof typeof ACTION_TYPE_COLORS] || ACTION_TYPE_COLORS.note;
  const actorInfo = ACTOR_ICONS[entry.actor];

  const timeStr = new Date(entry.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600" />
      )}

      {/* Entry content */}
      <div className="flex gap-4">
        {/* Timeline dot */}
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${actionColor.bg} border-4 border-white dark:border-gray-900`}>
            <span className="text-lg">{actionColor.icon}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 pt-2 pb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition">
            {/* Header: Time + Actor + Type */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className={`text-xl ${actorInfo.color}`}>{actorInfo.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {entry.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {actorInfo.name} • {timeStr}
                  </p>
                </div>
              </div>
              <span className={`${actionColor.bg} ${actionColor.text} text-xs px-2 py-1 rounded font-medium flex-shrink-0`}>
                {entry.action_type.replace('_', ' ')}
              </span>
            </div>

            {/* Description */}
            {entry.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 ml-11">{entry.description}</p>
            )}

            {/* Related tool & task */}
            {(entry.related_tool || entry.related_task_id) && (
              <div className="flex gap-2 mt-3 ml-11">
                {entry.related_tool && (
                  <span className="text-xs bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded">
                    Tool: {entry.related_tool}
                  </span>
                )}
                {entry.related_task_id && (
                  <span className="text-xs bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-2 py-1 rounded">
                    Task ID: {entry.related_task_id.slice(0, 8)}...
                  </span>
                )}
              </div>
            )}

            {/* Metadata */}
            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <div className="mt-3 ml-11 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded font-mono overflow-auto max-h-24">
                <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
