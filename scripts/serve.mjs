import { connectDatabase, databaseError } from '../server/database.mjs';
import { createApi } from '../server/api.mjs';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
export async function createAppServer(root = defaultRoot, repository = null) {
 const base = await realpath(root);
 await stat(resolve(base, 'index.html'));
 const api = repository ? createApi(repository) : null;
 return createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  if(api && await api(req,res))return;
  if(req.url === '/api' || req.url?.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Database not configured'}));return;}
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}); res.end('Method not allowed'); return; }
  try {
   const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
   let file = resolve(base, '.' + pathname);
   if (file !== base && !file.startsWith(base + sep)) {res.writeHead(403);res.end('Forbidden');return;}
   if (pathname.includes('\0')) {res.writeHead(400);res.end('Bad request');return;}
   let info;
   try {info = await stat(file);if(info.isDirectory()){file=resolve(file,'index.html');info=await stat(file);}}
   catch { if(extname(pathname)){res.writeHead(404);res.end('Not found');return;}file=resolve(base,'index.html');info=await stat(file); }
   const actual=await realpath(file);
   if(!actual.startsWith(base+sep)){res.writeHead(403);res.end('Forbidden');return;}
   if(!info.isFile()){res.writeHead(404);res.end('Not found');return;}
   res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':extname(file)==='.html'?'no-cache':/[-.][A-Z0-9]{8,}\./i.test(file)?'public, max-age=31536000, immutable':'public, max-age=3600'});
   if(req.method==='HEAD'){res.end();return;}
   createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  } catch(error) {res.writeHead(error instanceof URIError?400:500);res.end(error instanceof URIError?'Bad request':'Unable to serve this request');}
 });
}
if(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href){
 let pool;
 try {
  const port=Number(process.env.PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a number between 1 and 65535.');
  try{await stat(resolve(defaultRoot,'index.html'));}catch{throw new Error('React build not found. Run npm run build before npm start.');}
  const database=await connectDatabase();
  pool=database.pool;
  console.log('MySQL connected; Daymark tables are ready.');
  const server=await createAppServer(defaultRoot,database.repository);
  server.on('error',error=>{console.error(`Server could not start: ${error.message}`);void pool.end();process.exitCode=1;});
  server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Daymark is listening on port ${port}`));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>{void pool.end().then(()=>process.exit(0));});setTimeout(()=>process.exit(1),10000).unref();});
 }catch(error){if(pool)await pool.end();console.error(error.code ? databaseError(error) : error.message);process.exitCode=1;}
}
