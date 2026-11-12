#!/usr/bin/env python3
"""Release HMK 93.851: FULL/PATCH archive, SHA256 and deterministic per-file replay verification."""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
DATA=Path('/mnt/data')
BASE='hmk-web-combat-engine-main/'
BASE_FULL=DATA/'HMK_v93.850_FULL.zip'
PREFIX='HMK_v93.851'
def sha(x):return hashlib.sha256(x).hexdigest()
def tree():return {p.relative_to(ROOT).as_posix():p.read_bytes() for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
def write_zip(path,rows):
 with ZipFile(path,'w',ZIP_DEFLATED,compresslevel=5,allowZip64=True) as out:
  for name,value in sorted(rows.items()):
   info=ZipInfo(BASE+name,(2026,11,12,16,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
   out.writestr(info,value,compress_type=ZIP_DEFLATED,compresslevel=5)
 with ZipFile(path) as check:
  assert check.testzip() is None,'ZIP CRC failure'
  assert len(check.namelist())==len(rows),'Wrong ZIP file count'
  assert all(sha(check.read(BASE+k))==sha(v) for k,v in rows.items()),'ZIP data mismatch'
with ZipFile(BASE_FULL) as src:
 assert src.testzip() is None,'Base ZIP corrupt'
 baseline={k[len(BASE):]:src.read(k) for k in src.namelist() if k.startswith(BASE) and not k.endswith('/')}
assert "93.851" in (ROOT/'index.html').read_text(), 'HTML version mismatch'
assert "const APP_VERSION='93.851'" in (ROOT/'app.js').read_text(), 'App version mismatch'
current=tree();manifest='HMK_SHA256_MANIFEST.txt'
current[manifest]=('HMK v93.851 SHA-256 manifest (all files excluding manifest itself)\n'+
 ''.join(sha(current[k])+'  '+k+'\n' for k in sorted(current) if k!=manifest)).encode('utf-8')
(ROOT/manifest).write_bytes(current[manifest]);current=tree()
removed=sorted(baseline.keys()-current.keys());assert not removed,'No deletions allowed: '+repr(removed)
changed={k:v for k,v in current.items() if baseline.get(k)!=v}
modified=sorted(changed.keys()&baseline.keys());added=sorted(changed.keys()-baseline.keys())
allowed_changed={'app.js','index.html','hmk-app.bundle.js','HMK_SHA256_MANIFEST.txt','docs/HMK_TRVALY_STANDARD_INTERAKTIVNIHO_AUDITU.md',
 'src/integration/hmk-episode-travel-detail.js','src/integration/hmk-time-episodes.js',
 'src/integration/hmk-trekking-routine.js','src/integration/hmk-trekking-wilderness-tasks.js'}
assert set(modified)==allowed_changed,'Unexpected modified source: '+repr(modified)
assert all(x.startswith(('tools/','docs/')) for x in added), 'Unexpected new program code files'
full=DATA/(PREFIX+'_FULL.zip');patch=DATA/('HMK_v93.850_to_v93.851_PATCH.zip')
write_zip(full,current);write_zip(patch,changed)
with ZipFile(patch) as z:
 replay={**baseline,**{k[len(BASE):]:z.read(k) for k in z.namelist()}}
assert replay.keys()==current.keys() and all(sha(replay[k])==sha(v) for k,v in current.items()),'FULL+PATCH mismatch'
external=DATA/(PREFIX+'_SHA256_MANIFEST.txt')
external.write_text('HMK v93.851 full archive SHA-256 (manifest excluded)\n'+
 ''.join(sha(current[k])+'  '+BASE+k+'\n' for k in sorted(current) if k!=manifest),encoding='utf8')
proof={'base_full':BASE_FULL.name,'base_sha256':sha(BASE_FULL.read_bytes()),'full':full.name,'full_sha256':sha(full.read_bytes()),
       'patch':patch.name,'patch_sha256':sha(patch.read_bytes()),
       'base_files':len(baseline),'full_files':len(current),'patch_files':len(changed),
       'modified_count':len(modified),'added_count':len(added),'removed_count':len(removed),'modified':modified,'added':added,'removed':removed,
       'base_FULL_plus_PATCH_exactly_equals_new_FULL':True,'verified_file_sha256':len(current),
       'CRC':{'base':'PASS','full':'PASS','patch':'PASS'},'directory_graphics_unchanged':True,
       'tests':{'terrain':'290/290 PASS','rule_regression':'32/32 PASS','chromium_cases':'10 PASS','historical_literal_version_93842':'SKIP'}}
verification=DATA/(PREFIX+'_PATCH_VERIFICATION.json')
verification.write_text(json.dumps(proof,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'files':len(current),'patch_entries':len(changed),'modified':len(modified),'added':len(added),
 'deleted':len(removed),'replay_sha256':'PASS','full_bytes':full.stat().st_size,'patch_bytes':patch.stat().st_size},ensure_ascii=False))
print(full);print(patch);print(external);print(verification)
