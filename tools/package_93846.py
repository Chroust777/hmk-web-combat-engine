"""Build FULL and overlay PATCH, SHA-256 and reproducible verification.
No source files removed; the original FULL is the baseline for a content diff.
"""
from pathlib import Path
import hashlib,json,zipfile,os,sys,shutil
base=Path(__file__).resolve().parents[1]
out=Path('/mnt/data')
old=out/'HMK_v93.845_FULL.zip'
full=out/'HMK_v93.846_FULL.zip'
patch=out/'HMK_v93.845_to_v93.846_PATCH.zip'
verify=out/'HMK_v93.846_PATCH_VERIFICATION.json'
externalmanifest=out/'HMK_v93.846_SHA256_MANIFEST.txt'
evzip=out/'HMK_v93.846_TEST_EVIDENCE.zip'
manifest=base/'HMK_SHA256_MANIFEST.txt'
def sha(d):return hashlib.sha256(d).hexdigest()
def collect():
 return {str(p.relative_to(base)).replace(os.sep,'/'):p.read_bytes() for p in sorted(base.rglob('*')) if p.is_file()}
# Include the packaging script itself in the manifest (the manifest is self-excluded).
all_new=collect()
entry={k:sha(v) for k,v in all_new.items() if k!='HMK_SHA256_MANIFEST.txt'}
manifest.write_text('# HMK v93.846 full tree SHA-256 (self excluded)\n'+''.join(f'{v}  {k}\n' for k,v in sorted(entry.items())),encoding='utf-8')
new=collect()
with zipfile.ZipFile(old) as z:
 orig={p.split('/',1)[1]:z.read(p) for p in z.namelist() if p.startswith('hmk-web-combat-engine-main/') and not p.endswith('/')}
added=sorted(set(new)-set(orig));deleted=sorted(set(orig)-set(new));changed=sorted(k for k in orig.keys()&new.keys() if orig[k]!=new[k])
if deleted: raise RuntimeError(f'Deleted files forbidden: {deleted[:12]}')
rootname=base.name+'/'
with zipfile.ZipFile(patch,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for k in added+changed:z.writestr(rootname+k,new[k]);
with zipfile.ZipFile(full,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for k,v in sorted(new.items()):z.writestr(rootname+k,v)
with zipfile.ZipFile(full) as f,zipfile.ZipFile(patch) as p:
 all_full={k.split('/',1)[1]:f.read(k) for k in f.namelist() if k.startswith(rootname)}
 overlay=dict(orig)
 overlay.update({k.split('/',1)[1]:p.read(k) for k in p.namelist() if k.startswith(rootname)})
 assert set(overlay)==set(all_full),'Mismatch paths after PATCH'
 mismatched=[k for k in all_full if sha(overlay[k])!=sha(all_full[k])]
 assert not mismatched,f'Reconstruction differs {mismatched[:8]}'
 assert f.testzip() is None and p.testzip() is None,'ZIP CRC failure'
# Also ensure actual on-disk files are covered by manifest.
assert len(entry)==len(new)-1
assert all(entry[k]==sha(new[k]) for k in entry)
externalmanifest.write_bytes(manifest.read_bytes())
with zipfile.ZipFile(evzip,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted((base/'tools/evidence_93846').glob('*')):
  if f.is_file():z.write(f,'evidence/'+f.name)
 for rel in ['tools/test_93846_accident_tracking_complication.mjs','tools/browser_93846_accident_victim_pool.py','tools/build_93846_bundle.cjs','docs/HMK_v93.846_AUDIT_REPORT.md']:
  z.write(base/rel,rel)
output={'base':'HMK_v93.845_FULL.zip','full':full.name,'patch':patch.name,'added':added,'changed':changed,'deleted':deleted,
 'originalCount':len(orig),'newCount':len(new),'addedCount':len(added),'changedCount':len(changed),'deletedCount':0,
 'reconstruction':'PASS','zipCRCs':'PASS','manifestEntries':len(entry),
 'sha256':{full.name:sha(full.read_bytes()),patch.name:sha(patch.read_bytes()),externalmanifest.name:sha(externalmanifest.read_bytes())},
 'testSummary':{'newSourceAssertions':45,'newChromiumChecks':10,'travelMatrix':7869,'foragingMatrix':1539,'trackingProvisions':34,'horseAnatomy':306,'equipmentGM':38},
 'notVerified':['complete Stalking -> Tracking CF -> next Bearing -> full clicked travel', 'complete Complication Animalcraft -> delay and route change -> new interval', 'full human + ox + camel shock and injury persisted','elephant special injury table J','HTTP reload of user campaign']}
verify.write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding='utf8')
print(json.dumps({'fullMB':round(full.stat().st_size/1048576,2),'patchMB':round(patch.stat().st_size/1048576,2),'newCount':len(new),'addedCount':len(added),'changedCount':len(changed),'reconstruction':'PASS'},ensure_ascii=False))
