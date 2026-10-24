/** Read-only visibility derived from the existing authoritative Combat State.
 * Any character can suffer a hazard; profession, folk and skill never gate it.
 * Combat injuries, trauma, Psyche and starvation remain visible in their own
 * existing sections and must not spuriously expose an unrelated hazard form.
 */
export function characterHazardAccess(state){
 const s=state&&typeof state==='object'?state:{};
 const ev=Array.isArray(s.events)?s.events:[];
 const resolved=new Set(ev.map(e=>e?.id));
 const smoke=ev.some(e=>e?.type==='mundane-smoke-start'&&
   typeof e.id==='string'&&!resolved.has(e.id+':complete'));
 const poison=Array.isArray(s.toxinCourses)&&s.toxinCourses.some(c=>['incubating','active'].includes(c?.status));
 const disease=Array.isArray(s.diseaseCourses)&&s.diseaseCourses.some(c=>['pending-profile','incubating','active'].includes(c?.status));
 const sequelae=Array.isArray(s.ailmentSequelae)&&s.ailmentSequelae.some(c=>c?.active===true);
 const sleep=s.sleepDeprivation?.status==='awake';
 const asphyxia=s.asphyxiaComaPending?.active===true;
 return {active:Boolean(smoke||poison||disease||sequelae||sleep||asphyxia),smoke:Boolean(smoke),
   poison:Boolean(poison),disease:Boolean(disease),sequelae:Boolean(sequelae),sleep:Boolean(sleep),asphyxia:Boolean(asphyxia)};
}
