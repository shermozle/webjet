import {startAmplitude,identifyAmplitude,trackAmplitude} from './amplitude-bridge';
import {StatsigClient} from '@statsig/js-client';
import {StatsigAutoCapturePlugin} from '@statsig/web-analytics';
import {read, type State, experience} from './model';

export type LogEntry = {event:string;properties:Record<string,unknown>;time:string};
export const log:LogEntry[] = [];
export const connection = {message:'Local rehearsal — add a Statsig public client key to connect.', connected:false};
let client:StatsigClient|undefined;
const decisions = new Map<string,string>();
const initial = read();
const isQA = (s:State) => experience(s).qa || s.settings.mvt !== 'off' || s.settings.personalisation || s.settings.status === 'published' || s.settings.holdback !== 'auto';
const audience = (s:State) => ({traveller_type:s.persona,member_status:s.loggedIn?'Member':'Guest',home_airport:s.search.from,preferred_destination:s.search.to,booking_count:s.bookings.length,demo_environment:true,data_source:'website',experiment_provider:s.settings.experimentProvider,qa_preview:isQA(s)});
const user = (s:State) => ({userID:'webjet-demo-'+s.visitorId,custom:audience(s)});
function record(event:string, properties:Record<string,unknown>){
  log.unshift({event,properties,time:new Date().toLocaleTimeString()});log.splice(80);
  window.dispatchEvent(new Event('webjet-event'));
}
const amplitudeReady = startAmplitude(record);
const statsigReady = (async()=>{
  if(!initial.settings.statsigKey.startsWith('client-'))return;
  client = new StatsigClient(initial.settings.statsigKey,user(initial),{
    environment:{tier:initial.settings.statsigEnvironment},
    loggingEnabled:'browser-only',
    plugins:[new StatsigAutoCapturePlugin({eventFilterFunc:event=>{
      const allowed = ['auto_capture::page_view','auto_capture::page_view_end','auto_capture::session_start','auto_capture::web_vitals'].includes(event.eventName);
      if(allowed&&!isQA(read()))record(event.eventName,{...event.metadata,source:'Statsig autocapture'});
      return allowed&&!isQA(read());
    }})],
  });
  client.on('initialization_failure',()=>{connection.message='Statsig initialization failed — using local fallback.';connection.connected=false;});
  try {
    await client.initializeAsync({timeoutMs:3000});
    connection.connected=client.getContext().values !== null;
    connection.message=connection.connected?'Statsig initialized. Confirm received events in the console.':'Statsig unavailable — local rehearsal remains usable.';
  }catch{connection.message='Statsig unavailable — local rehearsal remains usable.';}
  window.dispatchEvent(new Event('webjet-event'));
})();
export const ready=Promise.all([amplitudeReady,statsigReady]);
export function identify(s:State){
  identifyAmplitude(s);
  if(!client)return;
  decisions.clear();
  void client.updateUserAsync(user(s)).catch(()=>{});
}
export function track(event:string,properties:Record<string,unknown>={}){
  const s=read();
  const props={...audience(s),page_name:new URLSearchParams(location.search).get('page')||'home',product_type:'Flights',destination:s.search.to,origin:s.search.from,trip_type:s.search.trip,travellers:s.search.travellers,currency:'AUD',...properties};
  trackAmplitude(event,props);
  const send=!!client&&!isQA(s);
  record(event,{...props,delivery:send?'Amplitude + Statsig queued':'Amplitude queued; Statsig excluded/unconfigured'});
  if(!send)return;
  const metadata=Object.fromEntries(Object.entries(props).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]));
  const value=typeof properties.revenue==='number'?properties.revenue:undefined;
  client!.logEvent({eventName:event,value,metadata});
  void client!.flush().catch(()=>{});
}
export function feature(key:string,fallback:string){
  if(initial.settings.experimentProvider!=='statsig'||!client||isQA(read()))return fallback;
  if(decisions.has(key))return decisions.get(key)!;
  const result=client.getExperiment(key);
  const variant=result.get('banner',fallback);
  decisions.set(key,variant);
  record('Statsig experiment evaluated',{experiment:key,group:result.groupName,variant,reason:result.details.reason});
  return variant;
}
