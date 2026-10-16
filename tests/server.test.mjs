import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAppServer } from '../scripts/serve.mjs';
test('production server serves assets, supports HEAD and navigation, and rejects missing assets',async()=>{
 const root=await mkdtemp(join(tmpdir(),'daymark-test-'));
 await writeFile(join(root,'index.html'),'<app-root>Daymark</app-root>');
 await writeFile(join(root,'main-ABCD1234.js'),'console.log("Daymark")');
 const server=await createAppServer(root);
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}`;
  const home=await fetch(base);assert.equal(home.status,200);assert.equal(home.headers.get('cache-control'),'no-cache');assert.match(await home.text(),/Daymark/);
  const navigation=await fetch(base+'/tasks/today');assert.equal(navigation.status,200);assert.match(await navigation.text(),/app-root/);
  const asset=await fetch(base+'/main-ABCD1234.js',{method:'HEAD'});assert.equal(asset.status,200);assert.match(asset.headers.get('content-type'),/javascript/);assert.match(asset.headers.get('cache-control'),/immutable/);assert.equal(await asset.text(),'');
  assert.equal((await fetch(base+'/missing.js')).status,404);
  assert.equal((await fetch(base,{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/%E0%A4%A')).status,400);
  assert.equal((await fetch(base+'/%2e%2e%2fsecret')).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});
