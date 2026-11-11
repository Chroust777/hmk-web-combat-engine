"""Build v93.835 FULL, PATCH, SHA256, then check original FULL+PATCH == new FULL.

Run only after source bundle/build/test verification, with original user ZIP intact.
Does not delete, mutate, or rewrite any non-release source files.
"""
from __future__ import annotations
import hashlib, json, pathlib, shutil, zipfile
from datetime import datetime, timezone

base=pathlib.Path('/mnt/data/hmk-web-combat-engine-main_11_11_20267.zip')
root=pathlib.Path(__file__).resolve().parents[1]
out=pathlib.Path('/mnt/data')
full_zip=out/'HMK_v93.835_FULL.zip'
patch_zip=out/'HMK_v93.834_to_v93.835_PATCH.zip'
manifest_rel='tools/HMK_v93.835_SHA256_MANIFEST.txt'
verification_rel='tools/HMK_v93.835_PATCH_VERIFICATION.json'
prefix=root.name+'/'
sha=lambda b:hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(base) as old:
 if old.testzip() is not None:raise AssertionError('Original FULL archive CRC FAILED')
 original={n[len(prefix):]:old.read(n) for n in old.namelist() if n.startswith(prefix) and not n.endswith('/')}
 if len(original)!=1338:raise AssertionError('Unexpected original archive count '+str(len(original)))

def load_files():
 return {p.relative_to(root).as_posix():p.read_bytes() for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts}

def tree_hash(files):
 dig=hashlib.sha256()
 for name,blob in sorted(files.items()):
  dig.update(name.encode('utf8')+b'\0'+hashlib.sha256(blob).digest()+b'\n')
 return dig.hexdigest()

pre=load_files()
for p in [manifest_rel,verification_rel]:pre.pop(p,None)
removed=sorted(set(original)-set(pre))
if removed:raise AssertionError('Release must not delete original files: '+str(removed[:20]))
changed={p:b for p,b in pre.items() if original.get(p)!=b}
added=sorted(set(changed)-set(original));modified=sorted(set(changed)&set(original))
overlay={**original,**changed}
if overlay!=pre:raise AssertionError('Preflight delta mismatch')
verification={
 'format':'HMK-v93.835-release-archive-validation-v1',
 'from':'v93.834', 'to':'v93.835',
 'original_full_sha256':sha(base.read_bytes()),
 'original_full_files':len(original),'new_full_files_without_release_metadata':len(pre),
 'added_files_without_release_metadata':added,'modified_files':modified,'removed_files':removed,
 'verified_precursor_tree_sha256':tree_hash(pre),
 'overlay_before_release_metadata_sha256':tree_hash(overlay),
 'comparison':'PRECHECK_PASS original file bytes plus change set match new complete source tree, exact SHA256 for every file',
 'manifest_exclusion':'tools/HMK_v93.835_SHA256_MANIFEST.txt excludes its own SHA256 to avoid self-reference',
 'full_plus_patch_rule':'unzip original FULL; overlay PATCH; compare every resulting path/file SHA256 with unzipped new FULL; no deleted paths',
 'status':'PASS checked by this reproducible builder after archive construction'
}
(root/verification_rel).write_text(json.dumps(verification,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf8')
pre=load_files();pre.pop(manifest_rel,None)
manifest=['# HMK v93.835 SHA-256 file manifest', '# All files under '+root.name+' except this manifest itself', '# Format: SHA256  relative/path', '']
manifest.extend(sha(blob)+'  '+name for name,blob in sorted(pre.items()))
(root/manifest_rel).write_text('\n'.join(manifest)+'\n',encoding='utf8')
current=load_files()
changed={p:b for p,b in current.items() if original.get(p)!=b}
added=sorted(set(changed)-set(original));modified=sorted(set(changed)&set(original))
assert not set(original)-set(current)
# Write every file including unchanged original files, preserving path within the repository.
for filename,files in ((full_zip,current),(patch_zip,changed)):
 with zipfile.ZipFile(filename,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for name,blob in sorted(files.items()):
   z.writestr(prefix+name,blob,compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
# Independent ZIP CRC and cryptographic contents verification.
with zipfile.ZipFile(full_zip) as f,zipfile.ZipFile(patch_zip) as p:
 assert f.testzip() is None and p.testzip() is None
 full={n[len(prefix):]:f.read(n) for n in f.namelist() if n.startswith(prefix) and not n.endswith('/')}
 patch={n[len(prefix):]:p.read(n) for n in p.namelist() if n.startswith(prefix) and not n.endswith('/')}
 applied={**original,**patch}
 assert full==applied==current,'original FULL+PATCH is not byte-identical to target FULL tree'
 assert len(patch)==len(changed)
 for name,blob in current.items():assert sha(blob)==sha(applied[name]),name
 manifest_lines=(root/manifest_rel).read_text('utf8').splitlines()
 verified_manifest=0
 for line in manifest_lines:
  if line.startswith('#') or not line:continue
  digest,name=line.split('  ',1)
  assert name!=manifest_rel
  assert name in full and sha(full[name])==digest,name
  verified_manifest+=1
 assert verified_manifest==len(current)-1
output={
 'status':'PASS','original_full_crc':'PASS','new_full_crc':'PASS','patch_crc':'PASS',
 'original_full_files':len(original),'new_full_files':len(full),'patch_files':len(patch),
 'added_files':added,'modified_files':modified,'removed_files':[],
 'full_plus_patch_tree_equivalence':'PASS byte-for-byte comparison across all files',
 'target_tree_sha256':tree_hash(full),
 'manifest_verified_files':verified_manifest,
 'archives':{
  'original_sha256':sha(base.read_bytes()),
  'full_sha256':sha(full_zip.read_bytes()),
  'patch_sha256':sha(patch_zip.read_bytes())
 }
}
(out/'HMK_v93.835_PATCH_VERIFICATION.json').write_text(json.dumps(output,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf8')
shutil.copyfile(root/'docs/AUDIT_v93.835_STANDALONE_FORAGING.md',out/'HMK_v93.835_AUDIT_REPORT.md')
print(json.dumps({k:v for k,v in output.items() if k not in ('archives','modified_files','added_files')},ensure_ascii=False,indent=2))
print('FILES:',full_zip,patch_zip,out/'HMK_v93.835_AUDIT_REPORT.md')
