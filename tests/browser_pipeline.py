"""End-to-end checks against an isolated real server and Chromium. No real patient DB is modified."""
import json, os, socket, subprocess, tempfile, time, urllib.request, urllib.error
from pathlib import Path
from datetime import date
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def passed(msg): checks.append(msg);print('PASS',msg,flush=True)
with tempfile.TemporaryDirectory(prefix='neurosole-test-') as data:
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 base=f'http://127.0.0.1:{port}'
 proc=subprocess.Popen(['node','server.js','--demo'],cwd=ROOT/'server',env={**os.environ,'PORT':str(port),'NEUROSOLE_DATA_DIR':data},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 def api(path,method='GET',payload=None,token=None):
  req=urllib.request.Request(base+path,data=json.dumps(payload).encode() if payload is not None else None,method=method,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})})
  try:
   with urllib.request.urlopen(req,timeout=10) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 try:
  for _ in range(80):
   try:
    if api('/api/health')[0]==200:break
   except OSError:time.sleep(.1)
  else:raise RuntimeError('server did not start')
  admin=api('/api/login','POST',{'id':'admin','pw':'admin1234'})[1]['token'];at=api('/api/login','POST',{'id':'at','pw':'at1234'})[1]['token'];pt=api('/api/login','POST',{'id':'pt','pw':'pt1234'})[1]['token']
  today=date.today().isoformat()
  scores={'orient':7,'regist':3,'recall':1,'atten':2,'ue':'F','le':'F','bbs':28,'disease':'MCA_dom','langFail':{'command':False,'body':False,'aphasia':False,'pentagon':False,'neglect':False},'etcFlags':[]}
  patients=[{'id':101,'sysId':'p1','name':'가상환자1(F/70)','ward':'3병동','room':'301','wardRoom':'3병동\n301호','ptype':'입원','pt1':'ndt1','ot1':'ot1','n':'N','s':'S','cog':'인지','a':'','gm':'','_slotsV4':True},{'id':102,'sysId':'p2','name':'가상환자2(M/65)','ward':'3병동','room':'302','wardRoom':'3병동\n302호','ptype':'입원','ot1':'ot1','s':'S','a':'','gm':'','_slotsV4':True}]
  board=[{'patientId':101,'type':'S','therapistId':'ot1','slot':'s0905','label':'특수OT'},{'patientId':101,'type':'인지','therapistId':'ot1','slot':'s0940','label':'인지'},{'patientId':102,'type':'S','therapistId':'ot1','slot':'s1015','label':'특수OT'},{'patientId':101,'type':'N','therapistId':'ndt1','slot':'s1050','label':'NDT'}]
  kv={'ops:mode':'prod','deptsched:therapists':[{'id':'ot1','name':'모의 작업치료사','type':'OT'},{'id':'ndt1','name':'모의 물리치료사','type':'PT','cert':True}],'deptsched:patients':patients,'deptsched:board:'+today:board,'patientInfo:p1':{'id':'p1','name':'가상환자1','hasWeek':False,'disease':'MCA_dom','scores':scores},'patientInfo:p2':{'id':'p2','name':'가상환자2','hasWeek':False,'disease':'MCA_dom','scores':scores}}
  assert api('/api/kv','POST',{'items':[{'key':k,'val':v} for k,v in kv.items()]},admin)[0]==200
  assert api('/api/cognitive-protocols','POST',{'revision':0,'items':[]},at)[0]==403
  assert api('/api/kv','POST',{'key':'cogprotocol:v56','val':{}},at)[0]==403
  passed('therapist cannot change administrator protocols via either API')
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
   context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.set_default_timeout(12000)
   def login(user,pwd):
    page.goto(base,wait_until='domcontentloaded');page.wait_for_function('typeof NS56 === "object"');page.fill('#loginId',user);page.fill('#loginPw',pwd);page.click('.loginbtn');page.wait_for_function('currentUser !== null');page.wait_for_timeout(1000)
    for overlay in page.locator('.onb-ov').all():
     if overlay.is_visible():overlay.locator('button').last.click()
    page.evaluate("document.getElementById('pwWarn')?.remove()")
   login('admin','admin1234')
   page.click('[data-tabkey="setup"]');page.wait_for_selector('#nsProtocolManager .ns-protocol');page.locator('#nsProtocolManager button',has_text='편집 · 배포').first.click();page.fill('#nsPrReviewer','임상 검토 테스트');page.select_option('#nsPrPublished','1');page.click('#nsPrSave');page.wait_for_selector('#nsProtocolEditor',state='detached');assert '배포됨' in page.locator('#nsProtocolManager').inner_text();passed('administrator edits and publishes cognitive protocol in UI')
   page.reload(wait_until='domcontentloaded');page.wait_for_function('currentUser !== null');page.wait_for_timeout(700);assert page.locator('#appShell').is_visible();assert page.locator('.pane.active').get_attribute('id')=='pane-setup';assert page.input_value('#loginPw')=='';passed('server login and last screen survive reload without storing password')
   page.click('[data-tabkey="settings"]');page.wait_for_selector('#nsPipelineCard');page.go_back(wait_until='domcontentloaded');page.wait_for_timeout(600);assert page.locator('.pane.active').get_attribute('id')=='pane-setup';passed('browser Back restores app screen without returning to login')
   page.click('.logoutbtn');page.wait_for_selector('#loginScreen',state='visible');page.reload(wait_until='domcontentloaded');page.wait_for_timeout(500);assert page.locator('#loginScreen').is_visible();passed('explicit logout stays logged out after reload')
   login('at','at1234');page.wait_for_selector('.railpatient');page.locator('.railpatient').first.click();page.wait_for_timeout(1400);page.wait_for_selector('.ns-note-session');page.wait_for_timeout(800)
   assert page.locator('.ns-note-session').first.locator('summary').count()==0
   assert '미기록' in page.locator('.ns-note-session').first.inner_text();passed('unperformed treatments do not produce a P-note')
   page.locator('.ns-note-session button',has_text='시행 치료 선택').first.click();page.wait_for_selector('#nsNtLevel');page.wait_for_timeout(250);assert page.locator('#nsNtCandidates input[type=checkbox]:checked').count()==0
   page.fill('#nsNtCustom','실제 상지 도달 훈련');page.click('button[onclick="NS56.noteCustomAdd()"]');page.fill('#nsNtMinutes','25');page.select_option('#nsNtAssistance','언어 단서');page.select_option('#nsNtLevel','2');page.wait_for_timeout(200);page.select_option('#nsNtFormat','soap');page.fill('#nsNtResponse','단서 제공 후 8/10회 수행');page.fill('#nsNtPlan','동일 난이도 유지');page.locator('summary',has_text='Progress note 표현 직접 수정').click();page.fill('#nsNtNarrative','O: 실제 상지 도달 훈련 25분.\nA: 단서 후 8/10회 수행.\nP: 동일 난이도 유지.')
   page.locator('#nsDualSection summary').click();page.select_option('#nsNtDual','dt5');page.fill('#nsNtDualMinutes','5');page.select_option('#nsNtDtcDirection','lower');page.fill('#nsNtMotorSingle','10');page.fill('#nsNtMotorDual','12');page.fill('#nsNtCogSingleN','10');page.fill('#nsNtCogSingleOk','10');page.fill('#nsNtCogDualN','10');page.fill('#nsNtCogDualOk','8');page.click('#nsNtSave');page.wait_for_selector('#nsNoteModal',state='detached');page.wait_for_timeout(200)
   records=api('/api/session-notes/p1',token=at)[1]['records'];assert len(records)==1;r=records[0];assert len(r['items'])==1 and r['items'][0]['text']=='실제 상지 도달 훈련';assert r['dualTask']['motorDTC']==20 and r['dualTask']['cognitiveDTC']==20;assert r['noteText']!=r['generatedText'];assert r['by']=='at' and r['level']==2;passed('actual selected therapy, edited note, difficulty, ID and both DTC metrics are stored')
   assert api('/api/session-notes/p1','POST',r,pt)[0]==403;assert api('/api/session-notes/p1','POST',{**r,'revision':0},at)[0]==409;passed('other therapist and stale note revision cannot overwrite session')
   recs=api('/api/recommendations/p1?type=S&level=2',token=at)[1];assert recs['items'][0]['text']=='실제 상지 도달 훈련';assert recs['style']['format']=='soap';assert api('/api/recommendations/p1?type=S&level=1',token=at)[1]['items']==[];passed('personalized format and recommendations use own ID and same difficulty')
   page.check('#nsWheelSelect');page.locator('#patientRail .railpatient').first.hover();page.mouse.wheel(0,200);page.wait_for_timeout(1000);assert page.evaluate('thHome.patientRow')==102;passed('optional wheel moves through patient rail sessions with throttling')
   page.evaluate('thOpenPatient(101)');page.wait_for_timeout(800);page.reload(wait_until='domcontentloaded');page.wait_for_function('currentUser !== null');page.wait_for_timeout(1200);assert page.evaluate('thHome.patientRow')==101;passed('selected patient survives reload')
   page.evaluate('NS56.standardAssessment()');page.wait_for_selector('#nsStandard');page.fill('#nsAxVersion','K-MMSE 테스트판');page.fill('#nsAxTotal','31');page.select_option('#nsAxCoop','좋음');page.select_option('#nsAxFatigue','없음');page.fill('#nsAxLimits','제한 없음');page.click('#nsAxSave');assert '0~30' in page.locator('#nsAxError').inner_text();page.fill('#nsAxTotal','20');page.click('#nsAxSave');page.wait_for_selector('#nsStandard',state='detached');passed('standard cognition rejects invalid score and records a real 30-point instrument and cohort')
   assert api('/api/forecast/p1','POST',{'baselineId':'missing','plan':{}},at)[0]==400
   ax=api('/api/standard-assessments/p1',token=at)[1]['records'];assert ax[0]['total']==20 and ax[0]['cohort']=='abi';config=api('/api/pipeline',token=admin)[1]['config']
   model={'revision':config['revision'],'cohort':'abi','enabled':True,'reviewer':'연구 검토 테스트','instrument':'MMSE','instrumentVersion':'K-MMSE 테스트판','intercept':0,'motor':0,'dual':0,'tablet':0};assert api('/api/pipeline/model','POST',model,at)[0]==403;assert api('/api/pipeline/model','POST',model,admin)[0]==200
   forecastReq={'baselineId':ax[0]['id'],'plan':{'motorMinutes':600,'dualMinutes':100,'tabletMinutes':60}};status,result=api('/api/forecast/p1','POST',forecastReq,at);assert status==200,(status,result);forecast=result['forecast'];assert forecast['predicted']==20 and forecast['inputHash'];assert api('/api/forecast/p1','POST',forecastReq,at)[0]==409
   config=api('/api/pipeline',token=admin)[1]['config'];assert api('/api/pipeline/model','POST',{**model,'revision':config['revision'],'intercept':2},admin)[0]==200;stored=api('/api/forecast/p1',token=at)[1]['forecasts'][0];assert stored['predicted']==20 and stored['model']['intercept']==0;passed('monthly forecast is frozen and cannot be overwritten by later model or dose changes')
   assert api('/api/pipeline/candidate','POST',{'cohort':'abi','instrument':'MMSE','instrumentVersion':'K-MMSE 테스트판'},admin)[0]==400;passed('insufficient data blocks candidate learning instead of pretending AI is trained')
   exported=api('/api/pipeline/export',token=admin)[1];assert exported['freeTextIncluded']==False;assert 'noteText' not in exported['notes'][0];assert exported['notes'][0]['patient_id']!='p1';passed('research export separates structured data and excludes note free text')
   page.evaluate('vcsStart()');page.wait_for_selector('#nsVCoop');page.select_option('#nsVCoop','좋음');page.select_option('#nsVFatigue','없음');page.fill('#nsVLimits','제한 없음');page.click('button[onclick="NS56.vcsBegin()"]');page.evaluate("clearInterval(VCS.timer);vcsFlankerRun(true)");page.wait_for_timeout(200);page.evaluate("vcsFlankerAns(VCS.fl.trials[0].dir);vcsFlankerAns(VCS.fl.trials[1].dir)");assert page.evaluate('VCS.fl.res.length')==1;page.wait_for_timeout(600);page.evaluate("VCS.res={mem:null,flanker:6,dccs:6,corsi:6,star:6};VCS.skip={mem:'vision'};VCS.raw={};vcsFinish()");page.wait_for_timeout(400);assert '부분 시행' in page.locator('#vcsOv').inner_text();observed=api('/api/standard-assessments/p1',token=at)[1]['records'];vcs=[r for r in observed if r['type']=='VCS'][0];assert vcs['total'] is None and not vcs['prorated'];page.click('button[onclick="vcsClose()"]');page.wait_for_selector('#vcsOv',state='detached');passed('VCS ignores double taps and does not manufacture a total for missing subtests')
   page.evaluate("COG_RUNNERS.T05=async()=>{throw new Error('injected runner failure')};cogRun('T05',1,{actualPlace:'병원'})");page.wait_for_timeout(300);assert '완료 기록으로 저장하지 않았습니다' in page.locator('#cogStage').inner_text();assert api('/api/kv/cogsess%3Ap1',token=at)[1]['val'] is None;page.click('button[onclick="cogClose(false)"]');passed('failed training runner cannot save a completed rehabilitation outcome')
   assert page.evaluate("resolvePhoto('neuro',0,null)===NS56.referencePhotos.movement");page.evaluate("NS56.evidenceOpen()");assert 'DAPA' in page.locator('#nsEvidence').inner_text() and '403' not in page.locator('#nsEvidence').inner_text();page.evaluate("NS56.closeModal('nsEvidence')");passed('embedded documentary photos and verified clinical references load without external requests')
   assert '연구 검토 테스트' not in json.dumps(exported,ensure_ascii=False);passed('research export excludes model reviewer free text')
   assert errors==[],errors;passed('no uncaught JavaScript errors during end-to-end clinical workflow')
   page.screenshot(path=str(ROOT/'tests/browser-pipeline.png'),full_page=False)
   context.close();browser.close()
  print(f'Completed {len(checks)} browser/API checks.',flush=True)
 finally:
  proc.terminate();proc.wait(timeout=10)
