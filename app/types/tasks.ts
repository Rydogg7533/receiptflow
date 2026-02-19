export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskCategory =
  | 'feature'
  | 'bug'
  | 'content'
  | 'admin'
  | 'research'
  | 'maintenance';
export type AssignedTo = 'ryan' | 'tom' | 'unassigned';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: AssignedTo;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  spec_reference?: string;
  related_tool?: string;
  notes?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
