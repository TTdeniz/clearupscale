import { useState, useRef, useCallback, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";

const CREDIT_PACKS = [
  { credits: 2000, price: 7, images: 20 },
  { credits: 3000, price: 10, images: 30 },
  { credits: 5000, price: 15, images: 50 },
  { credits: 10000, price: 25, images: 100 },
  { credits: 20000, price: 45, images: 200 },
];

export default function ClearUpscale() {
  const [page, setPage] = useState("home");
  const [image, setImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [plan, setPlan] = useState("free");
  const [credits, setCredits] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const fileRef = useRef(null);

  const onFiles = useCallback((files) => {
    const f = files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setImageName(f.name);
    setImageFile(f);
    const r = new FileReader();
    r.onload = (e) => { setImage(e.target.result); setPage("choose"); };
    r.readAsDataURL(f);
  }, []);

  const process = async (m) => {
    setMode(m);
    setPage("processing");
    setProgress(0);
    setStage("Loading AI model...");

    try {
      if (m === "both") {
        const blob = await removeBackground(imageFile, {
          progress: (key, current, total) => {
            if (key === "compute:inference") {
              const pct = Math.round((current / total) * 60) + 20;
              setProgress(Math.min(pct, 80));
              if (pct < 40) setStage("Detecting subject...");
              else if (pct < 60) setStage("Removing background...");
              else setStage("Refining edges...");
            } else {
              const pct = Math.round((current / total) * 20);
              setProgress(Math.min(pct, 20));
              setStage("Loading AI model...");
            }
          }
        });

        setProgress(85);
        setStage("Upscaling image...");

        const img = new Image();
        const blobUrl = URL.createObjectURL(blob);
        img.src = blobUrl;
        await new Promise((resolve) => { img.onload = resolve; });

        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(blobUrl);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;
        const copy = new Uint8ClampedArray(data);
        const kernel = [0, -1, 0, -1, 5.2, -1, 0, -1, 0];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let val = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * w + (x + kx)) * 4 + c;
                  val += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
              }
              data[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, val));
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);

        setProgress(95);
        setStage("Finalizing...");

        const resultUrl = canvas.toDataURL("image/png");
        setResultImage(resultUrl);

} else {
        setStage("Preparing image...");
        setProgress(10);

        const img = new Image();
        img.src = image;
        await new Promise((resolve) => { img.onload = resolve; });

        setStage("Upscaling image (2x)...");
        setProgress(30);

        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        setStage("Sharpening details...");
        setProgress(50);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;
        const copy = new Uint8ClampedArray(data);

        const kernel = [0, -1, 0, -1, 5.2, -1, 0, -1, 0];

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let val = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * w + (x + kx)) * 4 + c;
                  val += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
              }
              data[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, val));
            }
          }
        }

        setStage("Enhancing colors...");
        setProgress(75);

        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.02 + 2);
          data[i + 1] = Math.min(255, data[i + 1] * 1.02 + 2);
          data[i + 2] = Math.min(255, data[i + 2] * 1.02 + 2);
        }

        ctx.putImageData(imageData, 0, 0);

        setProgress(95);
        setStage("Finalizing...");

        await new Promise((resolve) => setTimeout(resolve, 300));

        const resultUrl = canvas.toDataURL("image/png");
        setResultImage(resultUrl);
      }

      setProgress(100);
      setTimeout(() => {
        if (plan !== "free") setCredits(v => v - (m === "both" ? 100 : 75));
        setPage("result");
      }, 400);

    } catch (error) {
      console.error("Processing error:", error);
      setStage("Error: " + error.message);
    }
  };

  const reset = () => {
    setImage(null);
    setResultImage(null);
    setImageFile(null);
    setImageName("");
    setMode(null);
    setProgress(0);
    setStage("");
    setPage("home");
  };

  const nb = {padding:"7px 14px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#999",fontSize:13,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:500};
  const is = {padding:"13px 14px",borderRadius:9,fontSize:14,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:"#fff",fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"};
  const chk = (color) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;

  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 0%,rgba(108,92,231,0.08) 0%,#0a0a0e 60%)",color:"#fff",fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}::selection{background:rgba(108,92,231,0.3)}input:focus{border-color:rgba(108,92,231,0.5)!important}`}</style>

      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 28px",borderBottom:"1px solid rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100,background:"rgba(10,10,14,0.85)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={reset}>
          <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#6C5CE7,#00B894)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",letterSpacing:"-0.5px"}}>CU</div>
          <span style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:600,color:"#fff",letterSpacing:"-0.3px"}}>ClearUpscale</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setPage("pricing")} style={nb}>Pricing</button>
          {loggedIn ? (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {plan!=="free"&&<span style={{fontSize:12,color:"#00B894",fontWeight:500,fontFamily:"'DM Mono',monospace"}}>{credits.toLocaleString()} cr</span>}
              <button onClick={()=>setPage("account")} style={{...nb,background:"rgba(108,92,231,0.12)",border:"1px solid rgba(108,92,231,0.25)"}}>Account</button>
            </div>
          ) : (
            <button onClick={()=>setShowLogin(true)} style={{...nb,background:"linear-gradient(135deg,#6C5CE7,#5A4BD1)",border:"none",color:"#fff"}}>Sign in</button>
          )}
        </div>
      </nav>

      {showLogin&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}} onClick={()=>setShowLogin(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#16161a",borderRadius:16,padding:"36px 32px",width:360,border:"1px solid rgba(255,255,255,0.08)",animation:"fu 0.3s ease"}}>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:600,color:"#fff",margin:"0 0 6px"}}>Welcome</h2>
          <p style={{color:"#8888a0",fontSize:14,margin:"0 0 24px"}}>Sign in or create an account</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={is}/>
            <input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} style={is}/>
            <button onClick={()=>{setLoggedIn(true);setShowLogin(false);}} style={{padding:"13px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#6C5CE7,#5A4BD1)",color:"#fff",fontSize:15,fontWeight:600,fontFamily:"'Outfit',sans-serif",marginTop:4}}>Sign in</button>
          </div>
          <p style={{textAlign:"center",color:"#8888a0",fontSize:13,marginTop:18,marginBottom:0}}>New here? <span style={{color:"#6C5CE7",cursor:"pointer",fontWeight:500}} onClick={()=>{setLoggedIn(true);setShowLogin(false);}}>Create free account</span></p>
        </div>
      </div>}

      {page==="home"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"56px 24px 80px",maxWidth:680,margin:"0 auto",animation:"fu 0.5s ease"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:100,border:"1px solid rgba(0,184,148,0.2)",background:"rgba(0,184,148,0.06)",marginBottom:22}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#00B894"}}/>
          <span style={{fontSize:11,color:"#00B894",fontWeight:500,fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>FREE & UNLIMITED</span>
        </div>
        <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:"clamp(34px,5.5vw,52px)",fontWeight:700,color:"#fff",textAlign:"center",lineHeight:1.08,margin:"0 0 14px",letterSpacing:"-1.5px"}}>
          Remove background<br/><span style={{background:"linear-gradient(135deg,#6C5CE7,#00B894)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>& upscale</span> in one step
        </h1>
        <p style={{color:"#8888a0",fontSize:16,textAlign:"center",maxWidth:440,lineHeight:1.6,margin:"0 0 44px"}}>Upload your image. Get a clean, high-resolution result. No signup required. No limits.</p>
        <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);onFiles(e.dataTransfer.files);}} onClick={()=>fileRef.current?.click()}
          style={{width:"100%",maxWidth:520,padding:"52px 28px",borderRadius:20,cursor:"pointer",border:dragOver?"2px solid #6C5CE7":"2px dashed rgba(255,255,255,0.1)",background:dragOver?"rgba(108,92,231,0.08)":"rgba(255,255,255,0.015)",transition:"all 0.25s",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>onFiles(e.target.files)}/>
          <div style={{width:56,height:56,borderRadius:14,background:"rgba(108,92,231,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <p style={{color:"#fff",fontSize:15,fontWeight:500,margin:"0 0 4px",fontFamily:"'Outfit',sans-serif"}}>Drop your image here</p>
          <p style={{color:"#8888a0",fontSize:13,margin:0}}>or <span style={{color:"#6C5CE7",fontWeight:500}}>click to browse</span></p>
          <p style={{color:"#444",fontSize:11,margin:0}}>PNG, JPG, WebP up to 12MB</p>
        </div>
        <div style={{display:"flex",gap:36,marginTop:52,flexWrap:"wrap",justifyContent:"center"}}>
          {[["⚡","Instant","Results in seconds"],["∞","Unlimited","Free forever"],["✦","Two-in-one","Remove bg + upscale"]].map(([i,l,d])=>(
            <div key={l} style={{textAlign:"center",minWidth:110}}><div style={{fontSize:20,marginBottom:6}}>{i}</div><p style={{color:"#fff",fontSize:13,fontWeight:600,margin:"0 0 2px",fontFamily:"'Outfit',sans-serif"}}>{l}</p><p style={{color:"#8888a0",fontSize:12,margin:0}}>{d}</p></div>
          ))}
        </div>
      </div>}

      {page==="choose"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"44px 24px",maxWidth:600,margin:"0 auto",animation:"fu 0.4s ease"}}>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:600,color:"#fff",margin:"0 0 6px"}}>What do you need?</h2>
        <p style={{color:"#8888a0",fontSize:14,margin:"0 0 28px"}}>Choose for <span style={{color:"#bbb"}}>{imageName}</span></p>
        <div style={{width:80,height:80,borderRadius:12,overflow:"hidden",border:"2px solid rgba(255,255,255,0.07)",marginBottom:32}}><img src={image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
        <div style={{display:"flex",gap:14,width:"100%",flexWrap:"wrap",justifyContent:"center"}}>
          <button onClick={()=>process("both")} style={{flex:"1 1 220px",maxWidth:280,padding:"24px 20px",borderRadius:14,border:"1px solid rgba(108,92,231,0.25)",background:"rgba(108,92,231,0.06)",cursor:"pointer",textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,color:"#fff"}}>Remove bg & upscale</span>
            </div>
            <p style={{color:"#8888a0",fontSize:13,margin:0,lineHeight:1.4}}>Remove background and enhance resolution in one step</p>
            {plan!=="free"&&<p style={{color:"#6C5CE7",fontSize:11,fontFamily:"'DM Mono',monospace",marginTop:8,marginBottom:0}}>100 credits</p>}
          </button>
          <button onClick={()=>process("upscale")} style={{flex:"1 1 220px",maxWidth:280,padding:"24px 20px",borderRadius:14,border:"1px solid rgba(0,184,148,0.25)",background:"rgba(0,184,148,0.04)",cursor:"pointer",textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,color:"#fff"}}>Upscale only</span>
            </div>
            <p style={{color:"#8888a0",fontSize:13,margin:0,lineHeight:1.4}}>Enhance resolution and sharpen, keep background</p>
            {plan!=="free"&&<p style={{color:"#00B894",fontSize:11,fontFamily:"'DM Mono',monospace",marginTop:8,marginBottom:0}}>75 credits</p>}
          </button>
        </div>
        <button onClick={reset} style={{marginTop:24,padding:"8px 18px",borderRadius:8,border:"none",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>← Different image</button>
      </div>}

      {page==="processing"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px",maxWidth:460,margin:"0 auto",minHeight:"60vh"}}>
        <div style={{width:80,height:80,borderRadius:18,overflow:"hidden",border:"2px solid rgba(255,255,255,0.06)",marginBottom:32,position:"relative"}}>
          <img src={image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.5)"}}/>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:26,height:26,border:"3px solid transparent",borderTop:"3px solid #6C5CE7",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          </div>
        </div>
        <p style={{fontFamily:"'Outfit',sans-serif",fontSize:19,fontWeight:600,color:"#fff",margin:"0 0 6px"}}>{mode==="both"?"Removing bg & upscaling":"Upscaling image"}</p>
        <p style={{color:"#8888a0",fontSize:13,margin:"0 0 28px",fontFamily:"'DM Mono',monospace"}}>{stage}</p>
        <div style={{width:"100%",maxWidth:320,height:5,borderRadius:3,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#6C5CE7,#00B894)",width:`${progress}%`,transition:"width 0.3s"}}/>
        </div>
        <p style={{color:"#444",fontSize:11,marginTop:10,fontFamily:"'DM Mono',monospace"}}>{Math.round(progress)}%</p>
        {stage.startsWith("Loading AI model") && <p style={{color:"#555",fontSize:11,marginTop:16,textAlign:"center",maxWidth:300}}>First time takes longer while the AI model downloads. It will be cached for future use.</p>}
      </div>}

      {page==="result"&&<ResultPage image={image} resultImage={resultImage} imageName={imageName} mode={mode} plan={plan} reset={reset} setPage={setPage}/>}

      {page==="pricing"&&<div style={{padding:"44px 24px 80px",maxWidth:860,margin:"0 auto",animation:"fu 0.4s ease"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:32,fontWeight:700,color:"#fff",margin:"0 0 8px",letterSpacing:"-0.5px"}}>Simple pricing</h2>
          <p style={{color:"#8888a0",fontSize:15,margin:0}}>Free forever. Upgrade when you need more.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14,marginBottom:52}}>
          {[
            {k:"free",l:"Free",c:"#8888a0",p:"$0",s:"/forever",cr:null,fs:["Unlimited images","One at a time","Standard resolution","Browser-based"],bl:"Current plan",bs:{background:"rgba(255,255,255,0.05)",color:"#888",border:"1px solid rgba(255,255,255,0.08)"},pop:false},
            {k:"premium",l:"Premium",c:"#6C5CE7",p:"$20",s:"/mo",cr:"10,000 credits",fs:["100 images/month","Up to 10 at once","2x faster processing","Higher resolution"],bl:"Get Premium",bs:{background:"linear-gradient(135deg,#6C5CE7,#5A4BD1)",color:"#fff",border:"none"},pop:true},
            {k:"advanced",l:"Advanced",c:"#00B894",p:"$110",s:"/mo",cr:"50,000 credits",fs:["500 images/month","Up to 20 at once","2x faster processing","Higher resolution"],bl:"Get Advanced",bs:{background:"rgba(0,184,148,0.12)",color:"#00B894",border:"1px solid rgba(0,184,148,0.25)"},pop:false},
          ].map(pl=>(
            <div key={pl.k} style={{padding:"28px 22px",borderRadius:14,border:pl.pop?"1px solid rgba(108,92,231,0.35)":"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.015)",position:"relative"}}>
              {pl.pop&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",padding:"3px 12px",borderRadius:100,fontSize:10,fontWeight:600,background:"#6C5CE7",color:"#fff",fontFamily:"'Outfit',sans-serif",letterSpacing:"0.5px"}}>POPULAR</div>}
              <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:pl.c,margin:0,textTransform:"uppercase",letterSpacing:"0.8px"}}>{pl.l}</p>
              <div style={{display:"flex",alignItems:"baseline",gap:4,margin:"10px 0 2px"}}><span style={{fontFamily:"'Outfit',sans-serif",fontSize:36,fontWeight:700,color:"#fff"}}>{pl.p}</span><span style={{color:"#8888a0",fontSize:13}}>{pl.s}</span></div>
              {pl.cr?<p style={{color:"#666",fontSize:11,margin:"0 0 18px",fontFamily:"'DM Mono',monospace"}}>{pl.cr}</p>:<div style={{height:18,marginBottom:18}}/>}
              {pl.fs.map(f=><div key={f} style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>{chk(pl.k==="free"?"#00B894":pl.c)}<span style={{color:"#999",fontSize:13}}>{f}</span></div>)}
              <button onClick={()=>{if(pl.k!=="free"){setPlan(pl.k);setCredits(pl.k==="premium"?10000:50000);setLoggedIn(true);}}} style={{width:"100%",padding:"12px",borderRadius:9,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginTop:20,...pl.bs}}>{pl.bl}</button>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginBottom:24}}>
          <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:600,color:"#fff",margin:"0 0 6px"}}>Or buy credits</h3>
          <p style={{color:"#8888a0",fontSize:13,margin:0}}>Pay as you go, no subscription needed</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
          {CREDIT_PACKS.map(p=>(
            <div key={p.credits} onClick={()=>{setCredits(c=>c+p.credits);setLoggedIn(true);}} style={{padding:"18px 14px",borderRadius:12,textAlign:"center",border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.015)",cursor:"pointer",transition:"all 0.2s"}}>
              <p style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#6C5CE7",fontWeight:500,margin:"0 0 4px"}}>{p.credits.toLocaleString()} credits</p>
              <p style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:700,color:"#fff",margin:"0 0 2px"}}>${p.price}</p>
              <p style={{color:"#666",fontSize:11,margin:0}}>~{p.images} images</p>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:36}}><button onClick={()=>setPage("home")} style={{padding:"8px 20px",borderRadius:8,border:"none",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>← Back</button></div>
      </div>}

      {page==="account"&&<div style={{padding:"44px 24px",maxWidth:480,margin:"0 auto",animation:"fu 0.4s ease"}}>
        <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:600,color:"#fff",margin:"0 0 28px"}}>Account</h2>
        <div style={{padding:20,borderRadius:12,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.015)",marginBottom:12}}>
          <p style={{color:"#666",fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Email</p>
          <p style={{color:"#fff",fontSize:14,margin:0}}>{email||"user@example.com"}</p>
        </div>
        <div style={{padding:20,borderRadius:12,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.015)",marginBottom:12}}>
          <p style={{color:"#666",fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Plan</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <p style={{color:plan==="free"?"#fff":plan==="premium"?"#6C5CE7":"#00B894",fontSize:17,fontWeight:600,margin:0,fontFamily:"'Outfit',sans-serif"}}>{plan==="free"?"Free":plan==="premium"?"Premium":"Advanced"}</p>
            {plan==="free"&&<button onClick={()=>setPage("pricing")} style={{padding:"6px 14px",borderRadius:7,border:"none",cursor:"pointer",background:"#6C5CE7",color:"#fff",fontSize:12,fontWeight:600}}>Upgrade</button>}
          </div>
        </div>
        {plan!=="free"&&<>
          <div style={{padding:20,borderRadius:12,border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.015)",marginBottom:12}}>
            <p style={{color:"#666",fontSize:11,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Credits remaining</p>
            <p style={{color:"#00B894",fontSize:26,fontWeight:700,margin:0,fontFamily:"'DM Mono',monospace"}}>{credits.toLocaleString()}</p>
          </div>
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <button style={{flex:1,padding:11,borderRadius:9,cursor:"pointer",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)",color:"#bbb",fontSize:13,fontFamily:"'Outfit',sans-serif"}}>Manage subscription</button>
            <button onClick={()=>{setPlan("free");setCredits(0);}} style={{flex:1,padding:11,borderRadius:9,cursor:"pointer",border:"1px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.05)",color:"#ef4444",fontSize:13,fontFamily:"'Outfit',sans-serif"}}>Cancel plan</button>
          </div>
        </>}
        <button onClick={()=>{setLoggedIn(false);setPlan("free");setCredits(0);setPage("home");}} style={{width:"100%",marginTop:28,padding:11,borderRadius:9,border:"1px solid rgba(255,255,255,0.06)",background:"transparent",color:"#666",fontSize:13,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Sign out</button>
        <div style={{textAlign:"center",marginTop:20}}><button onClick={()=>setPage("home")} style={{padding:"8px 20px",borderRadius:8,border:"none",background:"transparent",color:"#666",fontSize:13,cursor:"pointer"}}>← Back</button></div>
      </div>}
    </div>
  );
}

/* ── RESULT PAGE WITH COMPARISON SLIDER ── */
function ResultPage({ image, resultImage, imageName, mode, plan, reset, setPage }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos(Math.round((x / rect.width) * 100));
  }, []);

  useEffect(() => {
    const onUp = () => { isDragging.current = false; };
    const onMove = (e) => handleMove(e.clientX ?? e.touches?.[0]?.clientX);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchmove", onMove);
    };
  }, [handleMove]);

  const chk = (c) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;

  const displayResult = resultImage || image;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"44px 24px 80px",maxWidth:660,margin:"0 auto",animation:"fu 0.4s ease"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:100,background:"rgba(0,184,148,0.08)",border:"1px solid rgba(0,184,148,0.2)",marginBottom:18}}>
        {chk("#00B894")}<span style={{fontSize:12,color:"#00B894",fontWeight:500}}>Done</span>
      </div>
      <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:600,color:"#fff",margin:"0 0 6px",textAlign:"center"}}>{mode==="both"?"Background removed & upscaled":"Image upscaled"}</h2>
      <p style={{color:"#8888a0",fontSize:13,margin:"0 0 24px"}}>{imageName}</p>

      <div
        ref={containerRef}
        onMouseDown={() => { isDragging.current = true; }}
        onTouchStart={() => { isDragging.current = true; }}
        style={{
          width:"100%",borderRadius:14,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",
          position:"relative",cursor:"ew-resize",userSelect:"none",background:"#111114",minHeight:260
        }}
      >
        <img src={image} alt="Before" style={{width:"100%",display:"block",maxHeight:420,objectFit:"contain"}}/>

<div style={{
          position:"absolute",inset:0,
          clipPath:`inset(0 ${100 - sliderPos}% 0 0)`,
          background: "repeating-conic-gradient(#ffffff 0% 25%, #e0e0e0 0% 50%) 0 0/20px 20px"
        }}>
          <img src={displayResult} alt="After" style={{
            width:"100%",display:"block",maxHeight:420,objectFit:"contain"
          }}/>
        </div>

        <div style={{
          position:"absolute",top:0,bottom:0,left:`${sliderPos}%`,width:3,
          background:"#fff",transform:"translateX(-50%)",zIndex:10,
          boxShadow:"0 0 12px rgba(0,0,0,0.5)"
        }}>
          <div style={{
            position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
            width:40,height:40,borderRadius:"50%",
            background:"linear-gradient(135deg,#6C5CE7,#5A4BD1)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 2px 16px rgba(108,92,231,0.4)",
            border:"2px solid rgba(255,255,255,0.3)"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{marginLeft:-8}}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        <div style={{position:"absolute",bottom:12,left:14,padding:"4px 10px",borderRadius:6,background:"rgba(0,0,0,0.7)",fontSize:11,fontWeight:600,color:"#fff",zIndex:5}}>Before</div>
        <div style={{position:"absolute",bottom:12,right:14,padding:"4px 10px",borderRadius:6,background:"rgba(0,0,0,0.7)",fontSize:11,fontWeight:600,color:"#fff",zIndex:5}}>After</div>
      </div>

      <p style={{color:"#555",fontSize:12,marginTop:10}}>Drag the slider to compare before and after</p>

      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button onClick={() => {
          const a = document.createElement("a");
          a.href = displayResult;
          a.download = `clearupscale-${Date.now()}.png`;
          a.click();
        }} style={{padding:"13px 28px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#6C5CE7,#5A4BD1)",color:"#fff",fontSize:14,fontWeight:600,fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:7}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
        <button onClick={reset} style={{padding:"13px 28px",borderRadius:10,cursor:"pointer",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)",color:"#bbb",fontSize:14,fontWeight:500,fontFamily:"'Outfit',sans-serif"}}>Process another</button>
      </div>

      {plan==="free"&&<div style={{marginTop:36,padding:"18px 24px",borderRadius:12,border:"1px solid rgba(108,92,231,0.15)",background:"rgba(108,92,231,0.04)",textAlign:"center",maxWidth:400}}>
        <p style={{color:"#fff",fontSize:14,fontWeight:500,margin:"0 0 4px",fontFamily:"'Outfit',sans-serif"}}>Want faster & higher resolution?</p>
        <p style={{color:"#8888a0",fontSize:12,margin:"0 0 12px"}}>Up to 10 images at once · 2x faster · Higher resolution</p>
        <button onClick={()=>setPage("pricing")} style={{padding:"8px 20px",borderRadius:8,border:"none",cursor:"pointer",background:"#6C5CE7",color:"#fff",fontSize:12,fontWeight:600,fontFamily:"'Outfit',sans-serif"}}>See plans</button>
      </div>}
    </div>
  );
}
