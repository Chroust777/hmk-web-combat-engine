"""43 documented v93.760 regression suites. Never overwrite older audit evidence."""
import concurrent.futures,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
PREFIXES=('test_93734_','test_93735_','test_93736_','test_93738_','test_93739_','test_93740_','test_93741_','test_93742_','test_93744_','test_93745_','test_93746_','test_93748_','test_93749_','test_93750_','test_93751_','test_93752_','test_93753_','test_93755_','test_93756_','test_93757_','test_93758_','test_93759_','test_93760_','test_93761_','test_93762_','test_93763_')
files=sorted(p for p in (root/'tools').glob('test_937*') if p.suffix in ('.cjs','.mjs') and p.name.startswith(PREFIXES))
def run(file):
 try:
  p=subprocess.run(['node',str(file)],cwd=root,capture_output=True,text=True,timeout=75)
  return {'script':str(file.relative_to(root)),'status':'PASS' if p.returncode==0 else 'FAIL','exitCode':p.returncode,'tail':(p.stdout+'\n'+p.stderr)[-1600:]}
 except subprocess.TimeoutExpired as e:
  return {'script':str(file.relative_to(root)),'status':'TIMEOUT','exitCode':None,'tail':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: rows=list(pool.map(run,files))
(root/'docs/AUDIT_v93.763_regression_results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
for row in rows:print(row['status'],row['script'],row['tail'].strip().split('\n')[-1][-100:])
print('TOTAL',len(rows),'PASS',sum(x['status']=='PASS' for x in rows),'FAIL',sum(x['status']=='FAIL' for x in rows),'TIMEOUT',sum(x['status']=='TIMEOUT' for x in rows))
if any(x['status']!='PASS' for x in rows):raise SystemExit(1)
