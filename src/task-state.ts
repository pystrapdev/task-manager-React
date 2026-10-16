export type Status = 'todo' | 'progress' | 'done';
export type Priority = 'Low' | 'Medium' | 'High';
export interface Task { id: string; title: string; description: string; project: string; priority: Priority; due: string; status: Status; }
export interface Project { name: string; color: string; }
export interface Workspace { tasks: Task[]; projects: Project[]; }
export const dateKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function seedWorkspace(now = new Date()): Workspace {
 const due = (offset: number) => { const d = new Date(now); d.setDate(d.getDate()+offset); return dateKey(d); };
 const projects = [{name:'Website redesign',color:'#a18cd1'},{name:'Product launch',color:'#df9d53'},{name:'Personal',color:'#6b9d91'}];
 const rows: [string,string,Priority,number,Status,string][] = [
 ['Explore homepage directions','Website redesign','High',0,'todo','Collect a few references and sketch three directions for the new homepage.'],
 ['Write the launch announcement','Product launch','Medium',1,'todo','Tell the story behind what we are building. Keep it clear, useful, and human.'],
 ['Make time for a little learning','Personal','Low',2,'todo','Read one chapter. Take a few notes. Try something new.'],
 ['Design the component library','Website redesign','High',0,'progress','Bring buttons, typography, and form elements together in one thoughtful system.'],
 ['Prepare the product demo','Product launch','Medium',1,'progress','Walk through the core experience and polish the small details.'],
 ['Map out the week','Personal','Low',0,'done','Choose the things that matter and leave a little room to breathe.'],
 ['Gather customer insights','Product launch','Medium',-1,'done','Turn recent conversations into a short list of opportunities.']];
 return {projects,tasks:rows.map((r,i)=>({id:`demo-${i}`,title:r[0],project:r[1],priority:r[2],due:due(r[3]),status:r[4],description:r[5]}))};
}
export function parseWorkspace(raw: string): Workspace | null {
 try {
  const value = JSON.parse(raw);
  if (!value || !Array.isArray(value.tasks) || !Array.isArray(value.projects) || !value.projects.length) return null;
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
