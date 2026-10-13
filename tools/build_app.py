"""Embed the V56 refinements into the uploaded standalone app and the server shell."""
from pathlib import Path
import re
import json, base64
ROOT=Path(__file__).resolve().parents[1]
base=(ROOT/'ui/base-v55.html').read_text()
base=base.replace('예) 🍎 🚗 <b>🍎</b>',"${P.n===1?'예) 🍎 <b>🍎</b>':'예) 🍎 🚗 <b>🍎</b>'}")
a=base.index('async function cogT05(');b=base.index('/* T06 하루 일과 순서 */',a)
base=base[:a]+base[a:b].replace('let hintUsed=false;', 'let hintUsed=level===1&&!!Q.hint;')+base[b:]
base=base.replace('결과는 아래 P-note에 자동 추가','수행 이력에 저장 · P-note는 시행 항목 선택 후 기록')
base=base.replace('MMSE 지남력','기존 지남력 부분점수').replace('MMSE 회상','기존 회상 부분점수').replace('MMSE 주의','기존 주의 부분점수')
base=base.replace("const place=(COG_CFG.places||[])[0]||'병원';","const place=CG.actualPlace||'병원';")
css=(ROOT/'ui/refinement.css').read_text()
js=(ROOT/'ui/refinement.js').read_text()+'\n'+(ROOT/'ui/pipeline.js').read_text()
photos={key:'data:image/jpeg;base64,'+base64.b64encode((ROOT/'ui/assets'/('therapy-'+name+'.jpg')).read_bytes()).decode() for key,name in [('movement','movement'),('consultation','consultation')]}
signatures=sorted({str(len(v))+':'+v[-64:] for v in re.findall(r'data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+',base)})
js+='\nNS56.referencePhotos='+json.dumps(photos)+';\nNS56.builtinPhotoSignatures=new Set('+json.dumps(signatures)+');\n'+(ROOT/'ui/clinical-review.js').read_text()
base=base.replace('<meta name="ns-version" content="V55">','<meta name="ns-version" content="V56">')
base=base.replace('  // 항상 로그인 화면부터 시작합니다 (자동 로그인 사용 안 함)','  // Restore only after validating the server token or the existing local account.\n  if(document.readyState===\'loading\') await new Promise(resolve=>document.addEventListener(\'DOMContentLoaded\',resolve,{once:true}));\n  await NS56.resume();')
# The original async initialization yields to netInit, so NS56 is defined before resume.
head, tail = base.rsplit('</body>', 1)
base=head+f'<style id="ns-refinement-style">\n{css}\n</style>\n<script id="ns-refinement-script">\n{js}\n</script>\n</body>'+tail
if base.count('id="ns-refinement-script"')!=1: raise RuntimeError('refinement must be embedded exactly once')
for path in [ROOT/'server/public/index.html',ROOT/'neurosole_app.html']:
 path.write_text(base)
print('Built standalone and server HTML:',len(base.encode()),'bytes')
