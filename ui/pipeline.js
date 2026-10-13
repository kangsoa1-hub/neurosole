/* Manual-first learning pipeline. This file is embedded after refinement.js. */
(()=>{
'use strict';
const N=NS56,$=id=>document.getElementById(id),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),isAdmin=()=>currentUser?.role==='admin';
const basicSummary=N.noteSummary;
N.formatNote=(record,style)=>{
 const r={...record,byName:record.byName||currentUser?.name||''},s=style||{format:'structured',detail:'normal'};
 if(s.format==='soap'){
  const facts=[`${r.date} ${DS_SLOT_LABEL[r.slot]||r.slot} · ${TX_NAME[r.type]||r.type}`];
  if(r.status==='not-done')return facts.join('\n')+'\nO: 미시행 — '+r.reason;
  facts.push(`O: 실제 ${r.minutes}분 · ${r.status==='partial'?'부분 시행':'완료'} · 도움 ${r.assistance||'미입력'} · 난이도 ${r.level||1}`);
  r.items.forEach((it,i)=>facts.push(`${i+1}. ${it.text}${it.sets!=null&&it.reps!=null?` (${it.sets}세트 × ${it.reps}${it.unit||'회'})`:''}${it.minutes!=null?` · ${it.minutes}분`:''}`));
  if(r.dualTask)facts.push(`이중과제 ${r.dualTask.protocolId} · ${r.dualTask.minutes}분${r.dualTask.motorDTC!=null?' · 운동 DTC '+r.dualTask.motorDTC+'%':''}${r.dualTask.cognitiveDTC!=null?' · 인지 DTC '+r.dualTask.cognitiveDTC+'%':''}`);
  if(r.response)facts.push('A: '+r.response);if(r.reason)facts.push('중단 사유: '+r.reason);if(r.plan)facts.push('P: '+r.plan);facts.push('기록: '+r.byName);return facts.join('\n');
 }
 let text=basicSummary(r);if(r.status!=='not-done'){
  text+='\n운영 난이도: '+(r.level||1);
  if(r.dualTask)text+=`\n이중과제: ${r.dualTask.protocolId} · ${r.dualTask.minutes}분${r.dualTask.motorDTC!=null?' · 운동 DTC '+r.dualTask.motorDTC+'%':''}${r.dualTask.cognitiveDTC!=null?' · 인지 DTC '+r.dualTask.cognitiveDTC+'%':''}`;
 }
 if(s.format==='compact')text=text.replace(/\n(\d+\. )/g,'\n$1').replace(/\n반응\/관찰:/g,'\n반응:');return text;
};
N.noteSummary=r=>r?(r.noteText||N.formatNote(r,r.noteStyle)):'';
const originalNoteOpen=N.noteOpen;
N.noteOpen=async(sys,id,key)=>{
 await originalNoteOpen(sys,id,key);const s=N.noteEdit;if(!s||!$('nsNoteModal'))return;
 const row=document.createElement('div');row.className='ns-form-row';row.innerHTML=`<div class="ns-field"><label for="nsNtLevel">운영 난이도 (검사등급 아님)</label><select id="nsNtLevel" onchange="NS56.noteLevelChange()">${[1,2,3,4,5].map(level=>`<option value="${level}" ${level===(s.rec?.level||1)?'selected':''}>${level}단계</option>`).join('')}</select></div><div class="ns-field"><label for="nsNtFormat">내 기록 형식</label><select id="nsNtFormat"><option value="structured">항목형</option><option value="soap">O–A–P (관찰 · 평가 · 계획)</option><option value="compact">간결형</option></select></div>`;
 $('nsNtItemsSection').before(row);
 $('nsNtItemsSection').insertAdjacentHTML('afterbegin','<div id="nsLearnHint" class="ns-notice">계정별 선택 이력을 불러오는 중…</div>');
 const dual=`<details class="ns-proof" id="nsDualSection"><summary>이중과제 운동 · 인지 데이터 기록</summary><div class="ns-notice">운동·작업치료 안에 인지 과제를 함께 시행한 경우 기록합니다. 아래 시간은 전체 세션 시간에 포함됩니다. 단일 과제와 이중과제를 같은 단위·조건으로 측정해야 DTC를 비교할 수 있습니다.</div><div class="ns-form-row"><div class="ns-field ns-wide"><label for="nsNtDual">실제로 병행한 이중과제</label><select id="nsNtDual"><option value="">이중과제 없음</option>${DT_PROTOCOL.filter(d=>DT_META[d.id]?.cls!=='motor-motor').map(d=>`<option value="${d.id}">${E(d.name)}</option>`).join('')}</select></div><div class="ns-field"><label for="nsNtDualMinutes">실제 이중과제 시간(분)</label><input id="nsNtDualMinutes" type="number" min="1" max="30"></div><div class="ns-field"><label for="nsNtDtcDirection">운동 지표 방향</label><select id="nsNtDtcDirection"><option value="higher">속도·횟수·거리 (클수록 좋음)</option><option value="lower">시간 (작을수록 좋음)</option></select></div><div class="ns-field"><label for="nsNtMotorSingle">단일 운동 수행값 (동일 단위)</label><input id="nsNtMotorSingle" type="number" min="0" step="any"></div><div class="ns-field"><label for="nsNtMotorDual">이중과제 운동 수행값</label><input id="nsNtMotorDual" type="number" min="0" step="any"></div><div class="ns-field"><label for="nsNtCogSingleN">인지 단독 시도 수</label><input id="nsNtCogSingleN" type="number" min="0"></div><div class="ns-field"><label for="nsNtCogSingleOk">인지 단독 정답 수</label><input id="nsNtCogSingleOk" type="number" min="0"></div><div class="ns-field"><label for="nsNtCogDualN">이중과제 인지 시도 수</label><input id="nsNtCogDualN" type="number" min="0"></div><div class="ns-field"><label for="nsNtCogDualOk">이중과제 인지 정답 수</label><input id="nsNtCogDualOk" type="number" min="0"></div></div></details>`;
 $('nsNtResponse').closest('.ns-form-row').before(document.createRange().createContextualFragment(dual));
 $('nsNtResponse').closest('.ns-form-row').insertAdjacentHTML('afterend',`<details class="ns-proof"><summary>Progress note 표현 직접 수정 · 학습 피드백</summary><p class="ns-muted">실제 치료 항목·측정값은 위 구조화 기록에 유지됩니다. 수정한 문장과 자동 초안을 계정별 쌍으로 저장해 이후 문체 학습 자료로 활용합니다.</p><button class="btn ghost small" onclick="NS56.noteNarrativeGenerate()">현재 기록으로 초안 생성</button><textarea id="nsNtNarrative" rows="8" style="margin-top:10px;width:100%" placeholder="형식을 직접 다듬을 경우 입력">${E(s.rec?.noteText||'')}</textarea><div class="ns-muted">현재 구현은 선택 이력 기반 기록 형식 학습입니다. 자유 문장 생성용 LLM은 아직 연결하지 않았습니다.</div></details>`);
 $('nsNtMinutes').max=DS_CFG.sessionMin||30;
 $('nsNtFormat').value=s.rec?.noteStyle?.format||'structured';
 if(s.rec?.dualTask){const d=s.rec.dualTask;$('nsNtDual').value=d.protocolId;$('nsNtDualMinutes').value=d.minutes;$('nsNtDtcDirection').value=d.direction;for(const [id,k] of [['nsNtMotorSingle','motorSingle'],['nsNtMotorDual','motorDual'],['nsNtCogSingleN','cognitiveSingleN'],['nsNtCogSingleOk','cognitiveSingleCorrect'],['nsNtCogDualN','cognitiveDualN'],['nsNtCogDualOk','cognitiveDualCorrect']])$(id).value=d[k]??'';}
 await N.noteLevelChange();
};
N.noteLevelChange=async()=>{
 const s=N.noteEdit;if(!s||!$('nsNtLevel'))return;const level=+$('nsNtLevel').value;
 if(!NET.on){$('nsLearnHint').textContent='계정별 추천 학습·월간 모델은 중앙 서버에서 공유합니다. 현재는 이 기기의 수동 기록 모드입니다.';return;}
 try{const r=await N.api('/api/recommendations/'+encodeURIComponent(s.sys)+'?type='+encodeURIComponent(s.b.type)+'&level='+level);if(N.noteEdit!==s)return;
 s.recommendation={modelVersion:r.modelVersion,generatedAt:new Date().toISOString(),suggestedItemIds:r.items.map(item=>item.text)};
 if(!s.rec)$('nsNtFormat').value=r.style.format;
 for(const item of r.items){const existing=s.candidates.find(c=>c.text===item.text);if(existing)existing.source=`내 선택 이력 ${item.n}회 · 같은 난이도`;else s.candidates.unshift({text:item.text,source:`내 선택 이력 ${item.n}회 · 같은 난이도`});}
 const ordered=new Map(r.items.map((item,i)=>[item.text,i]));s.candidates.sort((a,b)=>(ordered.get(a.text)??1000)-(ordered.get(b.text)??1000));N.noteCandidatesDraw();
 $('nsLearnHint').textContent=`내 ID의 ${level}단계 실제 기록 ${r.sampleCount}건 · 기록 형식 ${r.style.format==='soap'?'O–A–P':r.style.format==='compact'?'간결형':'항목형'} · 직접 수정 ${r.style.edits}건. 추천은 선택 이력 기반이며 자동 선택하지 않습니다.`;
 }catch(e){$('nsLearnHint').textContent=e.message;}
};
const originalCollect=N.noteCollect;
N.noteCollect=()=>{
 const r=originalCollect();r.schema='actual-treatment-v56';r.level=+$('nsNtLevel')?.value||1;r.noteStyle={format:$('nsNtFormat')?.value||'structured',detail:'normal'};r.recommendation=N.noteEdit.recommendation||null;
 if(r.minutes>(DS_CFG.sessionMin||30))throw new Error('실제 시간은 배정 세션 시간(보통 30분)을 초과할 수 없습니다.');if(r.items.reduce((a,it)=>a+(it.minutes||0),0)>r.minutes)throw new Error('각 항목 실제 시간의 합계가 세션 시간을 초과합니다.');
 const dualId=$('nsNtDual')?.value;if(dualId&&r.status!=='not-done'){
  const optional=id=>$(id).value===''?null:+$(id).value,d={protocolId:dualId,minutes:+$('nsNtDualMinutes').value,direction:$('nsNtDtcDirection').value,motorSingle:optional('nsNtMotorSingle'),motorDual:optional('nsNtMotorDual'),cognitiveSingleN:optional('nsNtCogSingleN'),cognitiveSingleCorrect:optional('nsNtCogSingleOk'),cognitiveDualN:optional('nsNtCogDualN'),cognitiveDualCorrect:optional('nsNtCogDualOk')};
  if(!d.minutes||d.minutes>r.minutes)throw new Error('이중과제 시간은 세션 시간 안에서 입력하세요.');if(Object.values(d).some(v=>typeof v==='number'&&(!Number.isFinite(v)||v<0)))throw new Error('이중과제 측정값은 0 이상의 수입니다.');if(d.cognitiveSingleCorrect!=null&&(d.cognitiveSingleN==null||d.cognitiveSingleCorrect>d.cognitiveSingleN)||d.cognitiveDualCorrect!=null&&(d.cognitiveDualN==null||d.cognitiveDualCorrect>d.cognitiveDualN))throw new Error('인지 정답 수는 시도 수를 초과할 수 없습니다.');
  d.motorDTC=d.motorSingle>0&&d.motorDual!=null?Math.round((d.direction==='lower'?d.motorDual-d.motorSingle:d.motorSingle-d.motorDual)/d.motorSingle*1000)/10:null;const a=d.cognitiveSingleN>0&&d.cognitiveSingleCorrect!=null?d.cognitiveSingleCorrect/d.cognitiveSingleN:null,b=d.cognitiveDualN>0&&d.cognitiveDualCorrect!=null?d.cognitiveDualCorrect/d.cognitiveDualN:null;d.cognitiveDTC=a>0&&b!=null?Math.round((a-b)/a*1000)/10:null;r.dualTask=d;
 }else r.dualTask=null;
 r.generatedText=N.formatNote(r,r.noteStyle);r.noteText=$('nsNtNarrative')?.value.trim()||r.generatedText;return r;
};
N.noteNarrativeGenerate=()=>{try{const r=N.noteCollect();$('nsNtNarrative').value=r.generatedText;$('nsNoteModal').dataset.dirty='1';}catch(e){$('nsNtError').textContent=e.message;}};
/* Official assessment cohort and atomic server recording feed the monthly pipeline. */
const originalStandardOpen=N.standardAssessment;
N.standardAssessment=()=>{originalStandardOpen();if(!$('nsStandard'))return;const target=$('nsAxType').closest('.ns-form-row'),field=document.createElement('div');field.className='ns-field ns-wide';field.innerHTML='<label for="nsAxCohort">연구 환자군 (별도 모델·검증)</label><select id="nsAxCohort"><option value="abi">뇌졸중 · 후천성 뇌손상</option><option value="dementia">치매 · 인지 저하</option><option value="other">기타 (현재 예측 대상 제외)</option></select>';target.prepend(field);};
const originalPersist=N.assessmentPersist;
N.assessmentPersist=async(info,record)=>{
 if(record.standard)record.cohort=$('nsAxCohort')?.value||'abi';
 if(NET.on){const path=record.standard?'/api/standard-assessments/':'/api/observations/';const {record:saved}=await N.api(path+encodeURIComponent(info.id),'POST',record);Object.assign(record,saved);if(NET.cache){const key='assessid:v56:'+info.id,all=NET.cache[key]||[],i=all.findIndex(r=>r.id===record.id);if(i>=0)all[i]=record;else all.push(record);NET.cache[key]=all;const hk='assess:'+info.name.trim(),hist=NET.cache[hk]||[],j=hist.findIndex(r=>r.id===record.id);if(j>=0)hist[j]=record;else hist.push(record);NET.cache[hk]=hist;}}
 else await originalPersist(info,record);
};
/* Frozen prospective prediction: no future exposure leaks into past forecasts. */
N.forecastPanel=async info=>{
 if(!NET.on)return '<div class="ns-notice">월간 인지 추적은 중앙 서버 연결 후 사용할 수 있습니다.</div>';
 const {forecasts,comparisons}=await N.api('/api/forecast/'+encodeURIComponent(info.id)),all=(await N.api('/api/standard-assessments/'+encodeURIComponent(info.id))).records,baseline=all.filter(a=>a.standard&&a.status==='complete'&&a.total!=null&&['MMSE','MoCA'].includes(a.instrument)).sort((a,b)=>b.date.localeCompare(a.date))[0];N.forecastInfo=info;N.forecastBaseline=baseline;
 return `<section class="card ns-forecast"><div class="ns-section-header"><div><div class="ns-eyebrow">LONGITUDINAL / MONTHLY FOLLOW-UP</div><h3>한 달 인지 추적 · 예측 대조</h3></div><span class="ns-tag amber">연구용 · 임상 미검증</span></div><p class="ns-muted">주 중재는 운동·작업치료 + 이중과제입니다. 태블릿 인지 과제는 추가 시행 시간으로 별도 수집합니다. 예측값과 기준검사·모델·계획 입력은 생성 시 고정됩니다.</p>${baseline?`<div class="ns-tags"><span class="ns-tag teal">${E(baseline.instrument)} ${baseline.total}/30</span><span class="ns-tag">${E(baseline.version)}</span><span class="ns-tag">기준검사 ${E(baseline.date.slice(0,10))}</span></div><details><summary class="ns-proof">다음 한 달 계획 · 연구 예측 생성</summary><div class="ns-form-row"><div class="ns-field"><label for="nsFcMotor">운동·작업 총 계획 시간 (분, 이중과제 포함)</label><input id="nsFcMotor" type="number" min="0" max="10000" value=""></div><div class="ns-field"><label for="nsFcDual">그 중 이중과제 계획 시간 (분)</label><input id="nsFcDual" type="number" min="0" max="10000" value=""></div><div class="ns-field"><label for="nsFcTablet">남는 시간 태블릿 인지 계획 시간 (분)</label><input id="nsFcTablet" type="number" min="0" max="10000" value="0"></div></div><p class="ns-muted">초기에는 관리자가 검토한 수동 계수로 계산합니다. 기여계수 0인 초기 모델은 기준 점수를 유지하는 비교 모델이며 치료 효과를 주장하지 않습니다.</p><button class="btn ghost small" onclick="NS56.forecastCreate()">연구 예측 고정 · 생성</button><div id="nsFcError" class="ns-error" role="alert"></div></details>`:'<div class="ns-empty">7일 이내에 실제 시행한 표준 MMSE/MoCA 결과를 등록하면 월간 추적을 시작할 수 있습니다.</div>'}<div style="overflow:auto;margin-top:14px"><table class="setup"><tr><th>목표 검사일</th><th>기준 → 예측</th><th>실제 점수</th><th>오차(예측−실제)</th><th>고정 모델</th></tr>${forecasts.slice().reverse().map(f=>{const c=comparisons.find(c=>c.id===f.id);return `<tr><td>${E(f.targetDate)}</td><td>${f.baseline.total} → ${f.predicted}</td><td>${c?c.actual:'아직 대조 없음'}</td><td>${c?c.error:'—'}</td><td>${E(f.model.version)}<br><small>${E(f.instrumentVersion)}</small></td></tr>`;}).join('')||'<tr><td colspan="5">고정된 월간 예측 없음</td></tr>'}</table></div><p class="ns-muted">목표일 ±7일의 같은 검사판·환자군·전체 시행 기록으로만 대조합니다. 실제 치료량은 기록에 따로 보존하며 과거 예측 입력을 바꾸지 않습니다.</p></section>`;
};
N.forecastCreate=async()=>{try{if(!$('nsFcMotor').value||$('nsFcDual').value==='')throw new Error('다음 한 달 계획 시간을 입력하세요.');await N.api('/api/forecast/'+encodeURIComponent(N.forecastInfo.id),'POST',{baselineId:N.forecastBaseline.id,plan:{motorMinutes:+$('nsFcMotor').value,dualMinutes:+$('nsFcDual').value,tabletMinutes:+$('nsFcTablet').value}});toast('한 달 예측을 고정했습니다.');await renderCogHome();}catch(e){$('nsFcError').textContent=e.message;}};
const originalCogHome=renderCogHome;
renderCogHome=async()=>{await originalCogHome();if(currentPatientInfo&&window._cogView.tab==='today'&&$('cogHome')&&!$('cogHome').querySelector('.ns-forecast')){try{$('cogHome').insertAdjacentHTML('beforeend',await N.forecastPanel(currentPatientInfo));}catch(e){$('cogHome').insertAdjacentHTML('beforeend',`<p class="ns-error">${E(e.message)}</p>`);}}};
/* Administrator sees counts, calibration and explicit candidate activation. */
N.pipelineCard=async()=>{
 const card=$('nsPipelineCard');if(!card||!isAdmin())return;if(!NET.on){card.innerHTML='<h3>학습 · 데이터 파이프라인</h3><p class="ns-muted">중앙 서버로 연결하면 여러 태블릿의 결과를 합쳐 관리할 수 있습니다.</p>';return;}
 try{const data=await N.api('/api/pipeline');N.pipelineData=data;const counts=data.counts;
 card.innerHTML=`<div class="ns-section-header"><div><div class="ns-eyebrow">LEARNING / MANUAL-FIRST PIPELINE</div><h3>학습 · 월간 검증 파이프라인</h3></div><button class="btn ghost small" onclick="NS56.pipelineExport()">가명 데이터 내보내기</button></div><div class="ns-tags"><span class="ns-tag">실제 치료 ${counts.notes}건</span><span class="ns-tag">표준 검사 ${counts.standardAssessments}건</span><span class="ns-tag">고정 예측 ${counts.forecasts}건</span><span class="ns-tag teal">월간 대조 ${counts.paired}건</span></div><p class="ns-muted">치료 선택·난이도·실제 시행량·이중과제·환자 반응 → 기준 검사 → 월간 예측 고정 → 실제 검사 대조 → 수동 계수 변경/후보 학습. 후보 모델은 운영 모델을 자동 교체하지 않습니다.</p><div class="ns-form-row"><div class="ns-field"><label for="nsModelCohort">환자군</label><select id="nsModelCohort" onchange="NS56.modelFieldsFill()"><option value="abi">후천성 뇌손상</option><option value="dementia">치매 · 인지 저하 (별도 모델)</option></select></div><div class="ns-field"><label for="nsModelEnabled">수동 연구 모델</label><select id="nsModelEnabled"><option value="0">비활성 · 데이터 수집</option><option value="1">연구 예측 사용</option></select></div><div class="ns-field"><label for="nsModelInstrument">적용 도구</label><select id="nsModelInstrument"><option>MMSE</option><option>MoCA</option></select></div><div class="ns-field"><label for="nsModelInstrumentVersion">정확한 검사판</label><input id="nsModelInstrumentVersion" placeholder="기준검사에 기록한 판본과 정확히 일치"></div>${[['Intercept','기본 변화(점수)'],['Motor','운동·작업 1시간당 추가 변화'],['Dual','이중과제 1시간당 추가 변화'],['Tablet','태블릿 1시간당 추가 변화']].map(([key,label])=>`<div class="ns-field"><label for="nsModel${key}">${label}</label><input id="nsModel${key}" type="number" step="0.001" min="-10" max="10" value="0"></div>`).join('')}<div class="ns-field ns-wide"><label for="nsModelReviewer">모델 검토자</label><input id="nsModelReviewer" placeholder="계수·검사판·적용 범위 검토자"></div></div><div class="ns-notice">예측 = 기준점수 + 기본변화 + 운동시간×계수 + 이중과제시간×추가계수 + 태블릿시간×계수. 범위 0~30. 임상 효과·치매 진행 예방을 검증한 모델이 아닙니다. 뇌손상과 치매 자료 및 검사판을 섞어 학습하지 않습니다.</div><div class="rowbtns"><button class="btn small" onclick="NS56.modelSave()">수동 모델 저장</button><button class="btn ghost small" onclick="NS56.modelTrain()">누적 대조로 후보 학습</button></div><div id="nsModelError" class="ns-error" role="alert"></div>${data.candidate?`<div class="ns-bar"><div><b>후보 ${E(data.candidate.model.version)}</b><div class="ns-muted">학습 ${data.candidate.nTrain}건 / 검증 ${data.candidate.nValidation}건 · 환자 단위 분리<br>현재 MAE ${data.candidate.baseline.mae} → 후보 MAE ${data.candidate.candidate.mae} · 검증 환자 ${data.candidate.validationPatients}명</div></div><button class="btn ghost small" onclick="NS56.modelActivate()">검토 후보 적용</button></div>`:''}<p class="ns-muted">후보 학습 최소 조건: 같은 검사판·환자군의 대조 20건, 서로 다른 환자 6명. 이것은 내부 학습 시작 조건이며 임상 검증 완료 기준이 아닙니다. 자유 문장은 기본 가명 내보내기에서 제외됩니다.</p>`;N.modelFieldsFill();
 }catch(e){card.innerHTML=`<h3>학습 파이프라인</h3><p class="ns-error">${E(e.message)}</p>`;}
};
N.modelFieldsFill=()=>{const model=N.pipelineData.config.models[$('nsModelCohort').value];$('nsModelEnabled').value=model.enabled?'1':'0';$('nsModelInstrument').value=model.instrument||'MMSE';$('nsModelInstrumentVersion').value=model.instrumentVersion||'';$('nsModelReviewer').value=model.reviewer||'';for(const key of ['Intercept','Motor','Dual','Tablet'])$('nsModel'+key).value=model[key.toLowerCase()]||0;};
N.modelSave=async()=>{try{const model={revision:N.pipelineData.config.revision,cohort:$('nsModelCohort').value,enabled:$('nsModelEnabled').value==='1',reviewer:$('nsModelReviewer').value.trim(),instrument:$('nsModelInstrument').value,instrumentVersion:$('nsModelInstrumentVersion').value.trim()};for(const key of ['Intercept','Motor','Dual','Tablet'])model[key.toLowerCase()]=+$('nsModel'+key).value;await N.api('/api/pipeline/model','POST',model);toast('수동 연구 모델을 저장했습니다. 이전 예측은 유지됩니다.');await N.pipelineCard();}catch(e){$('nsModelError').textContent=e.message;}};
N.modelTrain=async()=>{const b=$('nsPipelineCard').querySelector('button[onclick="NS56.modelTrain()"]');b.disabled=true;try{await N.api('/api/pipeline/candidate','POST',{cohort:$('nsModelCohort').value,instrument:$('nsModelInstrument').value,instrumentVersion:$('nsModelInstrumentVersion').value.trim()});toast('후보 모델만 생성했습니다.');await N.pipelineCard();}catch(e){$('nsModelError').textContent=e.message;}finally{if(b.isConnected)b.disabled=false;}};
N.modelActivate=async()=>{try{await N.api('/api/pipeline/activate','POST',{revision:N.pipelineData.config.revision,version:N.pipelineData.candidate.model.version,reviewer:$('nsModelReviewer').value.trim()});toast('검토한 후보를 이후 예측에 적용합니다.');await N.pipelineCard();}catch(e){$('nsModelError').textContent=e.message;}};
N.pipelineExport=async()=>{try{const json=await N.api('/api/pipeline/export'),blob=new Blob([JSON.stringify(json,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='neurosole_pipeline_'+cogToday()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('가명 파이프라인 자료를 내보냈습니다. 자유 문장은 제외되었습니다.');}catch(e){toast(e.message);}};
const originalSettings=renderSettings;
renderSettings=async()=>{await originalSettings();if(isAdmin()&&!$('nsPipelineCard')){$('settingsArea').insertAdjacentHTML('beforeend','<section class="card" id="nsPipelineCard"></section>');await N.pipelineCard();}};

/* Orientation answers must use the place confirmed by the therapist. */
const orientationRun=cogRun;
cogRun=async(taskId,level,opts)=>{
 if(taskId==='T05'&&!opts?.actualPlace){
  if(CG||VCS)return toast('현재 과제를 먼저 종료하세요.');
  N.orientationPending={taskId,level,opts};
  N.modal('nsOrientation','지남력 훈련 · 실제 장소 확인',`<p class="ns-muted">선택지 목록의 첫 장소를 정답으로 사용하지 않습니다. 환자가 있는 장소를 치료사가 확인하세요.</p><label for="nsActualPlace">현재 실제 장소</label><select id="nsActualPlace"><option value="">선택</option>${['병원','치료실','병실','집','요양원','복지관'].map(v=>`<option>${v}</option>`).join('')}</select>`,`<button class="btn" onclick="NS56.orientationStart()">장소 확인 · 시작</button>`);return;
 }
 return orientationRun(taskId,level,opts);
};
N.orientationStart=async()=>{const actualPlace=$('nsActualPlace').value;if(!actualPlace)return toast('현재 실제 장소를 선택하세요.');const p=N.orientationPending;$('nsOrientation').dataset.dirty='0';N.closeModal('nsOrientation');await orientationRun(p.taskId,p.level,{...p.opts,actualPlace});};
N.patientForecastOpen=async sys=>{
 const info=await getOrMakePatientInfo(sys);if(!info)return;N.modal('nsForecastModal','월간 인지 추적 · '+info.name,'<p class="ns-muted">불러오는 중…</p>');
 try{$('nsForecastModal').querySelector('.ns-modal-body').innerHTML=await N.forecastPanel(info);}catch(e){$('nsForecastModal').querySelector('.ns-modal-body').innerHTML=`<p class="ns-error">${E(e.message)}</p>`;}
};
const forecastCreate=N.forecastCreate;
N.forecastCreate=async()=>{await forecastCreate();if($('nsForecastModal')&&N.forecastInfo){$('nsForecastModal').querySelector('.ns-modal-body').innerHTML=await N.forecastPanel(N.forecastInfo);}};
renderCogMonArea=async()=>{
 const el=$('cogMonArea');if(!el)return;if(!dsPatients.length)await dsLoad();const rows=[];
 for(const p of dsPatients){if(!p.sysId)continue;const info=await getOrMakePatientInfo(p.sysId),s=info?.scores?.standardCognitive;let f=null,c=null;
  if(NET.on){try{const j=await N.api('/api/forecast/'+encodeURIComponent(p.sysId));f=j.forecasts.at(-1);c=j.comparisons.find(c=>c.id===f?.id);}catch(_){};}
  rows.push(`<tr><td><b>${E(p.name.split('(')[0])}</b></td><td>${s?E(s.instrument)+' '+(s.total??'부분')+' · '+E(s.version):'기준검사 미등록'}</td><td>${f?E(f.targetDate)+' · '+f.predicted:'미생성'}</td><td>${c?c.actual+' / 오차 '+c.error:'아직 대조 없음'}</td><td><button class="btn ghost small" onclick="NS56.patientForecastOpen('${E(p.sysId)}')">한 달 추적</button><button class="btn ghost small" onclick="cogMonitor('${E(p.sysId)}')">기존 이력</button></td></tr>`);
 }
 el.innerHTML=`<h2>인지 모니터링 · 월간 대조</h2><div class="ns-notice">실제 시행한 표준 검사와 생성 시 고정된 예측을 확인합니다. 초기 연구 모델이며 진단용 점수나 입증된 치료 효과로 해석하지 않습니다. 태블릿 과제는 추가 훈련으로 별도 수집합니다.</div><div class="card" style="overflow:auto"><table class="setup"><tr><th>환자</th><th>표준 기준검사</th><th>한 달 예측</th><th>실제 대조</th><th>기록</th></tr>${rows.join('')||'<tr><td colspan="5">등록된 환자가 없습니다.</td></tr>'}</table></div>`;
};
})();
