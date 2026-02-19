'use client';

import { Task, TaskStatus } from '@/app/types/tasks';
import { useState } from 'react';

const PRIORITY_COLORS = {
  urgent: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: '🔴' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200', icon: '🟠' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', icon: '🟡' },
  low: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', icon: '⚪' },
};

const ASSIGNED_COLORS = {
  ryan: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: '🧑' },
  tom: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: '🤖' },
  unassigned: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', icon: '?' },
};

const STATUS_OPTIONS: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done', 'blocked'];

export default function TaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDelete: (taskId: string) => void;
}) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const priorityColors = PRIORITY_COLORS[task.priority];
  const assignedColors = ASSIGNED_COLORS[task.assigned_to];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  const formattedDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition">
      {/* Title */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
        {task.title}
      </h3>

      {/* Tags/Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Priority */}
        <span className={`${priorityColors.bg} ${priorityColors.text} text-xs px-2 py-1 rounded font-medium`}>
          {priorityColors.icon} {task.priority}
        </span>

        {/* Assigned To */}
        <span className={`${assignedColors.bg} ${assignedColors.text} text-xs px-2 py-1 rounded font-medium`}>
          {assignedColors.icon} {task.assigned_to}
        </span>

        {/* Category */}
        <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded font-medium">
          {task.category}
        </span>
      </div>

      {/* Related tool */}
      {task.related_tool && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          Tool: <span className="font-medium">{task.related_tool}</span>
        </p>
      )}

      {/* Due date */}
      {task.due_date && (
        <p className={`text-xs mb-2 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
          📅 {formattedDate} {isOverdue && '⚠️ OVERDUE'}
        </p>
      )}

      {/* Status dropdown and menu */}
      <div className="flex gap-2 items-center mt-3">
        {/* Status change dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="w-full text-left text-xs bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white px-2 py-1 rounded border border-gray-300 dark:border-gray-500"
          >
            {task.status.replace('_', ' ')} ▼
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    onStatusChange(task.id, status);
                    setShowStatusDropdown(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    task.status === status ? 'font-bold bg-gray-50 dark:bg-gray-600' : ''
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10">
              <button
                onClick={() => {
                  onDelete(task.id);
                  setShowMenu(false);
                }}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
