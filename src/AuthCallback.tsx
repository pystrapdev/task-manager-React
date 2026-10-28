import {useEffect, useState} from 'react';
import {ForgeError} from '@cweb-app/forge';
import {forgeReady} from './forge';

function errorMessage(error:unknown):string{
 if(error instanceof ForgeError)return error.status?`Forge sign-in failed with HTTP ${error.status} (${error.code}).`:`Forge sign-in failed without an HTTP response (${error.code}).`;
 return error instanceof Error?error.message:'Forge sign-in could not be completed.';
}

export default function AuthCallback(){
 const [message,setMessage]=useState('Completing Forge sign-in…');
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  void forgeReady.then(({auth})=>{
   if(active)setMessage(auth.authenticated?'Sign-in complete. You can return to Daymark Forge records.':'Sign-in was not completed.');
  }).catch(reason=>{if(active){setError(errorMessage(reason));setMessage('Sign-in needs attention.');}});
  return()=>{active=false;};
 },[]);
 return <main className="forge-page"><section className="forge-content forge-callback" aria-labelledby="callback-title"><a href="/" className="brand"><span className="brand-mark">✳</span>daymark<span className="brand-period">.</span></a><p className="eyebrow">CWEB FORGE</p><h1 id="callback-title">Authentication callback</h1><p className="forge-intro" role="status">{message}</p>{error&&<p className="forge-error" role="alert">{error}</p>}<a className="button primary" href="/workspace">Continue to Daymark</a></section></main>;
}