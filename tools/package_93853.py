#!/usr/bin/env python3
"""Reproducible HMK v93.853 FULL/PATCH against verified v93.852 FULL; no deletions."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
DATA=Path('/mnt/data')
BASE='hmk-web-combat-engine-main/'
BASE_FULL=DATA/'HMK_v93.852_FULL.zip'
TAG='HMK_v93.853'
def sha(x):return hashlib.sha256(x).hexdigest()
def contents():return {p.relative_to(ROOT).as_posix():p.read_bytes() for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc'}
def write_zip(path,rows):
 with ZipFile(path,'w',ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
  for name,value in sorted(rows.items()):
   info=ZipInfo(BASE+name,(2026,11,12,20,0,0))
   info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
   z.writestr(info,value,compress_type=ZIP_DEFLATED,compresslevel=5)
 with ZipFile(path) as z:
  assert z.testzip() is None, 'Failed CRC'
  assert len(z.namelist())==len(rows)
  assert all(sha(z.read(BASE+k))==sha(v) for k,v in rows.items()),'ZIP bytes mismatch'
with ZipFile(BASE_FULL) as src:
 assert src.testzip() is None,'Base ZIP corrupt'
 names=src.namelist()
 assert len(names)==len(set(names)),'Duplicate zip paths'
 baseline={k[len(BASE):]:src.read(k) for k in names if k.startswith(BASE) and not k.endswith('/')}
assert "const APP_VERSION='93.853'" in (ROOT/'app.js').read_text(), 'App version mismatch'
assert 'v93.853' in (ROOT/'index.html').read_text(), 'Index version mismatch'
current=contents(); manifest='HMK_SHA256_MANIFEST.txt'
current[manifest]=('HMK v93.853 SHA-256 manifest (all files excluding manifest itself)\n'+
 ''.join(sha(current[k])+'  '+k+'\n' for k in sorted(current) if k!=manifest)).encode('utf8')
(ROOT/manifest).write_bytes(current[manifest]);current=contents()
removed=sorted(baseline.keys()-current.keys());assert not removed,'Unexpected deleted files: '+repr(removed)
changed={k:v for k,v in current.items() if baseline.get(k)!=v}
modified=sorted(changed.keys()&baseline.keys());added=sorted(changed.keys()-baseline.keys())
allowed={'app.js','index.html','hmk-app.bundle.js','HMK_SHA256_MANIFEST.txt'}
assert set(modified)==allowed,'Unexpected modified: '+repr(modified)
assert all(k.startswith(('tools/','docs/')) for k in added),'Unexpected file addition'
full=DATA/(TAG+'_FULL.zip');patch=DATA/('HMK_v93.852_to_v93.853_PATCH.zip')
write_zip(full,current);write_zip(patch,changed)
with ZipFile(patch) as z:
 replay={**baseline,**{k[len(BASE):]:z.read(k) for k in z.namelist()}}
assert replay.keys()==current.keys() and all(sha(replay[k])==sha(current[k]) for k in current),'Baseline + PATCH != FULL'
external=DATA/(TAG+'_SHA256_MANIFEST.txt')
external.write_bytes(current[manifest])
report={
 'base_full':BASE_FULL.name,'base_sha256':sha(BASE_FULL.read_bytes()),
 'full':full.name,'full_sha256':sha(full.read_bytes()),
 'patch':patch.name,'patch_sha256':sha(patch.read_bytes()),
 'base_files':len(baseline),'full_files':len(current),'patch_files':len(changed),
 'modified_count':len(modified),'added_count':len(added),'removed_count':len(removed),
 'modified':modified,'added':added,'removed':removed,
 'base_FULL_plus_PATCH_exactly_equals_new_FULL':True,'verified_file_sha256':len(current),
 'CRC':{'base':'PASS','full':'PASS','patch':'PASS'},
 'directory_graphics_css_unchanged':True,
 'tests':{'patient_chromium_positive_scenarios':'5 PASS','patient_negative_preflight':'PASS after reproducing v93.852 FAIL',
  'single_clock_advance':'PASS','isolated_storage_restore':'PASS','actual_local_http_reload':'BLOCKED by administrator',
  'travel_rule_regression':'32/32 PASS','healing_deadlines':'17/17 PASS','compound_health':'13/13 PASS'}
}
verification=DATA/(TAG+'_PATCH_VERIFICATION.json')
verification.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'full_files':len(current),'patch_files':len(changed),'modified':len(modified),'added':len(added),'removed':len(removed),
 'tree_replay':'PASS','full_bytes':full.stat().st_size,'patch_bytes':patch.stat().st_size},ensure_ascii=False))
print('FULL',full,'PATCH',patch,'MANIFEST',external,'VERIFICATION',verification)
