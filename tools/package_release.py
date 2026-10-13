"""Build review packages while excluding clinical data, tokens, backups and Git metadata."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'artifacts'
OUT.mkdir(exist_ok=True)
for name in ['neurosole_app_v56_review.html','neurosole_app_v56_code.txt']:
 shutil.copyfile(ROOT/'neurosole_app.html',OUT/name)
def allowed(path):
 parts=path.relative_to(ROOT).parts
 return not any(x in {'.git','__pycache__','data'} for x in parts) and path.suffix!='.pyc' and path.name!='browser-pipeline.png'
for name,folders in [('NeuroSole_server_v56_review.zip',['server']),('NeuroSole_v56_full_code.zip',['server','ui','tools','tests','docs'])]:
 with ZipFile(OUT/name,'w',ZIP_DEFLATED) as archive:
  for folder in folders:
   for path in sorted((ROOT/folder).rglob('*')):
    if path.is_file() and allowed(path):archive.write(path,path.relative_to(ROOT))
  for name in ['README_V56_KO.txt','.gitignore']:
   archive.write(ROOT/name,name)
  if 'ui' in folders:archive.write(ROOT/'neurosole_app.html','neurosole_app.html')
for path in sorted(OUT.iterdir()):
 if path.is_file():print(path.name,path.stat().st_size)
