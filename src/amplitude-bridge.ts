import * as amplitude from '@amplitude/unified';
import {read,type State,experience} from './model';

export function audience(s:State){return {traveller_type:s.persona,member_status:s.loggedIn?'Member':'Guest',home_airport:s.search.from,preferred_destination:s.search.to,booking_count:s.bookings.length,demo_environment:true,data_source:'website',qa_preview:experience(s).qa||s.settings.mvt!=='off'||s.settings.personalisation||s.settings.status==='published'||s.settings.holdback!=='auto',experiment_provider:s.settings.experimentProvider}}
export function identifyAmplitude(s:State){
  amplitude.setUserId('webjet-demo-'+s.visitorId);
  const identity=new amplitude.Identify();
  for(const [k,v] of Object.entries(audience(s)))identity.set(k,v);
  amplitude.identify(identity);
}
export function startAmplitude(record:(event:string,properties:Record<string,unknown>)=>void){
  const initial=read();
  amplitude.add({name:'webjet-context',type:'enrichment',setup:async()=>{},execute:async event=>{
    event.event_properties={...audience(read()),page_name:new URLSearchParams(location.search).get('page')||'home',...event.event_properties};
    record(event.event_type,{...event.event_properties,source:'Amplitude SDK'});
    return event;
  }});
  return amplitude.initAll(initial.settings.apiKey,{
    analytics:{userId:'webjet-demo-'+initial.visitorId,autocapture:{pageViews:{trackHistoryChanges:'all'},sessions:true,attribution:true,elementInteractions:false,fileDownloads:false,formInteractions:false},identityStorage:'localStorage',flushIntervalMillis:1000},
    sessionReplay:{sampleRate:initial.settings.replay?1:0,privacyConfig:{defaultMaskLevel:'medium',maskSelector:['[data-private]']}},
    engagement:{skip:!initial.settings.guides}
  }).then(()=>identifyAmplitude(read())).catch(()=>{record('Amplitude setup unavailable',{source:'local diagnostics'})});
}
export function trackAmplitude(event:string,properties:Record<string,unknown>){amplitude.track(event,properties)}

export function flushAmplitude(){return amplitude.flush().promise}
