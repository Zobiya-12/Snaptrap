import React, { useEffect, useRef, useState } from "react";
import { api } from "../constants";
import "../legal/legal.css";

/* Landing page for the link in the verification email  (/?verify=<token>).
   The token is POSTed — never fetched with GET — so mail scanners that prefetch links
   can't use it up before the person clicks. */
export default function VerifyEmail({ token, onDone }) {
  const [state, setState] = useState("working");   // working | ok | bad
  const [msg, setMsg] = useState("");
  const started = useRef(false);                    // React StrictMode runs effects twice in dev; the token is single-use

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }).then(d => {
      if (d.ok) setState("ok");
      else { setState("bad"); setMsg(d.error || "Link invalid or expired"); }
    });
  }, [token]);

  return <div className="vf-wrap"><div className="vf-card">
    <div className="eyebrow">Email verification</div>
    {state === "working" && <><h1>Verifying…</h1><p>One moment.</p></>}
    {state === "ok" && <><h1>Email verified</h1><p>Your account is active. Sign in to open your dashboard.</p>
      <button className="abtn" onClick={() => onDone(true)}>Go to sign in →</button></>}
    {state === "bad" && <><h1>Link didn’t work</h1>
      <p>{msg}. It may have expired, or you may already have verified — try signing in. If you can’t sign in, request a fresh link from the sign-in screen.</p>
      <button className="abtn" onClick={() => onDone(false)}>Go to sign in →</button></>}
  </div></div>;
}
