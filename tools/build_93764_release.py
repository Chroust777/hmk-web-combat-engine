"""Reproducible patch against the authoritative v93.763 full ZIP."""
from __future__ import annotations
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/mnt/data')
BASE=OUT/'HMK_Keeper_Ledger_v93.763_FULL.zip'
NEW='93.764'
PREFIX='hmk-web-combat-engine-main/'
FULL=OUT/f'HMK_Keeper_Ledger_v{NEW}_FULL.zip'
PATCH=OUT/f'HMK_Keeper_Ledger_v{NEW}_PATCH.zip'
REPORT=OUT/f'HMK_Keeper_Ledger_AUDIT_v{NEW}.md'
MANIFEST=ROOT/f'docs/PATCH_MANIFEST_v{NEW}.json'
sha=lambda d:hashlib.sha256(d).hexdigest()
files=lambda: {p.relative_to(ROOT).as_posix():p for p in ROOT.rglob('*') if p.is_file()}
with ZipFile(BASE) as z:
 original={n[len(PREFIX):]:sha(z.read(n)) for n in z.namelist() if n.startswith(PREFIX) and not n.endswith('/')}
assert len(original)==1130,len(original)
assert not (set(original)-set(files())),'An old authoritative file disappeared.'
current={k:sha(p.read_bytes()) for k,p in files().items() if k!=MANIFEST.relative_to(ROOT).as_posix()}
changed=sorted(k for k,v in current.items() if original.get(k)!=v)
assert all('93.764' in k or '93764' in k or k in ('app.js','index.html','hmk-app.bundle.js','src/integration/hmk-travel-vehicle-93756.js') for k in changed),changed
assert not any(k in original and 'docs/AUDIT_v93.763_' in k for k in changed),'Historical audit evidence altered'
MANIFEST.write_text(json.dumps({'version':NEW,'authoritativeBase':BASE.name,'baseFileCount':len(original),'removedFiles':[],
 'changedOrNew':changed+[MANIFEST.relative_to(ROOT).as_posix()], 'unchangedHistoricalFilesPreserved':True,
 'note':'All paths are relative to repository root; archive stores enclosing hmk-web-combat-engine-main/ directory.'},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
current={k:sha(p.read_bytes()) for k,p in files().items()}
changed=sorted(k for k,v in current.items() if original.get(k)!=v)
assert not (set(original)-set(current))
assert 'docs/PATCH_MANIFEST_v93.764.json' in changed
assert len(changed)>=5
# Both ZIPs retain the exact relative hierarchy, with no newly created empty directory entries.
def write_zip(path,names):
 with ZipFile(path,'w',compression=ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for n in names:z.write(ROOT/n,arcname=PREFIX+n)
write_zip(FULL,sorted(current))
write_zip(PATCH,changed)
with ZipFile(FULL) as f,ZipFile(PATCH) as p,ZipFile(BASE) as b:
 assert f.testzip() is None and p.testzip() is None,'CRC failed'
 all_files={k[len(PREFIX):] for k in f.namelist() if k.startswith(PREFIX) and not k.endswith('/')}
 patch_files={k[len(PREFIX):] for k in p.namelist() if k.startswith(PREFIX) and not k.endswith('/')}
 assert all_files==set(current) and patch_files==set(changed)
 for k,h in current.items():
  have=sha(f.read(PREFIX+k))
  assert have==h,('FULL mismatch',k)
  replay=sha(p.read(PREFIX+k)) if k in patch_files else sha(b.read(PREFIX+k))
  assert replay==have,('PATCH reconstruction mismatch',k)
 for k in set(original)-patch_files:
  assert original[k]==current[k],('Nonpatch file altered',k)
report=ROOT/'docs/AUDIT_CESTOVANI_v93.764.md'
assert report.read_bytes()==REPORT.read_bytes(),'Standalone audit report differs from package.'
summary={'version':NEW,'input':BASE.name,'baseCount':len(original),'fullCount':len(current),'patchCount':len(changed),'removedCount':0,
 'integrity':'PASS (CRC, sha256 file-by-file, exact baseline + patch reconstruction, old files unchanged)',
 'full':{'filename':FULL.name,'sizeBytes':FULL.stat().st_size,'sha256':sha(FULL.read_bytes())},
 'patch':{'filename':PATCH.name,'sizeBytes':PATCH.stat().st_size,'sha256':sha(PATCH.read_bytes())},
 'audit':{'filename':REPORT.name,'sizeBytes':REPORT.stat().st_size,'sha256':sha(REPORT.read_bytes())},
 'changedFiles':changed}
(OUT/f'HMK_Keeper_Ledger_v{NEW}_INTEGRITY.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('PASS',NEW,'FULL',len(current),FULL.stat().st_size,'PATCH',len(changed),PATCH.stat().st_size,'REMOVED',0)
for x in changed:print('PATCH',x)
print('PASS CRC and byte-for-byte reconstruction from',BASE.name)
