import {useEffect, useState} from 'react';
import {ForgeError} from '@cweb-app/forge';
import {forgeReady} from './forge';

type AuthMode = 'login' | 'signup';

function errorMessage(error:unknown):string{
 if(error instanceof ForgeError)return error.status?`Forge authentication failed with HTTP ${error.status} (${error.code}).`:`Forge authentication failed without an HTTP response (${error.code}).`;
 return error instanceof Error?error.message:'Forge authentication could not be completed.';
}

export default function AuthPage(){
 const [mode,setMode]=useState<AuthMode>('login');
 const [authenticated,setAuthenticated]=useState(false);
 const [ready,setReady]=useState(false);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  void forgeReady.then(({auth})=>{
   if(!active)return;
   setAuthenticated(auth.authenticated);
   setReady(true);
    if(auth.authenticated)window.location.replace('/workspace');
  }).catch(reason=>{if(active){setReady(true);setError(errorMessage(reason));}});
  return()=>{active=false;};
 },[]);

 async function startAuth(){
  if(working)return;
  setWorking(true);setError('');
  try{
   const {auth}=await forgeReady;
   await auth[mode]();
  }catch(reason){setError(errorMessage(reason));setWorking(false);}
 }

 return <main className="forge-page auth-page">
    <header className="forge-page-header"><a href="/" className="brand"><span className="brand-mark">✳</span>daymark<span className="brand-period">.</span></a><a className="forge-back-link" href="/workspace">Open workspace</a></header>
  <section className="auth-content" aria-labelledby="auth-title">
   <div className="auth-copy"><p className="eyebrow">A CLEAR SPACE FOR YOUR WORK</p><h1>Make room for meaningful work.</h1><p>Sign in to keep your Daymark workspace close, wherever the day takes you.</p><div className="auth-art" aria-hidden="true"><span className="auth-art-line line-one"/><span className="auth-art-line line-two"/><span className="auth-art-dot"/></div></div>
   <div className="auth-panel">
    <p className="eyebrow">CWEB FORGE ACCOUNT</p>
    <h2 id="auth-title">{mode==='login'?'Welcome back':'Create your account'}</h2>
    <p className="auth-description">{mode==='login'?'Continue with your Forge application account.':'Sign up for a Forge application account to get started.'}</p>
    <div className="auth-mode" role="group" aria-label="Authentication mode"><button type="button" aria-pressed={mode==='login'} className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('');}}>Log in</button><button type="button" aria-pressed={mode==='signup'} className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');}}>Sign up</button></div>
    <div className="auth-state" role="status"><span className={authenticated?'forge-status-dot connected':'forge-status-dot'}/>{!ready?'Connecting to Forge…':authenticated?'Signed in':'Not signed in'}</div>
    {error&&<p className="forge-error" role="alert">{error}</p>}
    <button className="button primary auth-submit" disabled={!ready||working||authenticated} onClick={()=>void startAuth()}>{working?'Opening secure sign-in…':mode==='login'?'Continue to log in':'Continue to sign up'}</button>
    <p className="auth-security">Authentication is handled by cWeb Forge. Daymark never asks for or stores your password.</p>
    <a className="auth-record-link" href="/forge">Already signed in? Open your records</a>
   </div>
  </section>
 </main>;
}