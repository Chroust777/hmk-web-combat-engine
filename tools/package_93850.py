#!/usr/bin/env python3
"""Deterministic HMK 93.850 FULL / PATCH plus exact SHA-256 replay validation.
Usage: python tools/package_93850.py [path/to/HMK_v93.849_FULL.zip]
"""
from pathlib import Path
import hashlib, json, sys, zipfile
ROOT=Path(__file__).resolve().parents[1]
DATA=Path('/mnt/data')
BASE='hmk-web-combat-engine-main/'
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else DATA/'HMK_v93.849_FULL.zip'
PREFIX='HMK_v93.850'

def sha(raw):return hashlib.sha256(raw).hexdigest()
def folder():return {p.relative_to(ROOT).as_posix():p.read_bytes() for p in ROOT.rglob('*') if p.is_file()}
def zipwrite(filename,rows):
 with zipfile.ZipFile(filename,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for name in sorted(rows):
   zi=zipfile.ZipInfo(BASE+name,date_time=(2026,11,12,12,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.external_attr=0o644<<16
   z.writestr(zi,rows[name],compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
 with zipfile.ZipFile(filename) as z:
  assert z.testzip() is None,'Invalid ZIP: '+str(filename)
  assert len(z.namelist())==len(rows)
  for name,b in rows.items():assert sha(z.read(BASE+name))==sha(b),'Mismatched ZIP bytes: '+name

with zipfile.ZipFile(SOURCE) as z:
 assert z.testzip() is None,'Base FULL ZIP corrupt'
 baseline={n[len(BASE):]:z.read(n) for n in z.namelist() if n.startswith(BASE) and not n.endswith('/')}
base_sha=sha(SOURCE.read_bytes())
assert base_sha=='bfc4b62be8c4e18c23665e10e17a38182ce7efc8d2c594ec6b388e7a387ce1bc','Wrong base FULL'
current=folder()
internal='HMK_SHA256_MANIFEST.txt'
current[internal]=('HMK SHA-256 manifest: v93.850\nScope: every relative file below (excluding the manifest itself)\n'+
 ''.join(sha(current[name])+'  '+name+'\n' for name in sorted(current) if name!=internal)).encode('utf-8')
(ROOT/internal).write_bytes(current[internal]);current=folder()
removed=sorted(set(baseline)-set(current));assert not removed,'Baseline files removed: '+str(removed)
changed={k:v for k,v in current.items() if baseline.get(k)!=v}
modified=sorted(set(changed)&set(baseline));added=sorted(set(changed)-set(baseline))
assert set(modified)=={'app.js','index.html','book-templates.css','hmk-app.bundle.js','docs/HMK_TRVALY_STANDARD_INTERAKTIVNIHO_AUDITU.md','HMK_SHA256_MANIFEST.txt'},modified
outfull=DATA/(PREFIX+'_FULL.zip');outpatch=DATA/('HMK_v93.849_to_v93.850_PATCH.zip')
zipwrite(outfull,current);zipwrite(outpatch,changed)
with zipfile.ZipFile(outpatch) as patch:
 rebuilt={**baseline,**{n[len(BASE):]:patch.read(n) for n in patch.namelist()}}
assert set(rebuilt)==set(current)
assert all(sha(rebuilt[n])==sha(current[n]) for n in current)
external=DATA/(PREFIX+'_SHA256_MANIFEST.txt')
external.write_text('HMK Web Combat Engine v93.850 | SHA-256 all files excluding internal manifest\n'+
 ''.join(sha(current[k])+'  '+BASE+k+'\n' for k in sorted(current) if k!=internal),encoding='utf-8')
verification={'base_full':SOURCE.name,'base_zip_sha256':base_sha,'full_zip':outfull.name,'patch_zip':outpatch.name,
 'full_zip_sha256':sha(outfull.read_bytes()),'patch_zip_sha256':sha(outpatch.read_bytes()),
 'base_file_count':len(baseline),'full_file_count':len(current),'patch_file_count':len(changed),
 'modified_count':len(modified),'added_count':len(added),'removed_count':len(removed),'modified':modified,'added':added,'removed':removed,
 'base_FULL_plus_PATCH_equals_new_FULL':True,'per_file_sha256_match_count':len(current),
 'integrity':{'base_zip_crc':'PASS','full_zip_crc':'PASS','patch_zip_crc':'PASS','full_plus_patch_bitwise_replay':'PASS'}}
(DATA/(PREFIX+'_PATCH_VERIFICATION.json')).write_text(json.dumps(verification,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({k:verification[k] for k in ['base_file_count','full_file_count','patch_file_count','modified_count','added_count','removed_count','base_FULL_plus_PATCH_equals_new_FULL','per_file_sha256_match_count']},ensure_ascii=False))
print(outfull,outfull.stat().st_size,'|',outpatch,outpatch.stat().st_size)
