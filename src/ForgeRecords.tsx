import {useEffect, useState} from 'react';
import {ForgeError, type Document} from '@cweb-app/forge';
import {forgeReady} from './forge';

type RecordData = {title: string; createdAt: string};

function errorMessage(error: unknown): string {
 if(error instanceof ForgeError){
  if(error.status===0)return `Forge request failed without an HTTP response (${error.code}). Check your connection.`;
  if(error.status===401)return 'Forge returned HTTP 401. Sign in again and retry.';
  if(error.status===403)return 'Forge returned HTTP 403. Check the records collection access rules.';
  return `Forge request failed with HTTP ${error.status} (${error.code}).`;
 }
 return error instanceof Error?error.message:'Forge request failed. Please try again.';
}

export default function ForgeRecords(){
 const [authenticated,setAuthenticated]=useState(false);
 const [authReady,setAuthReady]=useState(false);
 const [records,setRecords]=useState<Document<RecordData>[]>([]);
 const [nextCursor,setNextCursor]=useState<string|null>(null);
 const [title,setTitle]=useState('A Daymark test record');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');

 async function loadRecords(cursor?:string){
  const {forge}=await forgeReady;
  const page=await forge.collection<RecordData>('records').list({limit:50,...(cursor?{after:cursor}:{})});
  setRecords(current=>cursor?[...current,...page.items]:page.items);
  setNextCursor(page.next_cursor);
 }

 useEffect(()=>{
  let active=true;
  void forgeReady.then(async({auth})=>{
   if(!active)return;
   setAuthenticated(auth.authenticated);
   setAuthReady(true);
   if(!auth.authenticated)throw new Error('Forge sign-in did not complete.');
   await loadRecords();
  }).catch(reason=>{if(active)setError(errorMessage(reason));}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);

 async function saveRecord(){
  const value=title.trim();
  if(!value||busy)return;
  setBusy(true);setError('');
  try{
   const {forge}=await forgeReady;
   await forge.collection<RecordData>('records').create({title:value,createdAt:new Date().toISOString()});
   await loadRecords();
  }catch(reason){setError(errorMessage(reason));}
  finally{setBusy(false);}
 }

 async function loadMore(){
  if(!nextCursor||busy)return;
  setBusy(true);setError('');
  try{await loadRecords(nextCursor);}catch(reason){setError(errorMessage(reason));}
  finally{setBusy(false);}
 }

 return <main className="forge-page">
  <div className="forge-page-header"><a href="/" className="brand"><span className="brand-mark">✳</span>daymark<span className="brand-period">.</span></a><a className="forge-back-link" href="/">Back to Daymark</a></div>
  <section className="forge-content" aria-labelledby="forge-title">
   <p className="eyebrow">CWEB FORGE</p>
   <h1 id="forge-title">Records connection</h1>
   <p className="forge-intro">A live check of signed-in access to Daymark’s private records collection.</p>
   <div className="forge-auth-state" role="status"><span className={authenticated?'forge-status-dot connected':'forge-status-dot'}/>{!authReady?'Checking sign-in…':authenticated?'Signed in with Forge':'Not signed in'}</div>
   {error&&<p className="forge-error" role="alert">{error}</p>}
   <form className="forge-save-form" onSubmit={event=>{event.preventDefault();void saveRecord();}}>
    <label htmlFor="forge-record-title">Record title</label>
    <div><input id="forge-record-title" value={title} onChange={event=>setTitle(event.target.value)} maxLength={160} required/><button className="button primary" type="submit" disabled={!authenticated||busy||!title.trim()}>{busy?'Saving…':'Save record'}</button></div>
   </form>
   <div className="forge-record-heading"><h2>Your records</h2><span>{records.length} loaded</span></div>
   {loading?<p className="forge-empty" role="status">Loading records…</p>:records.length===0?<p className="forge-empty">No records yet. Save one to verify Forge writes.</p>:<ul className="forge-record-list">{records.map(record=><li key={record.id}><span>{record.data.title||'Untitled record'}</span><small>{new Date(record.data.createdAt).toLocaleString()}</small></li>)}</ul>}
   {nextCursor&&<button className="button secondary forge-more" disabled={busy} onClick={()=>void loadMore()}>{busy?'Loading…':'Load more records'}</button>}
  </section>
 </main>;
}