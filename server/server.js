/* NeuroSole 서버 — 병원 내 서버 컴퓨터 1대용 (Node.js 18+, 외부 패키지 불필요)
 *   실행: node server.js            → http://<서버IP>:8080
 *   데이터: ./data/db.json (자동 생성, 매일 ./data/backup/ 에 백업)
 */
const http=require('http'), fs=require('fs'), path=require('path'), crypto=require('crypto'), os=require('os');
const PORT=+(process.env.PORT||8080), ROOT=__dirname, DATA=path.resolve(process.env.NEUROSOLE_DATA_DIR||path.join(ROOT,'data')), DBF=path.join(DATA,'db.json'), PUB=path.join(ROOT,'public');
const HOSPITAL=process.env.HOSPITAL||'아름본재활의학과병원';
fs.mkdirSync(path.join(DATA,'backup'),{recursive:true});
let db={users:[],tokens:{},kv:{},meta:{},audit:[]};
try{ if(fs.existsSync(DBF)) db=Object.assign(db,JSON.parse(fs.readFileSync(DBF,'utf8'))); }catch(e){ console.error('db.json 읽기 실패, 새로 시작합니다',e.message); }
let saveT=null; function save(){ clearTimeout(saveT); saveT=setTimeout(()=>{ const tmp=DBF+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(db)); fs.renameSync(tmp,DBF); },200); }
function backup(){ try{ if(fs.existsSync(DBF)){ const f=path.join(DATA,'backup','db-'+new Date().toISOString().slice(0,10)+'.json'); if(!fs.existsSync(f)) fs.copyFileSync(DBF,f); } }catch(e){} }
backup(); setInterval(backup,6*3600*1000);
/* 비밀번호 */
function hash(pw,salt){ salt=salt||crypto.randomBytes(16).toString('hex'); return salt+':'+crypto.scryptSync(pw,salt,32).toString('hex'); }
function check(pw,h){ const [salt,v]=(h||'').split(':'); if(!salt||!v) return false; const c=crypto.scryptSync(pw,salt,32).toString('hex'); return crypto.timingSafeEqual(Buffer.from(c),Buffer.from(v)); }
const ROLE_LABEL={neuro_pt:'물리치료사',neuro_ot:'작업치료사',neuro_st:'언어치료사',admin:'치료부장(관리자)'};
function pub(u){ return {id:u.id,name:u.name,role:u.role,roleLabel:u.roleLabel||ROLE_LABEL[u.role]||u.role,hospital:HOSPITAL,dsId:u.dsId||'',approved:!!u.approved,created:u.created}; }
/* 데모 계정 시드 (처음 실행 시) */
const DEMO=process.env.NEUROSOLE_DEMO==='1'||process.argv.includes('--demo');
if(!db.users.length){ (DEMO?[['admin','admin1234','관리자','admin','관리자',''],['pt','pt1234','김철수 치료사님','neuro_pt','신경계 물리치료사(NDT)','ndt1'],['pt2','pt1234','최동현 치료사님','neuro_pt','물리치료사(기구)','ptn1'],['at','at1234','오작업 치료사님','neuro_ot','작업치료사(특수OT·ADL·연하·인지)','ot1'],['lt','lt1234','노언어 치료사님','neuro_st','언어치료사','st1']]:[['admin','admin1234','관리자','admin','관리자','']]).forEach(([id,pw,name,role,roleLabel,dsId])=>db.users.push({id,pw:hash(pw),name,role,roleLabel,dsId,approved:true,created:new Date().toISOString()})); save(); console.log('데모 계정 생성: admin/admin1234, pt/pt1234, pt2/pt1234, at/at1234, lt/lt1234'); }
/* HTTP */
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'};
function send(res,code,obj){ res.writeHead(code,Object.assign({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},CORS)); res.end(JSON.stringify(obj)); }
function appVersion(){ try{ const m=fs.readFileSync(path.join(PUB,'index.html'),'utf8').match(/<meta name="ns-version" content="([^"]+)"/); return m?m[1]:''; }catch(e){ return ''; } }
function body(req){ return new Promise((ok,no)=>{ let b=''; req.on('data',c=>{ b+=c; if(b.length>50e6){ no(new Error('too large')); req.destroy(); } }); req.on('end',()=>{ try{ ok(b?JSON.parse(b):{}); }catch(e){ no(e); } }); }); }
const clinical=require('./clinical').createClinicalHandler({db,send,save,body});
const learning=require('./learning').createLearningHandler({db,send,save,body});
function auth(req,url){ const h=req.headers['authorization']||''; const t=h.startsWith('Bearer ')?h.slice(7):(url.searchParams.get('token')||''); const uid=db.tokens[t]; if(!uid) return null; const u=db.users.find(x=>x.id===uid); return u&&u.approved?u:null; }
const server=http.createServer(async(req,res)=>{ const url=new URL(req.url,'http://x'); const p=url.pathname;
  if(req.method==='OPTIONS'){ res.writeHead(204,CORS); return res.end(); }
  try{
    if(p.startsWith('/api/')){
      if(p==='/api/health') return send(res,200,{neurosole:true,name:HOSPITAL,version:appVersion(),port:PORT,ips:Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==='IPv4'&&!i.internal).map(i=>i.address),users:db.users.length,mode:db.kv['ops:mode']||'demo',roster:(db.kv['deptsched:therapists']||[]).map(t=>({id:t.id,name:t.name,type:t.type,mode:t.mode||''})),demoAccounts:DEMO,time:new Date().toISOString()});
      if(p==='/api/register'&&req.method==='POST'){ const b=await body(req); const id=String(b.id||'').trim().toLowerCase(); if(!/^[a-z0-9_.-]{2,30}$/.test(id)) return send(res,400,{error:'아이디는 영문·숫자 2~30자'}); if(String(b.pw||'').length<6) return send(res,400,{error:'비밀번호 6자 이상'}); if(db.users.find(x=>x.id===id)) return send(res,400,{error:'exists'}); const role=ROLE_LABEL[b.role]?b.role:'neuro_pt'; const first=db.users.length===0; const u={id,pw:hash(String(b.pw)),name:String(b.name||id).slice(0,40),role:first?'admin':role,roleLabel:ROLE_LABEL[first?'admin':role],dsId:String(b.dsId||'').slice(0,20),approved:first,created:new Date().toISOString()}; db.users.push(u); save(); return send(res,200,{ok:true,approved:u.approved}); }
      if(p==='/api/login'&&req.method==='POST'){ const b=await body(req); const u=db.users.find(x=>x.id===String(b.id||'').trim().toLowerCase()); if(!u||!check(String(b.pw||''),u.pw)) return send(res,401,{error:'invalid'}); if(!u.approved) return send(res,403,{error:'pending'}); const t=crypto.randomBytes(24).toString('hex'); db.tokens[t]=u.id; const toks=Object.entries(db.tokens).filter(([k,v])=>v===u.id); if(toks.length>20) delete db.tokens[toks[0][0]]; save(); return send(res,200,{token:t,user:pub(u)}); }
      const me=auth(req,url); if(!me) return send(res,401,{error:'unauthorized'});
      if(await clinical(req,res,url,me)) return;
      if(await learning(req,res,url,me)) return;
      if(p==='/api/me') return send(res,200,{user:pub(me)});
      if(p==='/api/logout'){ Object.keys(db.tokens).forEach(k=>{ if(db.tokens[k]===me.id&&(req.headers['authorization']||'').includes(k)) delete db.tokens[k]; }); save(); return send(res,200,{ok:true}); }
      if(p==='/api/kv/all') return send(res,200,{kv:db.kv,now:new Date().toISOString()});
      if(p==='/api/kv/since'){ const ts=url.searchParams.get('ts')||''; const items=Object.entries(db.meta||{}).filter(([k,m])=>!ts||m.ts>ts).map(([k])=>({key:k,val:db.kv[k]===undefined?null:db.kv[k]})); return send(res,200,{items,now:new Date().toISOString()}); }
      if(p==='/api/dataset'){ if(me.role!=='admin') return send(res,403,{error:'admin only'}); const kv=db.kv; const T={patients:[],assessments:[],cog_sessions:[],cog_trials:[],cog_sheets:[],pnotes:[],exec_records:[],schedule:[]};
        const pats=kv['deptsched:patients']||[]; const disc=kv['deptsched:discharged']||[]; const idBySys={};
        pats.concat(disc).forEach(p=>{ idBySys[p.sysId]=p.id; T.patients.push({patient_id:p.id,sys_id:p.sysId||'',name:p.name||'',diag:p.diag||'',onset:p.onset||'',ward:p.wardRoom||'',insurance:p.ins||'',ptype:p.ptype||'',discharged_at:p.dischargedAt||'',rx:{n:p.n,gm:p.gm,eq:p.eq,f:p.f,t:p.t,robot:p.robot,s:p.s,cx:p.cx,d:p.d,v:p.v,a:p.a,pain:p.pain,cog:p.cog,cr:p.cr,speech:p.speech},pas:p.pas||'',vfss_date:p.vfssDate||''}); });
        Object.entries(kv).forEach(([k,v])=>{ if(k.startsWith('patientInfo:')){ const sys=k.slice(12); T.patients.push({patient_id:idBySys[sys]||'',sys_id:sys,name:v.name||'',age:v.age||'',disease:v.disease||'',scores:v.scores||{},source:'patientInfo'}); }
          else if(k.startsWith('assess:')){ (v||[]).forEach(a=>T.assessments.push(Object.assign({patient_name:k.slice(7)},a))); }
          else if(k.startsWith('cogsess:')){ const sys=k.slice(8); (v||[]).forEach(s2=>{ T.cog_sessions.push({sys_id:sys,patient_id:idBySys[sys]||'',session_id:s2.id,task:s2.task,name:s2.name,domain:s2.dom,level:s2.level,start:s2.start,end:s2.end,n:s2.n,correct:s2.ok,accuracy:s2.acc,avg_rt_ms:s2.avgRt,errors:s2.errors,extra:s2.extra,level_change:s2.levelChange,partial:!!s2.partial,memo:s2.memo||'',therapist:s2.by||''}); (s2.trials||[]).forEach(t=>T.cog_trials.push(Object.assign({sys_id:sys,session_id:s2.id,task:s2.task,level:s2.level},t))); }); }
          else if(k.startsWith('cogsheet:')){ const sys=k.slice(9); (v||[]).forEach(sh=>T.cog_sheets.push(Object.assign({sys_id:sys,patient_id:idBySys[sys]||''},sh))); }
          else if(k.startsWith('pnfix:')){ const m=k.match(/^pnfix:([^:]+):tx:([^:]+)(?::(\d+))?$/); if(m&&v) T.pnotes.push({sys_id:m[1],patient_id:idBySys[m[1]]||'',type:m[2],occurrence:+(m[3]||0),fixed_from:v.start,items:v.items||[],manual:!!v.manualCount}); }
          else if(k.startsWith('exec:')){ const sys=k.slice(5); Object.entries(v||{}).forEach(([key,r])=>T.exec_records.push(Object.assign({sys_id:sys,patient_id:idBySys[sys]||'',session_key:key},r))); }
          else if(k.startsWith('deptsched:board:')){ const date=k.slice(16); (v||[]).forEach(b=>T.schedule.push({date,patient_id:b.patientId,type:b.type,therapist_id:b.therapistId,slot:b.slot,pinned:!!b.pinned,one_to_one:!!b.oneToOne,cr_mode:b.crMode||''})); } });
        return send(res,200,{exported:new Date().toISOString(),hospital:HOSPITAL,counts:Object.fromEntries(Object.entries(T).map(([k,v])=>[k,v.length])),tables:T,pn_learn:kv['pnlearn:v1']||[]}); }
      if(p==='/api/export'){ if(me.role!=='admin') return send(res,403,{error:'admin only'}); return send(res,200,{exported:new Date().toISOString(),hospital:HOSPITAL,users:db.users.map(pub),kv:db.kv,meta:db.meta,audit:(db.audit||[]).slice(-2000)}); }
      if(p==='/api/kv'&&req.method==='POST'){ const b=await body(req); const items=Array.isArray(b.items)?b.items:[{key:b.key,val:b.val}]; if(items.some(it=>it.key==='cogprotocol:v56'||it.key==='learningconfig:v56'||it.key==='learningcandidate:v56'||/^(sessionnotes:v56:|forecast:v56:|assessid:v56:)/.test(String(it.key||'')))) return send(res,403,{error:'이 기록은 전용 API에서 권한·세션을 검증한 뒤 저장해야 합니다.'}); const now=new Date().toISOString(); db.meta=db.meta||{}; db.audit=db.audit||[]; items.forEach(it=>{ if(typeof it.key==='string'&&it.key.length<200){ if(it.val===null||it.val===undefined) delete db.kv[it.key]; else db.kv[it.key]=it.val; db.meta[it.key]={ts:now,by:me.id,v:((db.meta[it.key]||{}).v||0)+1}; if(/^(cogsess|cogsheet|assess|patientInfo|deptsched:board|exec):/.test(it.key)||it.key.startsWith('deptsched:board')) db.audit.push({ts:now,by:me.id,key:it.key}); } }); if(db.audit.length>5000) db.audit.splice(0,db.audit.length-5000); db.kvUpdated=now; save(); return send(res,200,{ok:true,n:items.length}); }
      if(p.startsWith('/api/kv/')&&req.method==='GET'){ const k=decodeURIComponent(p.slice(8)); return send(res,200,{key:k,val:db.kv[k]===undefined?null:db.kv[k]}); }
      if(me.role!=='admin') return send(res,403,{error:'admin only'});
      if(p==='/api/users'&&req.method==='GET') return send(res,200,{users:db.users.map(pub)});
      if(p==='/api/update'&&req.method==='POST'){ const b=await body(req); const html=String(b.html||''); const m=html.match(/<meta name="ns-version" content="([^"]+)"/); if(!m||!/NeuroSole/.test(html)||html.length<100000) return send(res,400,{error:'NeuroSole 앱 파일이 아닙니다'}); const bdir=path.join(PUB,'backup'); fs.mkdirSync(bdir,{recursive:true}); const cur=path.join(PUB,'index.html'); let backup=''; if(fs.existsSync(cur)){ backup='index-'+(appVersion()||'old')+'-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.html'; fs.copyFileSync(cur,path.join(bdir,backup)); } fs.writeFileSync(cur+'.tmp',html); fs.renameSync(cur+'.tmp',cur); db.audit=db.audit||[]; db.audit.push({ts:new Date().toISOString(),by:me.id,key:'app:update:'+m[1]}); save(); console.log('앱 업데이트 →',m[1],'by',me.id); return send(res,200,{ok:true,version:m[1],backup}); }
      if(p==='/api/update/backups'){ const bdir=path.join(PUB,'backup'); const list=fs.existsSync(bdir)?fs.readdirSync(bdir).filter(f=>f.endsWith('.html')).sort().reverse().map(f=>({name:f,size:fs.statSync(path.join(bdir,f)).size})):[]; return send(res,200,{backups:list}); }
      if(p==='/api/update/rollback'&&req.method==='POST'){ const b=await body(req); const name=path.basename(String(b.name||'')); const f=path.join(PUB,'backup',name); if(!name.endsWith('.html')||!fs.existsSync(f)) return send(res,404,{error:'백업 없음'}); const cur=path.join(PUB,'index.html'); const keep='index-'+(appVersion()||'cur')+'-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.html'; fs.copyFileSync(cur,path.join(PUB,'backup',keep)); fs.copyFileSync(f,cur); return send(res,200,{ok:true,version:appVersion()}); }
      const m=p.match(/^\/api\/users\/([^/]+)$/); if(m){ const u=db.users.find(x=>x.id===decodeURIComponent(m[1])); if(!u) return send(res,404,{error:'not found'});
        if(req.method==='PATCH'){ const b=await body(req); if(b.role&&ROLE_LABEL[b.role]){ u.role=b.role; u.roleLabel=ROLE_LABEL[b.role]; } if(b.dsId!==undefined) u.dsId=String(b.dsId).slice(0,20); if(b.name) u.name=String(b.name).slice(0,40); if(b.approved!==undefined) u.approved=!!b.approved; if(b.pw&&String(b.pw).length>=6) u.pw=hash(String(b.pw)); save(); return send(res,200,{user:pub(u)}); }
        if(req.method==='DELETE'){ if(u.id===me.id) return send(res,400,{error:'자기 계정은 삭제할 수 없습니다'}); db.users=db.users.filter(x=>x!==u); Object.keys(db.tokens).forEach(k=>{ if(db.tokens[k]===u.id) delete db.tokens[k]; }); save(); return send(res,200,{ok:true}); } }
      return send(res,404,{error:'not found'}); }
    /* 정적 파일 */
    let f=p==='/'?'/index.html':decodeURIComponent(p); f=path.normalize(path.join(PUB,f)); if(!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
    if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end('not found'); }
    res.writeHead(200,Object.assign({'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'},CORS)); fs.createReadStream(f).pipe(res);
  }catch(e){ console.error(e); send(res,500,{error:e.message}); } });
server.listen(PORT,'0.0.0.0',()=>{ const ips=Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==='IPv4'&&!i.internal).map(i=>i.address); console.log(`\nNeuroSole 서버 실행 중 (${HOSPITAL})\n  이 컴퓨터:   http://localhost:${PORT}\n  태블릿/PC:   ${ips.map(ip=>'http://'+ip+':'+PORT).join('  ')||'(네트워크 IP를 찾지 못했습니다)'}\n  데이터 파일: ${DBF}\n  종료: Ctrl+C\n`); });
