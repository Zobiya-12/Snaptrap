import { api, pwStr } from "../constants";
import Badge from "./Badge";
import Loader from "./Loader";
import { PWBar } from "./shared";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function AccountPage({user, onLogout, onBack}){
  const [info,setInfo]=useState(null);const [del,setDel]=useState(false);const [delCfm,setDelCfm]=useState("");
  const [pwOld,setPwOld]=useState("");const [pwNew,setPwNew]=useState("");const [pwMsg,setPwMsg]=useState("");const [pwErr,setPwErr]=useState("");
  const str=pwStr(pwNew);
  useEffect(()=>{api("/control/info").then(setInfo);},[]);

  async function changePw(){
    if(str.s<3){setPwErr("New password too weak");return;}
    setPwMsg("");setPwErr("");
    const d=await api("/auth/change-password",{method:"POST",body:JSON.stringify({old_password:pwOld,new_password:pwNew})});
    if(d.ok){setPwMsg("Password updated!");setPwOld("");setPwNew("");}
    else setPwErr(d.error||"Failed — check current password");
  }
  async function requestDelete(){
    if(delCfm!=="DELETE") return;
    const d=await api("/control/request-delete",{method:"POST"});
    if(d.ok){alert("Deletion request submitted.");setDel(false);}
    else alert(d.error||"Request failed");
  }

  return <div className="acc-page">
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
      <button className="btn btn-4" style={{fontSize:10}} onClick={onBack}>← Dashboard</button>
      <div style={{fontFamily:"var(--head)",fontSize:16,color:"var(--c1)",letterSpacing:"2px"}}>ACCOUNT SETTINGS</div>
    </div>

    <div className="acc-section">
      <div className="acc-head">Profile</div>
      <div className="acc-body">
        {info?<>
          <div className="acc-row"><span className="acc-lk">Organisation</span><span className="acc-rv">{info.name}</span></div>
          <div className="acc-row"><span className="acc-lk">Email</span><span className="acc-rv">{info.email}</span></div>
          <div className="acc-row"><span className="acc-lk">Role</span><span><Badge v={user.role} map={{superadmin:"b5",org:"b4"}}/></span></div>
          <div className="acc-row"><span className="acc-lk">Agent Token</span><span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--c1)"}}>{info.agent_token?.slice(0,16)}…</span></div>
        </>:<Loader/>}
      </div>
    </div>

    <div className="acc-section">
      <div className="acc-head">Change Password</div>
      <div className="acc-body">
        <div className="afield"><label className="lbl">Current Password</label><input className="inp" type="password" value={pwOld} onChange={e=>setPwOld(e.target.value)} placeholder="Current password"/></div>
        <div className="afield"><label className="lbl">New Password</label><input className="inp" type="password" value={pwNew} onChange={e=>setPwNew(e.target.value)} placeholder="New password"/><PWBar pw={pwNew}/></div>
        {pwErr&&<div className="aerr" style={{marginBottom:10}}>⚠ {pwErr}</div>}
        {pwMsg&&<div className="aok" style={{marginBottom:10}}>✓ {pwMsg}</div>}
        <button className="btn btn-1" onClick={changePw}>Update Password</button>
      </div>
    </div>

    <div className="acc-section">
      <div className="acc-head">Session</div>
      <div className="acc-body">
        <div className="acc-row"><span className="acc-lk">Status</span><span><Badge v="Active" map={{Active:"b1"}}/></span></div>
        <div className="acc-row" style={{borderBottom:"none"}}><span className="acc-lk">Action</span><button className="btn btn-3" onClick={onLogout}>Logout →</button></div>
      </div>
    </div>

    <div className="acc-section" style={{borderColor:"var(--c2b)"}}>
      <div className="acc-head" style={{color:"var(--c2)"}}>⚠ Danger Zone</div>
      <div className="acc-body">
        {user?.role==="superadmin"
          ? <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt2)",lineHeight:2}}>Superadmin accounts cannot be self-deleted.</div>
          : <>
            <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt2)",marginBottom:16,lineHeight:2}}>Requesting account deletion notifies the admin. All data is permanently removed after admin approval.</div>
            {!del?<button className="btn btn-2" onClick={()=>setDel(true)}>Request Account Deletion</button>:<div>
              <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--c2)",marginBottom:10}}>Type <strong>DELETE</strong> to confirm:</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <input className="inp" placeholder="DELETE" value={delCfm} onChange={e=>setDelCfm(e.target.value)} style={{borderColor:"var(--c2b)",maxWidth:200}}/>
                <button className="btn btn-2" onClick={requestDelete} disabled={delCfm!=="DELETE"}>Confirm</button>
                <button className="btn btn-ghost" onClick={()=>{setDel(false);setDelCfm("");}}>Cancel</button>
              </div>
            </div>}
          </>
        }
      </div>
    </div>
  </div>;
}
export default AccountPage; 
/* ═══════════════════════════════════════════════════════════
   MODULE 1 — LIVE MONITOR
   - cursorRef set to max-id at mount → no old attacks on battlefield
   - newBatch state: only the LATEST poll batch sent to Battlefield
     so the seen-set never blocks them (each batch is fresh unique ids)
   - historyFeed accumulates for the scrollable list
   - limit=500 on since_id so 200-attacker simulator waves all come through
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   LIVE MONITOR ATTACK SIMULATOR — injects attacks directly
   into the battlefield feed via simBatch state
═══════════════════════════════════════════════════════════ */