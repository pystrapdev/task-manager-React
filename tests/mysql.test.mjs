import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDatabase } from '../server/database.mjs';
import { randomUUID } from 'node:crypto';
test('real MySQL CRUD persists across connection pool restarts', {skip:process.env.RUN_MYSQL_TESTS!=='true'},async()=>{
 let db=await connectDatabase();const name='test-'+randomUUID();let task;
 try{
  await db.repository.createProject({name,color:'#123456'});
  task=await db.repository.createTask({title:"Persist 'quoted' task",description:'Database test',project:name,priority:'High',status:'todo',due:'2026-10-14'});
  await db.pool.end();db=await connectDatabase();
  assert.equal((await db.repository.workspace()).tasks.find(t=>t.id===task.id).title,task.title);
  assert.equal((await db.repository.updateTask(task.id,{status:'done'})).status,'done');
  await db.repository.health();assert.equal(await db.repository.deleteTask(task.id),true);
  assert.equal((await db.repository.workspace()).tasks.some(t=>t.id===task.id),false);
 }finally{if(task)await db.pool.execute('DELETE FROM daymark_tasks WHERE id=?',[task.id]);await db.pool.execute('DELETE FROM daymark_projects WHERE name=?',[name]);await db.pool.end();}
});
