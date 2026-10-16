import { databaseError } from './database.mjs';
const fields=['title','description','project','priority','due','status'];
function invalid(message,status=400){return Object.assign(new Error(message),{status});}
export function validateTask(body,partial=false) {
 if(!body||Array.isArray(body)||typeof body!=='object')throw invalid('Expected a JSON object.');
 if(Object.keys(body).some(key=>!fields.includes(key)))throw invalid('Unknown task fields.');
 if(!Object.keys(body).length)throw invalid('Provide at least one task field.');
 const result={};
 for(const key of fields){
  if(partial && !(key in body))continue;
  let value=body[key];
  if(typeof value!=='string')throw invalid(`${key} must be a string.`);
  if(key==='title'||key==='project')value=value.trim();
  if(key==='title'&&(!value||value.length>160))throw invalid('Task name must contain 1–160 characters.');
  if(key==='description'&&value.length>3000)throw invalid('Description must be at most 3000 characters.');
  if(key==='project'&&(!value||value.length>50))throw invalid('Choose a valid project.');
  if(key==='priority'&&!['Low','Medium','High'].includes(value))throw invalid('Invalid priority.');
  if(key==='status'&&!['todo','progress','done'].includes(value))throw invalid('Invalid status.');
  if(key==='due'&&value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1000-01-01'||value>'9999-12-31'||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))throw invalid('Due date must be a valid YYYY-MM-DD date.');
  result[key]=value;
 }
 return result;
}
async function body(req) {
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw invalid('Use application/json.',415);
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>16384)throw invalid('Request is too large.',413);chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw invalid('Invalid JSON.');}
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
export function createApi(repository) {
 return async(req,res)=>{
  const path=(req.url||'/').split('?')[0];
  if(path!=='/api'&&!path.startsWith('/api/'))return false;
  try{
   if(!['GET','HEAD'].includes(req.method)){
    // Reject cross-site browser writes; requests without Origin (CLI clients) remain supported.
    const origin=req.headers.origin;
    if(req.headers['sec-fetch-site']==='cross-site'||(origin&&new URL(origin).host!==req.headers.host))throw invalid('Cross-site requests are not allowed.',403);
   }
   if(path==='/api/health'&&req.method==='GET'){
    try{await repository.health();json(res,200,{status:'ok',database:'connected',engine:'mysql'});}
    catch{json(res,503,{status:'unavailable',database:'disconnected',engine:'mysql'});}
   }else if(path==='/api/workspace'&&req.method==='GET')json(res,200,await repository.workspace());
   else if(path==='/api/projects'&&req.method==='POST'){
    const data=await body(req);
    if(!data||typeof data.name!=='string'||!data.name.trim()||data.name.trim().length>50||typeof data.color!=='string'||!/^#[0-9a-f]{6}$/i.test(data.color))throw invalid('Provide a project name (1–50 characters) and a hex color.');
    json(res,201,await repository.createProject({name:data.name.trim(),color:data.color}));
   }else if(path==='/api/tasks'&&req.method==='POST')json(res,201,await repository.createTask(validateTask(await body(req))));
   else if(/^\/api\/tasks\/[a-f0-9-]{36}$/i.test(path)&&['PATCH','DELETE'].includes(req.method)){
    const id=path.split('/').pop();
    const result=req.method==='PATCH'?await repository.updateTask(id,validateTask(await body(req),true)):await repository.deleteTask(id);
    if(!result)throw invalid('Task not found. Refresh the workspace.',404);
    json(res,200,req.method==='DELETE'?{deleted:true}:result);
   }else json(res,404,{error:'API route not found.'});
  }catch(error){
   if(error.status)json(res,error.status,{error:error.message});
   else if(error.code==='ER_DUP_ENTRY')json(res,409,{error:'A project with this name already exists.'});
   else if(error.code==='ER_NO_REFERENCED_ROW_2')json(res,400,{error:'Project does not exist. Refresh the workspace.'});
   else{console.error(databaseError(error));json(res,503,{error:'Database unavailable. Your changes were not confirmed. Refresh before retrying.'});}
  }
  return true;
 };
}
