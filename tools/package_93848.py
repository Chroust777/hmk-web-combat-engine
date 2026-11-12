#!/usr/bin/env python3
"""Generate deterministic full/patch/evidence ZIP, file hashes and replay verification.
Run from any cwd. Keep the v93.847 baseline read-only.
"""
from pathlib import Path
import hashlib,json,zipfile,os,datetime
ROOT=Path(__file__).resolve().parents[1]
DATA=Path('/mnt/data')
SOURCE=DATA/'HMK_v93.847_FULL.zip'
BASE='hmk-web-combat-engine-main/'

def sha(b):return hashlib.sha256(b).hexdigest()
def entries():return {p.relative_to(ROOT).as_posix():p.read_bytes() for p in ROOT.rglob('*') if p.is_file()}
def openbase():
 with zipfile.ZipFile(SOURCE,'r') as z:
  assert z.testzip() is None,'base ZIP corrupt'
  return {n[len(BASE):]:z.read(n) for n in z.namelist() if n.startswith(BASE) and not n.endswith('/')}
def zipfiles(path,files):
 with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for k in sorted(files):
   i=zipfile.ZipInfo(BASE+k,date_time=(2026,11,12,12,0,0))
   i.compress_type=zipfile.ZIP_DEFLATED
   i.external_attr=(0o644<<16)
   z.writestr(i,files[k],compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None,'ZIP corrupt '+path.as_posix()
  return len(z.namelist())

old=openbase();new=entries()
internal='HMK_SHA256_MANIFEST.txt'
# Internal manifest excludes itself to avoid a circular hash, includes every real source file.
manifest='HMK Web Combat Engine · v93.848 | SHA-256 files (excluding this manifest)\n'+ ''.join(sha(new[k])+'  '+k+'\n' for k in sorted(new) if k!=internal)
(ROOT/internal).write_text(manifest,encoding='utf-8')
new=entries()
assert not set(old)-set(new),'removing baseline files is prohibited'
changed={k:b for k,b in new.items() if k not in old or old[k]!=b}
added=sorted(set(new)-set(old));updated=sorted(k for k in old if old[k]!=new[k]);removed=[]
assert {'app.js','styles.css','index.html','hmk-app.bundle.js'}.issubset(set(updated))
assert 'tools/evidence_93848/ANIMAL_RESERVED_SECOND_GROUP.png' in added
out_full=DATA/'HMK_v93.848_FULL.zip';out_patch=DATA/'HMK_v93.847_to_v93.848_PATCH.zip'
print('files',len(old),len(new),'added',len(added),'changed',len(updated),flush=True)
zipfiles(out_full,new);zipfiles(out_patch,changed)
with zipfile.ZipFile(out_patch) as z:
 delta={n[len(BASE):]:z.read(n) for n in z.namelist()}
replayed={**old,**delta}
assert set(replayed)==set(new)
assert all(sha(replayed[k])==sha(new[k]) for k in new),'PATCH replay mismatch'
with zipfile.ZipFile(out_full) as z:
 assert set(n[len(BASE):] for n in z.namelist())==set(new)
 assert all(sha(z.read(BASE+k))==sha(new[k]) for k in new),'FULL mismatch'
sha_lines='HMK v93.848 FULL | SHA-256 manifest | files excluding root manifest\n'+''.join(sha(new[k])+'  '+BASE+k+'\n' for k in sorted(new) if k!=internal)
(DATA/'HMK_v93.848_SHA256_MANIFEST.txt').write_text(sha_lines,encoding='utf-8')
result={
 'base_full':SOURCE.name,'new_full':out_full.name,'patch':out_patch.name,
 'base_file_count':len(old),'full_file_count':len(new),'added_count':len(added),'modified_count':len(updated),'removed_count':0,
 'added':added,'modified':updated,'removed':removed,
 'full_zip_sha256':sha(out_full.read_bytes()),'patch_zip_sha256':sha(out_patch.read_bytes()),
 'base_zip_integrity':'PASS','full_zip_integrity':'PASS','patch_zip_integrity':'PASS',
 'base_FULL_plus_PATCH_equals_new_FULL':True,'per_file_sha256_match_count':len(new),
 'excluded_from_manifest':[internal],
}
(DATA/'HMK_v93.848_PATCH_VERIFICATION.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
# Test proof distribution; avoids copying baseline historical evidence.
evroot=ROOT/'tools/evidence_93848'
files={k:v for k,v in new.items() if k.startswith('tools/evidence_93848/') or k.startswith('tools/browser_93848_') or k.startswith('tools/build_93848_bundle.cjs') or k=='docs/HMK_v93.848_AUDIT_REPORT.md' or k=='tools/package_93848.py'}
evzip=DATA/'HMK_v93.848_TEST_EVIDENCE.zip'
zipfiles(evzip,files)
print(json.dumps({k:result[k] for k in ('base_file_count','full_file_count','added_count','modified_count','removed_count','base_FULL_plus_PATCH_equals_new_FULL')},ensure_ascii=False))
print('FULL',out_full,out_full.stat().st_size,'PATCH',out_patch,out_patch.stat().st_size,'EVIDENCE',evzip,evzip.stat().st_size)
