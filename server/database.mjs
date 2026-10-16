import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export function databaseConfig(env = process.env) {
 for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
  if (env[key] === undefined || (key !== 'DB_PASSWORD' && !env[key].trim())) throw new Error(`Missing ${key}. Set it in your hosting environment.`);
 }
 const port = Number(env.DB_PORT || 3306);
 if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT must be a valid port number.');
 if (env.DB_SSL && !['true', 'false'].includes(env.DB_SSL)) throw new Error('DB_SSL must be true or false.');
 const ssl = env.DB_SSL === 'true' ? { rejectUnauthorized: true, ...(env.DB_SSL_CA_FILE ? {ca: readFileSync(env.DB_SSL_CA_FILE, 'utf8')} : {}) } : undefined;
 return { host: env.DB_HOST.trim(), database: env.DB_NAME.trim(), user: env.DB_USER.trim(), password: env.DB_PASSWORD,
  port, ssl, charset: 'utf8mb4', dateStrings: true, connectionLimit: 5, queueLimit: 50, waitForConnections: true, connectTimeout: 10000 };
}
export function databaseError(error) {
 const messages = {
  ETIMEDOUT: 'MySQL connection timed out. Check DB_HOST, DB_PORT and database network/firewall access.',
  ECONNREFUSED: 'MySQL refused the connection. Check DB_HOST, DB_PORT and whether MySQL is running.',
  ENOTFOUND: 'MySQL hostname could not be resolved. Check DB_HOST.',
  ER_ACCESS_DENIED_ERROR: 'MySQL rejected the credentials. Check DB_USER, DB_PASSWORD and allowed client hosts.',
  ER_BAD_DB_ERROR: 'MySQL database does not exist. Check DB_NAME.',
  ER_TABLEACCESS_DENIED_ERROR: 'MySQL user lacks table permissions. Grant CREATE, SELECT, INSERT, UPDATE and DELETE on this database.',
  ER_DBACCESS_DENIED_ERROR: 'MySQL user cannot access this database. Check DB_NAME and database grants.'
 };
 return messages[error.code] || 'MySQL operation failed. Check database availability, credentials, table permissions and TLS settings.';
}
export async function initializeDatabase(pool) {
 await pool.execute(`CREATE TABLE IF NOT EXISTS daymark_projects (
  name VARCHAR(50) NOT NULL PRIMARY KEY, color CHAR(7) NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 await pool.execute(`CREATE TABLE IF NOT EXISTS daymark_tasks (
  id CHAR(36) NOT NULL PRIMARY KEY, title VARCHAR(160) NOT NULL, description TEXT NOT NULL,
  project VARCHAR(50) NOT NULL, priority ENUM('Low','Medium','High') NOT NULL,
  due DATE NULL, status ENUM('todo','progress','done') NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (project) REFERENCES daymark_projects(name)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 for (const [name,color] of [['Website redesign','#a18cd1'],['Product launch','#df9d53'],['Personal','#6b9d91']]) {
  await pool.execute('INSERT IGNORE INTO daymark_projects (name,color) VALUES (?,?)',[name,color]);
 }
}
const taskColumns = "id,title,description,project,priority,COALESCE(DATE_FORMAT(due,'%Y-%m-%d'),'') AS due,status";
export function createRepository(pool) {
 return {
  async health() { await pool.execute('SELECT 1 FROM daymark_tasks LIMIT 1'); },
  async workspace() {
   const [projects] = await pool.execute('SELECT name,color FROM daymark_projects ORDER BY name');
   const [tasks] = await pool.execute(`SELECT ${taskColumns} FROM daymark_tasks ORDER BY created_at,id`);
   return { projects,tasks };
  },
  async createProject(project) {await pool.execute('INSERT INTO daymark_projects (name,color) VALUES (?,?)',[project.name,project.color]);return project;},
  async createTask(task) {
   const value={...task,id:randomUUID()};
   await pool.execute('INSERT INTO daymark_tasks (id,title,description,project,priority,due,status) VALUES (?,?,?,?,?,?,?)', [value.id,value.title,value.description,value.project,value.priority,value.due||null,value.status]);
   return value;
  },
  async updateTask(id, changes) {
   const keys=Object.keys(changes);
   // Keys have been allowlisted by the API validator; identifiers are never taken from request input.
   const allowed=['title','description','project','priority','due','status'];
   if (!keys.length || keys.some(key=>!allowed.includes(key))) throw new Error('Invalid update fields');
   const [result]=await pool.execute(`UPDATE daymark_tasks SET ${keys.map(key=>`${key}=?`).join(',')} WHERE id=?`,[...keys.map(key=>key==='due'?(changes[key]||null):changes[key]),id]);
   if(!result.affectedRows)return null;
   const [rows]=await pool.execute(`SELECT ${taskColumns} FROM daymark_tasks WHERE id=?`,[id]);
   return rows[0] || null;
  },
  async deleteTask(id) {const [result]=await pool.execute('DELETE FROM daymark_tasks WHERE id=?',[id]);return result.affectedRows>0;}
 };
}
export async function connectDatabase(env = process.env) {
 const pool=mysql.createPool(databaseConfig(env));
 try {await initializeDatabase(pool);return {pool,repository:createRepository(pool)};}
 catch(error){await pool.end();throw error;}
}
