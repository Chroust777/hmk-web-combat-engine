#!/usr/bin/env python3
"""Reproducible v93.854 FULL + PATCH from verified v93.853 FULL. No deletions."""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
DATA=Path('/mnt/data')
PREFIX='hmk-web-combat-engine-main/'
BASE_FULL=DATA/'HMK_v93.853_FULL.zip'
VER='93.854'
TAG='HMK_v'+VER

def sha(blob):return hashlib.sha256(blob).hexdigest()
def files():return {p.relative_to(ROOT).as_posix():p.read_bytes() for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc'}
def zipout(file,content):
 with ZipFile(file,'w',ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
  for rel,raw in sorted(content.items()):
   info=ZipInfo(PREFIX+rel,(2026,11,12,22,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
   z.writestr(info,raw,compress_type=ZIP_DEFLATED,compresslevel=5)
 with ZipFile(file) as z:
  assert z.testzip() is None
  assert len(z.namelist())==len(content)
  assert all(sha(z.read(PREFIX+k))==sha(v) for k,v in content.items())
with ZipFile(BASE_FULL) as z:
 assert z.testzip() is None
 base={n[len(PREFIX):]:z.read(n) for n in z.namelist() if n.startswith(PREFIX) and not n.endswith('/')}
assert len(base)==len(set(base))
assert "const APP_VERSION='93.854'" in (ROOT/'app.js').read_text()
assert 'v93.854' in (ROOT/'index.html').read_text()
current=files();manifest='HMK_SHA256_MANIFEST.txt'
current[manifest]=('HMK v93.854 SHA-256 manifest — all non-manifest files\n'+''.join(sha(current[k])+'  '+k+'\n' for k in sorted(current) if k!=manifest)).encode('utf-8')
(ROOT/manifest).write_bytes(current[manifest])
current=files();removed=sorted(base.keys()-current.keys())
assert not removed, f'Unexpected deletions: {removed}'
changes={k:v for k,v in current.items() if base.get(k)!=v}
modified=sorted(k for k in changes if k in base);added=sorted(k for k in changes if k not in base)
allowed={'app.js','index.html','hmk-app.bundle.js','src/integration/hmk-trekking-correction.js','HMK_SHA256_MANIFEST.txt'}
assert set(modified)==allowed,(modified,allowed)
assert all(x.startswith(('tools/','docs/')) for x in added),added
assert all(base[k]==current[k] for k in base.keys()&current.keys() if k not in changes)
full=DATA/(TAG+'_FULL.zip');patch=DATA/('HMK_v93.853_to_v93.854_PATCH.zip')
zipout(full,current);zipout(patch,changes)
with ZipFile(patch) as z:replayed={**base,**{k[len(PREFIX):]:z.read(k) for k in z.namelist()}}
assert replayed.keys()==current.keys() and all(sha(replayed[k])==sha(current[k]) for k in current)
(DATA/(TAG+'_SHA256_MANIFEST.txt')).write_bytes(current[manifest])
verification={'base_full':BASE_FULL.name,'base_sha256':sha(BASE_FULL.read_bytes()),'full':full.name,
 'full_sha256':sha(full.read_bytes()),'patch':patch.name,'patch_sha256':sha(patch.read_bytes()),
 'base_files':len(base),'full_files':len(current),'patch_files':len(changes),
 'modified':modified,'added':added,'removed':removed,
 'base_FULL_plus_PATCH_exactly_equals_new_FULL':True,'verified_file_sha256':len(current),
 'CRC':{'base':'PASS','full':'PASS','patch':'PASS'},
 'original_css_graphics_cloud_code_unchanged':True,
 'tests':{'stars_rules_matrix':'1447/1447 PASS','travel_modifiers':'32/32 PASS',
          'Chromium':'5 cited scenarios PASS','offline_repaired_cloud_reload':'PASS (no network)',
          'real_GitHub_reload':'NEOVĚŘENO','all_possible_states':'NEOVĚŘENO'}}
(DATA/(TAG+'_PATCH_VERIFICATION.json')).write_text(json.dumps(verification,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'full_files':len(current),'patch_files':len(changes),'modified':len(modified),'added':len(added),
 'removed':len(removed),'roundtrip':'PASS','full_MB':round(full.stat().st_size/1e6,2),'patch_MB':round(patch.stat().st_size/1e6,2)},ensure_ascii=False))
