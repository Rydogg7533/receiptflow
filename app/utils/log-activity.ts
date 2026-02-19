/**
 * Activity Logger
 * Use this to log meaningful actions to the Mission Control activity feed
 */

export type ActivityType =
  | 'task_completed'
  | 'task_started'
  | 'deploy'
  | 'cron_run'
  | 'error'
  | 'memory_update'
  | 'file_processed'
  | 'content_generated'
  | 'note';

export interface ActivityLogPayload {
  actor: 'tom' | 'ryan' | 'system' | 'cron';
  action_type: ActivityType;
  title: string;
  description?: string;
  related_task_id?: string;
  related_tool?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(payload: ActivityLogPayload) {
  try {
    const res = await fetch('/api/admin/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Failed to log activity:', await res.text());
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Error logging activity:', err);
    return null;
  }
}

// Convenience functions
export const activityLog = {
  taskStarted: (title: string, taskId?: string) =>
    logActivity({
      actor: 'tom',
      action_type: 'task_started',
      title,
      related_task_id: taskId,
    }),

  taskCompleted: (title: string, taskId?: string) =>
    logActivity({
      actor: 'tom',
      action_type: 'task_completed',
      title,
      related_task_id: taskId,
    }),

  deployed: (title: string, tool?: string, metadata?: any) =>
    logActivity({
      actor: 'tom',
      action_type: 'deploy',
      title,
      related_tool: tool,
      metadata,
    }),

  error: (title: string, description?: string, metadata?: any) =>
    logActivity({
      actor: 'system',
      action_type: 'error',
      title,
      description,
      metadata,
    }),

  note: (title: string, description?: string) =>
    logActivity({
      actor: 'tom',
      action_type: 'note',
      title,
      description,
    }),

  contentGenerated: (title: string, tool?: string) =>
    logActivity({
      actor: 'tom',
      action_type: 'content_generated',
      title,
      related_tool: tool,
    }),

  fileProcessed: (title: string, tool?: string, metadata?: any) =>
    logActivity({
      actor: 'tom',
      action_type: 'file_processed',
      title,
      related_tool: tool,
      metadata,
    }),
};
