"""Full/PATCH packager for v93.844. Usage: python tools/package_93844.py [prior-full.zip] [output-dir]
Preserves original entries, prohibits deletions, checks exact reconstruction by SHA256.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
from datetime import datetime, timezone
import sys,json,shutil
ROOT=Path(__file__).resolve().parents[1]
OLD=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data/HMK_v93.843_FULL.zip')
OUT=Path(sys.argv[2] if len(sys.argv)>2 else '/mnt/data')
ROOTNAME=ROOT.name+'/'
OUT.mkdir(parents=True,exist_ok=True)
FULL=OUT/'HMK_v93.844_FULL.zip'; PATCH=OUT/'HMK_v93.843_to_v93.844_PATCH.zip'
MANIFEST=ROOT/'HMK_SHA256_MANIFEST.txt'
def digest(b): return sha256(b).hexdigest()
def current():return {p.relative_to(ROOT).as_posix():p for p in ROOT.rglob('*') if p.is_file()}
# Ensure internal canonical manifest is built from the COMPLETE new tree; exclude itself.
MANIFEST.write_text('\n'.join(f'{digest(p.read_bytes())}  {rel}' for rel,p in sorted(current().items()) if rel!='HMK_SHA256_MANIFEST.txt')+'\n',encoding='utf8')
new=current()
with ZipFile(OLD) as zipin:
 if zipin.testzip() is not None:raise RuntimeError('Prior FULL has bad CRC')
 before={i.filename[len(ROOTNAME):]:digest(zipin.read(i.filename)) for i in zipin.infolist() if not i.is_dir() and i.filename.startswith(ROOTNAME)}
 if len(before)!=len([i for i in zipin.infolist() if not i.is_dir()]):raise RuntimeError('Prior FULL has unexpected path')
 after={rel:digest(p.read_bytes()) for rel,p in sorted(new.items())}
 removed=sorted(set(before)-set(after))
 if removed:raise RuntimeError('Original file(s) removed: '+', '.join(removed))
 modified=sorted(r for r in before if before[r]!=after[r])
 added=sorted(set(after)-set(before))
 changes=modified+added
 with ZipFile(PATCH,'w',compression=ZIP_DEFLATED,compresslevel=6) as zout:
  for rel in sorted(changes):zout.write(new[rel],ROOTNAME+rel)
 with ZipFile(FULL,'w',compression=ZIP_DEFLATED,compresslevel=6) as zout:
  for rel in sorted(new):zout.write(new[rel],ROOTNAME+rel)
# 100% content reconstruction using hashes from old full and bytes from patch.
with ZipFile(PATCH) as zpatch, ZipFile(FULL) as zfull:
 badpatch=zpatch.testzip();badfull=zfull.testzip()
 if badpatch or badfull:raise RuntimeError(f'Bad ZIP CRC {badpatch},{badfull}')
 patchRows={i.filename[len(ROOTNAME):]:digest(zpatch.read(i.filename)) for i in zpatch.infolist() if not i.is_dir()}
 if set(patchRows)!=set(changes):raise RuntimeError('Unexpected patch content')
 rebuilt={**before,**patchRows}
 actual={i.filename[len(ROOTNAME):]:digest(zfull.read(i.filename)) for i in zfull.infolist() if not i.is_dir()}
 mismatches={k:(rebuilt.get(k),actual.get(k)) for k in set(rebuilt)|set(actual) if rebuilt.get(k)!=actual.get(k)}
 if mismatches:raise RuntimeError('Reconstruction failure: '+str(mismatches))
 # Every internal manifest line reflects file contents, excluding itself.
 inner=zfull.read(ROOTNAME+'HMK_SHA256_MANIFEST.txt').decode()
 lines=dict((row.split('  ',1)[1],row.split('  ',1)[0]) for row in inner.strip().splitlines())
 if set(lines)!=set(actual)-{'HMK_SHA256_MANIFEST.txt'}:raise RuntimeError('Manifest filenames incomplete')
 if any(lines[k]!=actual[k] for k in lines):raise RuntimeError('Manifest SHA mismatch')
manifest_out=OUT/'HMK_v93.844_SHA256_MANIFEST.txt'
shutil.copyfile(MANIFEST,manifest_out)
report={
 'status':'PASS','from_version':'93.843','to_version':'93.844',
 'source_zip':OLD.name,'full_zip':FULL.name,'patch_zip':PATCH.name,
 'old_count':len(before),'new_count':len(after),'changed_count':len(changes),
 'added_count':len(added),'modified_count':len(modified),
 'modified_paths':modified,'added_paths':added,'removed_paths':removed,
 'reconstructed_sha256_match_count':len(actual),'reconstructed_sha256_mismatch_count':len(mismatches),
 'full_sha256':digest(FULL.read_bytes()),'patch_sha256':digest(PATCH.read_bytes()),
 'manifest_sha256':digest(manifest_out.read_bytes()),
 'zip_testzip':{'source':'PASS','patch':'PASS','full':'PASS'},
 'browser_testing':'Isolated Chromium with production bundle; real clicks. HTTP reload not verified.',
 'tested_cases':['F four 60min confirmed repair activities','CF four 60min failed repair activities',
 'early Pochod blocked in GUI, cancel keeps campaign untouched','persisted state reopened after one 60min work interval',
 'repair S/CS and ignore/abandon regression'],
 'known_limitations':['Actual user GitHub Pages HTTP reload blocked/not performed',
 'All concurrent-group, midnight and health branches not exhaustively checked',
 'Legacy version-stamped tests targeting older APP_VERSION were skipped, not treated as PASS'],
}
(OUT/'HMK_v93.844_PATCH_VERIFICATION.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('PASS package v93.844:',len(before),'prior,',len(after),'new,',len(modified),'modified,',len(added),'added,',len(changes),'patch files; 0 removed; 0 SHA mismatches')
print('FULL',FULL,'bytes',FULL.stat().st_size)
print('PATCH',PATCH,'bytes',PATCH.stat().st_size)
