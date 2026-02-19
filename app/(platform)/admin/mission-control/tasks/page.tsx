'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/app/types/tasks';
import TaskCard from '@/app/components/admin/mission-control/TaskCard';
import TaskForm from '@/app/components/admin/mission-control/TaskForm';

const STATUS_ORDER: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done', 'blocked'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterAssigned, setFilterAssigned] = useState<string | 'all'>('all');

  // Fetch tasks
  useEffect(() => {
    fetchTasks();
  }, [filterPriority, filterAssigned]);

  async function fetchTasks() {
    setLoading(true);
    try {
      let url = '/api/admin/tasks';
      const params = new URLSearchParams();
      if (filterPriority !== 'all') params.append('priority', filterPriority);
      if (filterAssigned !== 'all') params.append('assigned_to', filterAssigned);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      await fetchTasks();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete task');
      await fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }

  async function handleTaskCreated() {
    setShowForm(false);
    await fetchTasks();
  }

  // Group tasks by status
  const tasksByStatus = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  // Stats
  const totalTasks = tasks.length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const completedThisWeek = tasks.filter(
    (t) =>
      t.status === 'done' &&
      t.completed_at &&
      new Date(t.completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tasks Board</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage what we're working on</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              + New Task
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{inProgress}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Blocked</p>
              <p className="text-2xl font-bold text-red-600">{blocked}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Completed (7d)</p>
              <p className="text-2xl font-bold text-green-600">{completedThisWeek}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned To
            </label>
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="ryan">Ryan</option>
              <option value="tom">Tom</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-6">
            {STATUS_ORDER.map((status) => (
              <div
                key={status}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 min-h-96"
              >
                {/* Column header */}
                <div className="mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white capitalize mb-2">
                    {status.replace('_', ' ')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tasksByStatus[status].length} task{tasksByStatus[status].length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Task cards */}
                <div className="space-y-3">
                  {tasksByStatus[status].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Task Form Modal */}
        {showForm && (
          <TaskForm onClose={() => setShowForm(false)} onTaskCreated={handleTaskCreated} />
        )}
      </div>
    </div>
  );
}
