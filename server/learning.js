'use strict';
const crypto=require('crypto');
const KEY='learningconfig:v56';
const DEFAULT={revision:0,models:{abi:{cohort:'abi',version:'manual-1',enabled:false,intercept:0,motor:0,dual:0,tablet:0,reviewer:'',method:'manual'},dementia:{cohort:'dementia',version:'manual-1',enabled:false,intercept:0,motor:0,dual:0,tablet:0,reviewer:'',method:'manual'}},updatedAt:null};
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function bounded(v,min,max){if(v===''||v===null||typeof v==='boolean')fail('숫자를 입력하세요.');const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)fail(`숫자는 ${min}~${max} 범위입니다.`);return n;}
function text(v,n=1000){return String(v==null?'':v).trim().slice(0,n);}
function isoDate(v){const d=new Date(v+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)fail('유효한 날짜가 필요합니다.');return v;}
function clinicalToday(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,10);}
function addMonth(date){const [y,m,d]=date.split('-').map(Number);const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return new Date(Date.UTC(y,m,Math.min(d,last))).toISOString().slice(0,10);}
function sha(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');}
function prediction(model,baseline,plan){const parts={baseline,intercept:model.intercept,motor:model.motor*plan.motorMinutes/60,dual:model.dual*plan.dualMinutes/60,tablet:model.tablet*plan.tabletMinutes/60};const raw=Object.values(parts).reduce((a,b)=>a+b,0);return {score:Math.round(Math.max(0,Math.min(30,raw))*10)/10,rawScore:Math.round(raw*100)/100,parts};}
function metrics(pairs,key='predicted'){if(!pairs.length)return {n:0,mae:null,rmse:null,bias:null};const errors=pairs.map(p=>p[key]-p.actual);return {n:pairs.length,mae:Math.round(errors.reduce((a,e)=>a+Math.abs(e),0)/errors.length*100)/100,rmse:Math.round(Math.sqrt(errors.reduce((a,e)=>a+e*e,0)/errors.length)*100)/100,bias:Math.round(errors.reduce((a,e)=>a+e,0)/errors.length*100)/100};}
function matchedPairs(db){const result=[];for(const [key,forecasts] of Object.entries(db.kv)){
 if(!key.startsWith('forecast:v56:'))continue;const sys=key.slice('forecast:v56:'.length),assessments=db.kv['assessid:v56:'+sys]||[];
 const used=new Set();for(const f of forecasts.slice().sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){const candidates=assessments.filter(a=>!used.has(a.id)&&a.standard&&a.status==='complete'&&Number.isFinite(a.total)&&a.instrument===f.instrument&&a.version===f.instrumentVersion&&a.cohort===f.cohort&&a.date.slice(0,10)>f.baseline.date.slice(0,10)&&new Date(a.date).getTime()>new Date(f.createdAt).getTime()&&Math.abs(new Date(a.date.slice(0,10)+'T00:00:00Z')-new Date(f.targetDate+'T00:00:00Z'))<=7*86400000).sort((a,b)=>Math.abs(new Date(a.date)-new Date(f.targetDate))-Math.abs(new Date(b.date)-new Date(f.targetDate)));
  const a=candidates[0];if(a){used.add(a.id);result.push({id:f.id,sysId:sys,cohort:f.cohort,instrument:f.instrument,instrumentVersion:f.instrumentVersion,modelVersion:f.model.version,createdAt:f.createdAt,targetDate:f.targetDate,baseline:f.baseline.total,plan:f.plan,predicted:f.predicted,actual:a.total,error:Math.round((f.predicted-a.total)*10)/10,actualDate:a.date,assessmentId:a.id});}
 }
 }return result;}
function styleFor(db,userId){const notes=Object.values(db.kv).flatMap(v=>Array.isArray(v)?v:[]).filter(n=>n&&n.schema==='actual-treatment-v56'&&n.by===userId);const formats={},details={};let edits=0;for(const n of notes){const s=n.noteStyle||{format:'structured',detail:'normal'};formats[s.format]=(formats[s.format]||0)+1;details[s.detail]=(details[s.detail]||0)+1;if(n.noteText&&n.noteText!==n.generatedText)edits++;}const top=(m,def)=>Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]||def;return {n:notes.length,edits,format:top(formats,'structured'),detail:top(details,'normal'),method:'explicit-feedback-frequency-v1',confidence:notes.length>=3?'선택 이력 기반':'초기 설정'};}
function recommendations(db,me,sys,type,level){const own=[];for(const [k,rows] of Object.entries(db.kv)){if(k.startsWith('sessionnotes:v56:'))for(const n of rows||[]){if(n.by===me.id&&n.type===type&&n.level===level&&n.status!=='not-done')own.push(n);}}
 const counts=new Map();for(const n of own)for(const it of n.items){const c=counts.get(it.text)||{text:it.text,n:0,samePatient:0,last:n.date};c.n++;if(n.sysId===sys)c.samePatient++;c.last=c.last>n.date?c.last:n.date;counts.set(it.text,c);}
 return {modelVersion:'therapist-level-frequency-v1',level,sampleCount:own.length,items:[...counts.values()].sort((a,b)=>(b.n+b.samePatient*2)-(a.n+a.samePatient*2)||b.last.localeCompare(a.last)).slice(0,10),style:styleFor(db,me.id)};
}
function trainCandidate(pairs,model,instrument,version){
 const matching=pairs.filter(p=>p.cohort===model.cohort&&p.instrument===instrument&&p.instrumentVersion===version);const patients=[...new Set(matching.map(p=>p.sysId))].sort();
 if(matching.length<20||patients.length<6)fail('후보 학습에는 같은 환자군·검사판의 대조 20건 이상, 서로 다른 환자 6명 이상이 필요합니다. 지금은 수동 조절과 데이터 수집을 진행하세요.');
 // Whole patients are held out. Forecast input is frozen planned exposure, never realized future dose.
 const hold=new Set(patients.slice(-Math.max(2,Math.ceil(patients.length*.25))));const train=matching.filter(p=>!hold.has(p.sysId)),validation=matching.filter(p=>hold.has(p.sysId));
 if(train.length<12||validation.length<4)fail('환자 단위 검증 분할에 충분한 기록이 없습니다.');
 const units=p=>[1,p.plan.motorMinutes/600,p.plan.dualMinutes/600,p.plan.tabletMinutes/600];let weights=[0,0,0,0];
 for(let epoch=0;epoch<400;epoch++){const grad=weights.map(()=>0);for(const p of train){const x=units(p),pred=p.baseline+x.reduce((a,v,i)=>a+v*weights[i],0),err=pred-p.actual;x.forEach((v,i)=>grad[i]+=err*v/train.length);}weights=weights.map((w,i)=>Math.max(-10,Math.min(10,w-.01*(grad[i]+.1*w))));}
 const candidate={...model,version:'candidate-'+sha(matching.map(p=>p.id)).slice(0,10),intercept:weights[0],motor:weights[1]/10,dual:weights[2]/10,tablet:weights[3]/10,method:'ridge-shadow-v1',enabled:false,reviewer:'',instrument,instrumentVersion:version};
 const scored=validation.map(p=>({...p,candidate:prediction(candidate,p.baseline,p.plan).score}));return {model:candidate,nTrain:train.length,nValidation:validation.length,trainPatients:patients.length-hold.size,validationPatients:hold.size,baseline:metrics(validation),candidate:metrics(scored,'candidate'),split:'patient-held-out',trainingRecordIds:train.map(p=>p.id),validationRecordIds:validation.map(p=>p.id),status:'candidate-only-not-activated',createdAt:new Date().toISOString()};
}
function exportConfig(config,anon){return {...config,by:config.by?anon(config.by):undefined,models:Object.fromEntries(Object.entries(config.models).map(([key,model])=>[key,{...model,reviewer:model.reviewer?anon(model.reviewer):''}]))};}
function createLearningHandler({db,send,save,body}){
 function write(key,val,me){const ts=new Date().toISOString();db.kv[key]=val;db.meta[key]={ts,by:me.id,v:(db.meta[key]?.v||0)+1};db.audit.push({ts,by:me.id,key});if(db.audit.length>5000)db.audit.splice(0,db.audit.length-5000);save();}
 return async(req,res,url,me)=>{
  const p=url.pathname;if(!p.startsWith('/api/pipeline')&&!p.startsWith('/api/forecast/')&&!p.startsWith('/api/recommendations/')&&!p.startsWith('/api/standard-assessments/')&&!p.startsWith('/api/observations/'))return false;
  try{
   if(p.startsWith('/api/recommendations/')&&req.method==='GET'){const sys=decodeURIComponent(p.slice('/api/recommendations/'.length));send(res,200,recommendations(db,me,sys,url.searchParams.get('type')||'N',+url.searchParams.get('level')||1));return true;}
   if(p.startsWith('/api/observations/')&&req.method==='POST'){
    const sys=decodeURIComponent(p.slice('/api/observations/'.length));if(!sys||sys.length>100||sys.includes(':'))fail('환자 ID를 확인하세요.');const b=await body(req);if(b.type!=='VCS'||b.version!==3||b.standard!==false)fail('내부 관찰 기록 형식을 확인하세요.');
    const core=['mem','flanker','dccs','corsi','star'],available=core.filter(k=>Number.isFinite(b.sub?.[k]));for(const k of available)bounded(b.sub[k],0,6);const total=available.length===5?available.reduce((a,k)=>a+b.sub[k],0):null;
    if(b.total!==total||b.nAvail!==available.length||b.prorated)fail('부분 시행은 비례 환산할 수 없습니다.');
    const record={...b,patientId:sys,by:me.id,createdAt:new Date().toISOString()},all=db.kv['assessid:v56:'+sys]||[],i=all.findIndex(a=>a.id===record.id);if(i>=0)all[i]=record;else all.push(record);write('assessid:v56:'+sys,all,me);
    const patient=(db.kv['deptsched:patients']||[]).find(p=>p.sysId===sys);if(patient){const key='assess:'+patient.name.trim(),hist=db.kv[key]||[],j=hist.findIndex(a=>a.id===record.id);if(j>=0)hist[j]=record;else hist.push(record);write(key,hist,me);}send(res,200,{record});return true;
   }
   if(p.startsWith('/api/standard-assessments/')){
    const sys=decodeURIComponent(p.slice('/api/standard-assessments/'.length));if(!sys||sys.length>100||sys.includes(':'))fail('환자 ID를 확인하세요.');const patient=(db.kv['deptsched:patients']||[]).find(p=>p.sysId===sys);if(!patient)fail('등록 환자가 아닙니다.',404);
    if(req.method==='GET'){send(res,200,{records:db.kv['assessid:v56:'+sys]||[]});return true;}
    if(req.method!=='POST')fail('method not allowed',405);const b=await body(req),date=isoDate(text(b.date,10));if(date>clinicalToday())fail('미래 날짜의 검사 결과를 입력할 수 없습니다.');
    if(!['MMSE','MoCA','OCS'].includes(b.instrument)||!['complete','partial','not-done'].includes(b.status)||!['abi','dementia','other'].includes(b.cohort))fail('검사 도구·시행 상태·환자군을 확인하세요.');
    const version=text(b.version,100);if(!version)fail('검사판을 기록하세요.');let total=null;if(b.status==='complete'&&b.instrument!=='OCS'){total=bounded(b.total,0,30);if(!Number.isInteger(total))fail('총점은 정수입니다.');}
    if(b.instrument==='OCS'&&b.status==='complete'&&!text(b.domains))fail('영역별 결과가 필요합니다.');if(b.status!=='complete'&&!text(b.reason))fail('미시행/부분 시행 사유가 필요합니다.');
    const rec={...b,id:crypto.randomUUID(),patientId:sys,type:b.instrument,standard:true,date:date+'T12:00:00Z',total,version,by:me.id,byName:me.name,createdAt:new Date().toISOString(),app:'V56',cohort:b.cohort};
    const list=db.kv['assessid:v56:'+sys]||[];list.push(rec);write('assessid:v56:'+sys,list,me);const hist=db.kv['assess:'+patient.name.trim()]||[];hist.push(rec);write('assess:'+patient.name.trim(),hist,me);
    const info=db.kv['patientInfo:'+sys];if(info){info.scores=info.scores||{};info.scores.standardCognitive=rec;write('patientInfo:'+sys,info,me);}send(res,200,{record:rec});return true;
   }
   if(p.startsWith('/api/forecast/')){
    const sys=decodeURIComponent(p.slice('/api/forecast/'.length));if(!sys||sys.length>100||sys.includes(':'))fail('환자 ID를 확인하세요.');const key='forecast:v56:'+sys;
    if(req.method==='GET'){send(res,200,{forecasts:db.kv[key]||[],comparisons:matchedPairs(db).filter(x=>x.sysId===sys)});return true;}
    if(req.method!=='POST')fail('method not allowed',405);const b=await body(req),assess=db.kv['assessid:v56:'+sys]||[],today=clinicalToday(),baseline=assess.find(a=>a.id===b.baselineId);
    if(!baseline||!baseline.standard||baseline.status!=='complete'||!Number.isFinite(baseline.total)||!['MMSE','MoCA'].includes(baseline.instrument))fail('전체 시행한 표준 MMSE/MoCA의 공식 총점이 필요합니다.');
    const baseDate=baseline.date.slice(0,10);if(baseDate>today||new Date(today)-new Date(baseDate)>7*86400000)fail('7일 이내의 표준 기준검사를 등록한 뒤 예측을 만드세요.');
    const config=db.kv[KEY]||DEFAULT,model=config.models[baseline.cohort];if(!model?.enabled)fail('해당 환자군의 수동 연구 모델이 비활성입니다. 관리자가 검토 후 설정하세요.');if(model.instrument&&model.instrument!==baseline.instrument||model.instrumentVersion&&model.instrumentVersion!==baseline.version)fail('후보 모델의 학습 검사판과 기준 검사판이 다릅니다.');
    const plan={motorMinutes:bounded(b.plan?.motorMinutes,0,10000),dualMinutes:bounded(b.plan?.dualMinutes,0,10000),tabletMinutes:bounded(b.plan?.tabletMinutes,0,10000)};if(plan.dualMinutes>plan.motorMinutes)fail('이중과제 시간은 운동·작업치료 시간에 포함되며 이를 초과할 수 없습니다.');
    const forecastList=db.kv[key]||[],targetDate=addMonth(baseDate);if(forecastList.some(f=>f.baseline.id===baseline.id))fail('이 기준검사에 대한 예측이 이미 고정되어 있습니다. 모델 변경 후에도 기존 예측을 덮어쓰지 않습니다.',409);
    const calc=prediction(model,baseline.total,plan),snapshot={id:crypto.randomUUID(),sysId:sys,cohort:baseline.cohort,instrument:baseline.instrument,instrumentVersion:baseline.version,createdAt:new Date().toISOString(),targetDate,baseline:{id:baseline.id,date:baseline.date,total:baseline.total},model:JSON.parse(JSON.stringify(model)),plan,predicted:calc.score,rawPrediction:calc.rawScore,contributions:calc.parts,status:'research-manual-not-clinically-validated',by:me.id,configRevision:config.revision};snapshot.inputHash=sha({baseline:snapshot.baseline,model:snapshot.model,plan:snapshot.plan});forecastList.push(snapshot);write(key,forecastList,me);send(res,200,{forecast:snapshot});return true;
   }
   if(p==='/api/pipeline'&&req.method==='GET'){
    const pairs=matchedPairs(db),counts={notes:0,standardAssessments:0,forecasts:0,paired:pairs.length};for(const [k,v] of Object.entries(db.kv)){if(k.startsWith('sessionnotes:v56:'))counts.notes+=(v||[]).length;if(k.startsWith('assessid:v56:'))counts.standardAssessments+=(v||[]).filter(x=>x.standard).length;if(k.startsWith('forecast:v56:'))counts.forecasts+=(v||[]).length;}
    send(res,200,{config:db.kv[KEY]||DEFAULT,counts,metrics:{abi:metrics(pairs.filter(p=>p.cohort==='abi')),dementia:metrics(pairs.filter(p=>p.cohort==='dementia'))},style:styleFor(db,me.id),pairs:me.role==='admin'?pairs:[],candidate:me.role==='admin'?db.kv['learningcandidate:v56']||null:null});return true;
   }
   if(me.role!=='admin')fail('관리자만 모델 설정·학습·내보내기를 할 수 있습니다.',403);
   if(p==='/api/pipeline/model'&&req.method==='POST'){
    const b=await body(req),cur=db.kv[KEY]||DEFAULT;if(b.revision!==cur.revision)fail('모델 설정이 변경됐습니다. 다시 불러오세요.',409);if(!['abi','dementia'].includes(b.cohort))fail('환자군을 확인하세요.');const model={cohort:b.cohort,version:'manual-'+(cur.revision+1),intercept:bounded(b.intercept,-10,10),motor:bounded(b.motor,-5,5),dual:bounded(b.dual,-5,5),tablet:bounded(b.tablet,-5,5),enabled:!!b.enabled,reviewer:text(b.reviewer,100),method:'manual',instrument:['MMSE','MoCA'].includes(b.instrument)?b.instrument:'MMSE',instrumentVersion:text(b.instrumentVersion,100)};if(model.enabled&&(!model.reviewer||!model.instrumentVersion))fail('연구 모델 검토자와 적용할 정확한 검사판을 기록하세요.');const config={revision:cur.revision+1,models:{...cur.models,[b.cohort]:model},updatedAt:new Date().toISOString(),by:me.id};write(KEY,config,me);send(res,200,config);return true;
   }
   if(p==='/api/pipeline/candidate'&&req.method==='POST'){
    const b=await body(req),config=db.kv[KEY]||DEFAULT,model=config.models[b.cohort];if(!model)fail('환자군을 확인하세요.');const candidate=trainCandidate(matchedPairs(db),model,b.instrument,text(b.instrumentVersion,100));write('learningcandidate:v56',candidate,me);send(res,200,candidate);return true;
   }
   if(p==='/api/pipeline/activate'&&req.method==='POST'){
    const b=await body(req),candidate=db.kv['learningcandidate:v56'],cur=db.kv[KEY]||DEFAULT;if(b.revision!==cur.revision)fail('설정 개정이 바뀌었습니다.',409);if(!candidate||b.version!==candidate.model.version||!text(b.reviewer,100))fail('검토한 후보와 검토자를 선택하세요.');const model={...candidate.model,reviewer:text(b.reviewer,100),enabled:true,activatedAt:new Date().toISOString()},config={...cur,revision:cur.revision+1,models:{...cur.models,[model.cohort]:model},updatedAt:new Date().toISOString(),by:me.id};write(KEY,config,me);send(res,200,config);return true;
   }
   if(p==='/api/pipeline/export'&&req.method==='GET'){
    if(!db.kv['pipeline:salt:v56'])write('pipeline:salt:v56',crypto.randomBytes(24).toString('hex'),me);const anon=id=>sha(db.kv['pipeline:salt:v56']+'|'+id).slice(0,20),notes=[],assessments=[],forecasts=[];
    for(const [k,rows] of Object.entries(db.kv)){if(k.startsWith('sessionnotes:v56:'))for(const r of rows||[])notes.push({patient_id:anon(r.sysId),therapist_id:anon(r.by),session_id:sha(r.sysId+'|'+r.id),date:r.date,type:r.type,level:r.level,status:r.status,minutes:r.minutes,dualTask:r.dualTask||null,items:r.items.map(it=>({task_id:sha(it.text),sets:it.sets,reps:it.reps,unit:it.unit,minutes:it.minutes})),note_style:r.noteStyle,edited:!!r.noteText&&r.noteText!==r.generatedText,revision:r.revision,protocol:r.protocol?{id:r.protocol.id,revision:r.protocol.revision}:null});
     if(k.startsWith('assessid:v56:'))for(const a of rows||[])assessments.push({patient_id:anon(a.patientId),id:a.id,instrument:a.instrument||a.type,version:a.version,date:a.date,status:a.status,standard:!!a.standard,cohort:a.cohort,total:a.total,nAvail:a.nAvail,proxy:!!a.proxy});
     if(k.startsWith('forecast:v56:'))for(const f of rows||[]){const {sysId,by,...rest}=f;forecasts.push({...rest,model:{...rest.model,reviewer:rest.model.reviewer?anon(rest.model.reviewer):''},patient_id:anon(sysId),therapist_id:anon(by)});}}
    send(res,200,{schema:'neurosole-longitudinal-v56',exportedAt:new Date().toISOString(),freeTextIncluded:false,notes,assessments,forecasts,comparisons:matchedPairs(db).map(({sysId,...p})=>({...p,patient_id:anon(sysId)})),config:exportConfig(db.kv[KEY]||DEFAULT,anon)});return true;
   }
   fail('not found',404);
  }catch(e){send(res,e.status||500,{error:e.message});return true;}
 };
}
module.exports={createLearningHandler,prediction,matchedPairs,metrics,trainCandidate,styleFor,recommendations,addMonth,clinicalToday,isoDate,exportConfig,DEFAULT,KEY};
