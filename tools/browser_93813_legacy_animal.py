"""Real Chromium: legacy stable animal health actor remains in original data,
while PC/NPC creation registry and other human-only pickers exclude it."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
raw=(root/'hmk-app.bundle.js').read_text('utf8');prefix='(()=>{const MOD=';mods,end=json.JSONDecoder().raw_decode(raw[len(prefix):])
seed=(root/'tools/browser_93806_groups.py').read_text('utf8').split("mods['app.js']+='''",1)[1].split("'''\nbundle=",1)[0]
seed+='''
window.__auditVet93813=()=>({human:require('./src/integration/hmk-character-registry-separation-93813.js').registryCharacters93813(data.characters).map(x=>x.id),all:data.characters.map(x=>({id:x.id,kind:x.kind,breed:x.hmk?.verifiedMountedBreed})),vet: data.characters.find(x=>x.id==='vet-legacy'),selected,view,stableOwnerFocusedId,minute:data.campaignClock?.minute,stored:JSON.parse(storageBaseline).campaignClock.minute, saved:localStorage.getItem(STORAGE)?.length||0,stat:require('./src/integration/hmk-character-registry-separation-93813.js').registryCounts93813(data.characters)});
window.__legacyVet93813=()=>{
 const H=require('./src/integration/persistent-combat-state.js');
 const horse={id:'vet-legacy',name:'Blesk',kind:'NPC',hmk:{verifiedMountedBreed:'palfrey',livestockBreed:'palfrey',livestockOwnerId:'a',livestockSourceId:'test:legacy:horse',attributes:{str:12,end:12,agl:12,per:12,aur:12,wil:12,rea:12,cre:12},healthState:H.initialCombatState()}};
 const key=require('./src/integration/hmk-calendar-multi-campaign.js').campaignKey(data.campaignClock);
 data.characters.push(horse);data.campaignClock.characterIds.push(horse.id);
 // Existing stable animal registration evidence: legacy source of the NPC.
 data.journal.push({id:'legacy-horse-registered',characterId:'a',calendarCampaignId:key,campaignMinute:data.campaignClock.minute,createdAt:stamp(),title:'Stáj · historický zdravotní záznam',body:'Zvíře Blesk',animalHealthRegistration93759:{format:'hmk-stable-health-registration-93759-v1',animalId:horse.id,ownerId:'a',beastId:'test:legacy:horse',breed:'palfrey',campaignId:key,minute:data.campaignClock.minute,gmConfirmed:true,examinedHealthy:true,examNote:'Historická kontrola'}});
 selected='a';view='characters';render();return window.__auditVet93813();
};
window.__goVet93813=(target)=>{if(target==='registry'){view='characters';selected='a';}else if(target==='skills'){view='skills';selected='vet-legacy';}else if(target==='library'){view='library';libraryTab='melee';selected='vet-legacy';}else if(target==='travel'){view='calendar';activeCalendarSection='travel';calendarLanding=false;selected='vet-legacy';}else if(target==='membership'){view='calendar';activeCalendarSection='members';calendarLanding=false;selected='a';}else if(target==='creation'){view='creation';selected='vet-legacy';}render();return window.__auditVet93813();};
window.__historicalUnchanged93813=()=>{const x=character('vet-legacy');return !!x&&x.kind==='NPC'&&x.hmk.verifiedMountedBreed==='palfrey'&&x.hmk.healthState?.shock==='NONE'&&data.campaignClock.characterIds.includes(x.id)&&data.journal.some(j=>j.id==='legacy-horse-registered')};
'''
mods['app.js']+=seed
bundle=prefix+json.dumps(mods,ensure_ascii=False,separators=(',',':'))+raw[len(prefix)+end:]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':960});page.set_default_timeout(15000)
 errors=[];dialogs=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const s=new Map(),o={getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,String(v)),removeItem:k=>s.delete(k),key:i=>[...s.keys()][i]??null,get length(){return s.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:o});Object.defineProperty(window,'sessionStorage',{configurable:true,value:o});}''')
 for css in ['styles.css','book-templates.css','skill-workbench.css','library.css','hmk-global-ui-93741.css']:
  page.add_style_tag(content=(root/css).read_text('utf8'))
 page.add_script_tag(content=bundle)
 page.evaluate('window.__seedRows93772()')
 details=page.evaluate('window.__legacyVet93813()');print('VET DATA',str(details)[:700],flush=True)
 assert len(details['all'])==4 and details['stat']=={'people':3,'animals':1},details
 assert page.locator('article.character-card').count()==3,page.locator('article.character-card').count()
 assert page.locator('article.character-card').filter(has_text='Blesk').count()==0
 assert page.locator('.castle-character').count()==3
 print('STATS HTML',page.locator('.registry-stats').inner_text(),'BROWSER ERRORS',errors,flush=True)
 assert 'rozpracovaná tvorba' in page.locator('.registry-stats').inner_text().lower()
 assert page.locator('.registry-stats').inner_text().lower().split('rozpracovaná tvorba')[-1].strip().startswith('3')
 assert page.evaluate('window.__historicalUnchanged93813()')
 # Skill picker chooses an actual person, never the legacy veterinary NPC.
 state=page.evaluate('window.__goVet93813("skills")');print('SKILLS',state['selected'],state['view'],flush=True)
 assert state['selected']!='vet-legacy',state
 # Library procurement always offers people, not veterinary avatars.
 page.evaluate('window.__goVet93813("library")')
 opts=page.locator('form.library-assign select[name=recipientId] option').all_text_contents()
 print('LIBRARY OPTIONS',opts[:8],flush=True)
 assert opts and not any('Blesk' in o for o in opts),opts[:30]
 # Campaign member management: already-included horse appears in the *animal*
 # section and stays checked, which protects its historical medical membership.
 page.evaluate('window.__goVet93813("membership")')
 body=page.locator('body').inner_text()
 print('MEMBER BODY TAIL',body[-1050:],flush=True)
 assert 'Zvířata / historické zdravotní profily' in body
 assert page.locator('fieldset').filter(has_text='Zvířata / historické zdravotní profily').locator('input[value="vet-legacy"]').is_checked()
 assert not page.locator('fieldset').filter(has_text='Zahrnuté postavy').locator('input[value="vet-legacy"]').count()
 # Old creation route recovers to owner or safe registry, not horse's 14 steps.
 state=page.evaluate('window.__goVet93813("creation")')
 print('CREATION LEGACY ROUTE',state['view'],state['selected'],flush=True)
 assert state['selected']!='vet-legacy',state
 # Compatibility: veterinary profile stays in canonical data, health and clock.
 assert page.evaluate('window.__historicalUnchanged93813()')
 assert not errors,errors
 print('PASS Chromium v93.813: registry/sidenav counts, skill picker, library purchase options, calendar membership, legacy creation route, historical animal health actor immutable and available.',flush=True)
 b.close()
