export type Status = 'todo' | 'progress' | 'done';
export type Priority = 'Low' | 'Medium' | 'High';
export interface Task { id: string; title: string; description: string; project: string; priority: Priority; due: string; status: Status; }
export interface Project { name: string; color: string; }
export interface Workspace { tasks: Task[]; projects: Project[]; }
export const dateKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function emptyWorkspace(): Workspace { return {projects:[],tasks:[]}; }
export function parseWorkspace(raw: string): Workspace | null {
 try {
  const value = JSON.parse(raw);
    if (!value || !Array.isArray(value.tasks) || !Array.isArray(value.projects)) return null;
  if (!value.projects.every((p: Project)=>p && typeof p.name==='string' && p.name.trim() && /^#[0-9a-f]{6}$/i.test(p.color))) return null;
  if (new Set(value.projects.map((p:Project)=>p.name)).size !== value.projects.length) return null;
  if (!value.tasks.every((t: Task)=>t && typeof t.id==='string' && typeof t.title==='string' && t.title.trim() && typeof t.description==='string' && value.projects.some((p:Project)=>p.name===t.project) && ['Low','Medium','High'].includes(t.priority) && ['todo','progress','done'].includes(t.status) && typeof t.due==='string' && (!t.due || /^\d{4}-\d{2}-\d{2}$/.test(t.due)))) return null;
  if (new Set(value.tasks.map((t:Task)=>t.id)).size !== value.tasks.length) return null;
  return value;
 } catch { return null; }
}
export function filterTasks(tasks:Task[], search:string, project:string, priority:string):Task[] {
 const q=search.trim().toLowerCase();
 return tasks.filter(t=>(!project||t.project===project)&&(!priority||t.priority===priority)&&(!q||`${t.title} ${t.description} ${t.project}`.toLowerCase().includes(q)));
}
