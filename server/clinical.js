'use strict';
// New records deliberately use separate, versioned keys; V55 data remains untouched.
const PROTOCOL_KEY='cogprotocol:v56';
const TASKS=new Set(Array.from({length:14},(_,i)=>'T'+String(i+1).padStart(2,'0')));
const METHODS=new Set(['errorless','external-aid','metacognitive','graded-attention','functional']);
const UNIT=new Set(['회','분','초','m','문항']);
function error(message,status=400){const e=new Error(message);e.status=status;throw e;}
function str(v,max=2000){return String(v==null?'':v).trim().slice(0,max);}
function num(v,min,max){if(v===''||v===null||typeof v==='boolean')error('숫자 값이 필요합니다.');const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)error('숫자 범위를 확인하세요.');return n;}
function dualMetrics(d,minutes){
 if(!d||!d.protocolId)return null;
 const direction=d.direction==='lower'?'lower':'higher';
 const optional=v=>v==null||v===''?null:num(v,0,10000);
 const single=optional(d.motorSingle),dual=optional(d.motorDual),singleN=optional(d.cognitiveSingleN),singleOk=optional(d.cognitiveSingleCorrect),dualN=optional(d.cognitiveDualN),dualOk=optional(d.cognitiveDualCorrect);
 if(singleOk!=null&&(singleN==null||singleOk>singleN)||dualOk!=null&&(dualN==null||dualOk>dualN))error('인지 정답 수는 시도 수를 초과할 수 없습니다.');
 const base=singleN>0&&singleOk!=null?singleOk/singleN:null,combined=dualN>0&&dualOk!=null?dualOk/dualN:null;
 return {protocolId:str(d.protocolId,40),minutes:num(d.minutes,1,minutes),direction,motorSingle:single,motorDual:dual,cognitiveSingleN:singleN,cognitiveSingleCorrect:singleOk,cognitiveDualN:dualN,cognitiveDualCorrect:dualOk,motorDTC:single>0&&dual!=null?Math.round((direction==='lower'?dual-single:single-dual)/single*1000)/10:null,cognitiveDTC:base>0&&combined!=null?Math.round((base-combined)/base*1000)/10:null};
}
function protocol(p){
 if(!p||typeof p!=='object')error('프로토콜 형식을 확인하세요.');
 const id=str(p.id,80),name=str(p.name,100),goal=str(p.goal,2000),target=str(p.target,1000),stop=str(p.stop,1000);
 if(!/^[a-zA-Z0-9_-]+$/.test(id)||!name||!goal||!target||!stop)error('이름, 치료 목표, 적용 대상, 중단 기준이 필요합니다.');
 const steps=(Array.isArray(p.steps)?p.steps:[]).map(s=>{
  const task=str(s.task,30);if(task!=='manual'&&!TASKS.has(task))error('지원하지 않는 과제입니다.');
  const label=str(s.label,300);if(!label)error('훈련 단계 설명이 필요합니다.');
  return {task,label,level:num(s.level||1,1,3),minutes:num(s.minutes,1,60)};
 });
 if(!steps.length||steps.length>10||steps.reduce((a,s)=>a+s.minutes,0)>120)error('단계는 1~10개, 총 시간은 120분 이내로 입력하세요.');
 const published=!!p.published,reviewer=str(p.reviewer,100),evidence=str(p.evidence,3000);
 if(published&&(!reviewer||!evidence))error('배포할 때는 임상 검토자와 근거/병원 지침을 기록하세요.');
 return {id,name,goal,target,stop,steps,published,reviewer,evidence,method:METHODS.has(p.method)?p.method:'functional',frequency:num(p.frequency||3,1,7),weeks:num(p.weeks||4,1,52),progression:str(p.progression,1200),transfer:str(p.transfer,1200)};
}
function noteRecord(n,me,db,sys){
 if(!n||typeof n!=='object')error('기록 형식을 확인하세요.');
 const date=str(n.date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))error('치료 날짜를 확인하세요.');
 const board=db.kv['deptsched:board:'+date]||[];
 const patients=db.kv['deptsched:patients']||[];
 const p=patients.find(p=>String(p.sysId)===sys);if(!p)error('등록된 환자가 아닙니다.',404);
 const s=board.find(s=>String(s.patientId)===String(p.id)&&s.slot===n.slot&&s.type===n.type&&s.therapistId===n.therapistId);
 if(!s)error('해당 날짜에 배정된 세션이 없습니다.',409);
 if(me.role!=='admin'&&s.therapistId!==me.dsId)error('내 담당 세션만 기록할 수 있습니다.',403);
 const items=(Array.isArray(n.items)?n.items:[]).map(it=>{const text=str(it.text,3000);if(!text)error('치료 항목을 입력하세요.');return {text,minutes:it.minutes==null?null:num(it.minutes,0,120),sets:it.sets==null?null:num(it.sets,1,100),reps:it.reps==null?null:num(it.reps,0,10000),unit:UNIT.has(it.unit)?it.unit:'회'};});
 if(items.length>40)error('세션 항목은 최대 40개입니다.');
 const status=['completed','partial','not-done'].includes(n.status)?n.status:null;if(!status)error('시행 상태를 선택하세요.');
 const reason=str(n.reason,500);if(status!=='completed'&&!reason)error('중단 또는 미시행 사유가 필요합니다.');
 if(status!=='not-done'&&!items.length)error('실제 시행한 치료를 하나 이상 선택하세요.');
 const minutes=status==='not-done'?0:num(n.minutes,1,120);
 if(status!=='not-done'&&items.some(it=>(it.minutes||0)>minutes))error('항목 시간이 세션 시간을 초과합니다.');
 const maxMinutes=+(db.kv['deptsched:config']||{}).sessionMin||30;
 if(minutes>maxMinutes)error('실제 시간은 배정된 세션 시간을 초과할 수 없습니다.');
 if(items.reduce((a,it)=>a+(it.minutes||0),0)>minutes)error('항목별 실제 시간의 합계가 세션 시간을 초과합니다.');
 return {schema:'actual-treatment-v56',id:[date,s.slot,s.type,s.therapistId].join('|'),sysId:sys,date,slot:s.slot,type:s.type,therapistId:s.therapistId,items:status==='not-done'?[]:items,status,reason,minutes,level:num(n.level||1,1,5),dualTask:status==='not-done'?null:dualMetrics(n.dualTask,minutes),noteText:str(n.noteText,15000),generatedText:str(n.generatedText,15000),noteStyle:{format:['structured','soap','compact'].includes(n.noteStyle?.format)?n.noteStyle.format:'structured',detail:n.noteStyle?.detail==='short'?'short':'normal'},recommendation:n.recommendation?{modelVersion:str(n.recommendation.modelVersion,100),generatedAt:str(n.recommendation.generatedAt,100),suggestedItemIds:(n.recommendation.suggestedItemIds||[]).slice(0,20)}:null,assistance:str(n.assistance,100),response:str(n.response,2000),plan:str(n.plan,2000),protocol:n.protocol?{id:str(n.protocol.id,80),name:str(n.protocol.name,100),revision:str(n.protocol.revision,100)}:null};
}
function createClinicalHandler({db,send,save,body}){
 function write(key,value,me){const now=new Date().toISOString();db.kv[key]=value;db.meta[key]={ts:now,by:me.id,v:((db.meta[key]||{}).v||0)+1};db.audit.push({ts:now,by:me.id,key});if(db.audit.length>5000)db.audit.splice(0,db.audit.length-5000);save();}
 return async function(req,res,url,me){
  const path=url.pathname;
  if(path!=='/api/cognitive-protocols'&&!path.startsWith('/api/session-notes/'))return false;
  try{
   if(path==='/api/cognitive-protocols'){
    if(req.method==='GET'){const v=db.kv[PROTOCOL_KEY]||{version:1,revision:0,items:[]};send(res,200,v);return true;}
    if(req.method!=='POST'){send(res,405,{error:'method not allowed'});return true;}
    if(me.role!=='admin'){send(res,403,{error:'프로토콜 작성·배포는 관리자만 할 수 있습니다.'});return true;}
    const b=await body(req),cur=db.kv[PROTOCOL_KEY]||{revision:0};
    if(b.revision!==cur.revision)error('다른 관리자가 변경했습니다. 새로 불러온 뒤 다시 저장하세요.',409);
    if(!Array.isArray(b.items)||b.items.length>100)error('프로토콜 목록을 확인하세요.');
    const items=b.items.map(protocol);if(new Set(items.map(p=>p.id)).size!==items.length)error('중복 프로토콜 ID입니다.');
    const result={version:1,revision:cur.revision+1,items,updatedAt:new Date().toISOString(),updatedBy:me.id};write(PROTOCOL_KEY,result,me);send(res,200,result);return true;
   }
   const sys=decodeURIComponent(path.slice('/api/session-notes/'.length));if(!sys||sys.length>100||sys.includes(':'))error('환자 ID 형식을 확인하세요.');
   const key='sessionnotes:v56:'+sys;
   if(req.method==='GET'){send(res,200,{records:db.kv[key]||[]});return true;}
   if(req.method!=='POST'){send(res,405,{error:'method not allowed'});return true;}
   const b=await body(req),rec=noteRecord(b,me,db,sys),all=db.kv[key]||[];
   const i=all.findIndex(x=>x.id===rec.id),old=all[i];
   if(old&&b.revision!==old.revision)error('다른 사용자가 수정했습니다. 기록을 다시 불러오세요.',409);
   rec.revision=(old?old.revision:0)+1;rec.savedAt=new Date().toISOString();rec.by=me.id;rec.byName=me.name;
   // Keep an audit copy of the previous content; never silently erase a clinical note.
   rec.previous=old?{revision:old.revision,savedAt:old.savedAt,by:old.by,items:old.items,status:old.status,minutes:old.minutes,response:old.response,plan:old.plan,reason:old.reason,assistance:old.assistance,protocol:old.protocol,noteText:old.noteText,generatedText:old.generatedText,noteStyle:old.noteStyle,dualTask:old.dualTask,level:old.level}:null;
   rec.history=old?[...(old.history||[]),rec.previous]:[];
   if(i>=0)all[i]=rec;else all.push(rec);write(key,all,me);send(res,200,{record:rec});return true;
  }catch(e){send(res,e.status||500,{error:e.message});return true;}
 };
}
module.exports={createClinicalHandler,protocol,noteRecord,dualMetrics,PROTOCOL_KEY};
