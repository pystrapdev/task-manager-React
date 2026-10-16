import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApi,validateTask } from '../server/api.mjs';
import { databaseConfig } from '../server/database.mjs';
const task={title:'Test MySQL',description:'Saved remotely',project:'Personal',priority:'High',due:'2026-10-14',status:'todo'};
test('MySQL config requires credentials, defaults to port 3306, preserves passwords, and verifies TLS',()=>{
 const env={DB_HOST:'db.example.test',DB_NAME:'daymark',DB_USER:'user',DB_PASSWORD:' pass '};
 const config=databaseConfig(env);assert.equal(config.port,3306);assert.equal(config.password,' pass ');
 assert.throws(()=>databaseConfig({}),/DB_HOST/);
 assert.throws(()=>databaseConfig({...env,DB_PORT:'5432oops'}),/DB_PORT/);
 assert.deepEqual(databaseConfig({...env,DB_SSL:'true'}).ssl,{rejectUnauthorized:true});
 assert.throws(()=>databaseConfig({...env,DB_SSL:'yes'}),/DB_SSL/);
});
test('task validation rejects impossible dates and unsafe fields and supports partial updates',()=>{
 assert.deepEqual(validateTask(task),task);assert.deepEqual(validateTask({status:'done'},true),{status:'done'});
 for(const change of [{due:'2026-02-30'},{due:'0000-01-01'},{status:'bad'},{title:' '},{id:'injected'},{description:'x'.repeat(3001)}])assert.throws(()=>validateTask({...task,...change}));
 assert.throws(()=>validateTask({},true));
});
test('API returns CRUD results, validation, missing records, and live health without leaking credentials',async()=>{
 const id='11111111-1111-4111-8111-111111111111';let saved=null;let unavailable=false;
 const repository={health:async()=>{if(unavailable)throw new Error('password=secret');},workspace:async()=>({projects:[{name:'Personal',color:'#123456'}],tasks:saved?[saved]:[]}),createTask:async value=>(saved={...value,id}),updateTask:async(key,value)=>saved?(saved={...saved,...value}):null,deleteTask:async()=>{const exists=!!saved;saved=null;return exists;},createProject:async()=>{throw Object.assign(new Error('SQL secret'),{code:'ER_DUP_ENTRY'});}};
 const api=createApi(repository);const server=createServer(async(req,res)=>{if(!await api(req,res)){res.writeHead(404);res.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=(path,method='GET',data,headers={})=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...headers},body:data===undefined?undefined:JSON.stringify(data)});
 try{
  assert.deepEqual(await (await request('/api/health')).json(),{status:'ok',database:'connected',engine:'mysql'});
  const created=await request('/api/tasks','POST',task);assert.equal(created.status,201);assert.equal((await created.json()).id,id);
  assert.equal((await (await request('/api/workspace')).json()).tasks.length,1);
  assert.equal((await (await request('/api/tasks/'+id,'PATCH',{status:'done'})).json()).status,'done');
  assert.equal((await request('/api/tasks','POST',{...task,due:'2026-02-30'})).status,400);
  assert.equal((await request('/api/tasks','POST',task,{Origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/projects','POST',{name:'Personal',color:'#123456'})).status,409);
  assert.equal((await request('/api/tasks/'+id,'DELETE')).status,200);
  assert.equal((await request('/api/tasks/'+id,'PATCH',{status:'todo'})).status,404);
  unavailable=true;const health=await request('/api/health');assert.equal(health.status,503);assert.doesNotMatch(await health.text(),/secret/);
  assert.equal((await request('/api/missing')).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
