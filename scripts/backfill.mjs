import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const config=JSON.parse(fs.readFileSync(path.join(root,'data/experiment.json'),'utf8'));
const hash=(v)=>createHash('sha256').update(v).digest('hex');
const fraction=(v)=>parseInt(hash(v).slice(0,8),16)/0x100000000;
export function generate(c=config){
 const events=[],counts={}; const start=Date.parse(c.start),end=Date.parse(c.end);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Invalid date range');
 if(!Number.isInteger(c.usersPerVariant)||c.usersPerVariant<1)throw Error('Invalid user count');
 for(const [variant,rates]of Object.entries(c.variants)){
  if(rates.bookingRate>rates.checkoutRate)throw Error('Booking rate exceeds checkout rate');
  const users=Array.from({length:c.usersPerVariant},(_,i)=>({i,rank:fraction(`${c.batchId}:${variant}:${i}:rank`)})).sort((a,b)=>a.rank-b.rank);
  const bookings=Math.round(c.usersPerVariant*rates.bookingRate),checkouts=Math.round(c.usersPerVariant*rates.checkoutRate);
  counts[variant]={users:c.usersPerVariant,checkouts,bookings,bookingRate:bookings/c.usersPerVariant};
  users.forEach(({i},rank)=>{
   const uid=`${c.batchId}-${variant}-${i.toString().padStart(5,'0')}`;
   const session=Math.floor(start+fraction(uid+':time')*(end-start-45*60_000));
   const destination=['Melbourne (MEL)','Gold Coast (OOL)','Brisbane (BNE)','Bali (DPS)'][Math.floor(fraction(uid+':destination')*4)];
   const persona=['New visitor','Family planner','Frequent flyer','Deal seeker'][Math.floor(fraction(uid+':persona')*4)];
   const total=Math.round((250+fraction(uid+':value')*900)*100)/100;
   const props={synthetic:true,data_source:'experiment_backfill',demo_batch:c.batchId,qa_preview:false,product_type:'Flights',page_name:'home',destination,origin:'Sydney (SYD)',trip_type:'Return',travellers:persona==='Family planner'?4:1,currency:'AUD',traveller_type:persona};
   let seq=0;
   const emit=(type,offset,extra={},pg='home')=>{events.push({user_id:uid,device_id:uid+'-device',event_type:type,time:session+offset,session_id:session,insert_id:hash(`${uid}:${seq++}:${type}`),platform:'Web',country:'Australia',user_properties:{traveller_type:persona,member_status:persona==='Frequent flyer'?'Member':'Guest',home_airport:'Sydney (SYD)',preferred_destination:destination,synthetic:true,data_source:'experiment_backfill',demo_batch:c.batchId,[`[Experiment] ${c.flagKey}`]:variant},event_properties:{...props,page_name:pg,...extra}})};
   // Historical copies of automatic events, never emitted manually by the site.
   emit('session_start',0);
   emit('[Amplitude] Page Viewed',100,{'[Amplitude] Page Title':'Flights & travel deals | Webjet Demo','[Amplitude] Page URL':c.siteUrl+'?page=home','[Amplitude] Page Path':'/'});
   emit('$impression',800,{flag_key:c.flagKey,variant,...(c.experimentKey?{experiment_key:c.experimentKey}:{})});
   if(rank<Math.round(c.usersPerVariant*.48)){
    emit('Banner Clicked',15000,{banner_id:'landing-hero',campaign_name:'Your next adventure'});
    emit('Flight Search Submitted',35000);
    emit('[Amplitude] Page Viewed',38000,{'[Amplitude] Page URL':c.siteUrl+'?page=results'},'results');
   }
   if(rank<Math.round(c.usersPerVariant*.32))emit('Flight Selected',85000,{flight_id:'va819',airline:'Virgin Australia',fare:139},'results');
   if(rank<checkouts){
    if(fraction(uid+':extra')<.43)emit('Travel Extra Updated',120000,{extra_type:'baggage',action:'added',price:35},'extras');
    emit('Checkout Started',160000,{booking_value:total},'extras');
    emit('[Amplitude] Page Viewed',165000,{'[Amplitude] Page URL':c.siteUrl+'?page=checkout'},'checkout');
   }
   if(rank<bookings){
    emit('Traveller Details Submitted',240000,{traveller_count:props.travellers},'checkout');
    emit('Payment Submitted',330000,{booking_value:total,payment_method:'Demo payment'},'checkout');
    emit('Booking Completed',332000,{booking_id:'WJ-'+hash(uid).slice(0,8).toUpperCase(),booking_value:total,revenue:total,payment_method:'Demo payment',airline:'Virgin Australia'},'checkout');
    emit('[Amplitude] Page Viewed',334000,{'[Amplitude] Page URL':c.siteUrl+'?page=confirmation'},'confirmation');
   }else if(rank<bookings+Math.round(checkouts*.015))emit('Payment Failed',300000,{failure_reason:'Simulated decline',booking_value:total},'checkout');
   emit('session_end',40*60_000);
  });
 }
 events.sort((a,b)=>a.time-b.time||a.insert_id.localeCompare(b.insert_id));
 return {events,summary:{synthetic:true,batchId:c.batchId,start:c.start,end:c.end,eventCount:events.length,counts,relativeLift:counts.treatment.bookingRate/counts.control.bookingRate-1,absoluteLift:counts.treatment.bookingRate-counts.control.bookingRate}};
}
async function main(){
 const {events,summary}=generate();const dir=path.join(root,'data/generated');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'experiment-events.ndjson'),events.map(e=>JSON.stringify(e)).join('\n')+'\n');
 fs.writeFileSync(path.join(root,'data/experiment-summary.json'),JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify(summary,null,2));
 if(!process.argv.includes('--send')){console.log('Dry run only. Add --send to ingest into project 915629.');return}
 if(Date.parse(config.end)>Date.now())throw Error('Refusing future-dated backfill');
 const receiptPath=path.join(dir,'ingestion-receipt.json');
 let receipt=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath,'utf8')):{batchId:config.batchId,configHash:hash(JSON.stringify(config)),accepted:0,batches:[]};
 if(receipt.configHash!==hash(JSON.stringify(config)))throw Error('Configuration changed after sending. Use a new batch ID and archive the old receipt first.');
 if(receipt.accepted===events.length){console.log('Already ingested this exact batch; no events sent.');return}
 const key=process.env.AMPLITUDE_API_KEY||config.apiKey;
 for(let i=receipt.accepted;i<events.length;i+=400){
  const batch=events.slice(i,i+400);let response;
  for(let attempt=0;attempt<5;attempt++){
   response=await fetch('https://api2.amplitude.com/2/httpapi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:key,events:batch}),signal:AbortSignal.timeout(30000)});
   if(response.ok)break;
   if(response.status!==429&&response.status<500)break;
   await new Promise(r=>setTimeout(r,Math.min(1000*2**attempt,16000)));
  }
  const payload=await response.json();
  if(!response.ok||payload.events_ingested!==batch.length)throw Error(`Batch at ${i} failed: ${JSON.stringify(payload)}`);
  receipt.accepted=i+batch.length;receipt.batches.push({offset:i,count:batch.length,status:response.status,serverUploadTime:payload.server_upload_time});receipt.updatedAt=new Date().toISOString();
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  if(i%4000===0||receipt.accepted===events.length)console.log(`Accepted ${receipt.accepted}/${events.length}`);
 }
 console.log(`Complete. Receipt: ${receiptPath}`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1});
