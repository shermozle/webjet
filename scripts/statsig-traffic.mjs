import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {StatsigClient,LogLevel} from '@statsig/js-client';

export const config=JSON.parse(await readFile(new URL('../data/statsig-synthetic-config.json',import.meta.url),'utf8'));
export const uniform=(id,salt)=>createHash('sha256').update(`${id}:${salt}`).digest().readUInt32BE(0)/2**32;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function profile(userID){
  const personas=['New visitor','Family planner','Frequent flyer','Deal seeker'];
  const index=Math.floor(uniform(userID,'persona')*4);
  return {userID,custom:{traveller_type:personas[index],member_status:index===2?'Member':'Guest',home_airport:'Sydney (SYD)',preferred_destination:['Melbourne (MEL)','Gold Coast (OOL)','Brisbane (BNE)','Perth (PER)','Bali (DPS)'][Math.floor(uniform(userID,'destination')*5)],booking_count:0,demo_environment:true,synthetic:true,data_source:config.source,experiment_provider:'statsig',qa_preview:false},country:'AU'};
}
export function journey(userID,banner,runID){
  if(!['control','value'].includes(banner))throw new Error('Unrecognized banner assignment');
  const person=profile(userID);
  const rates={'New visitor':.17,'Family planner':.19,'Frequent flyer':.26,'Deal seeker':.18};
  const checkoutRate=rates[person.custom.traveller_type]+(banner==='value'?.02:0);
  const intent=uniform(userID,'intent');
  const value=Math.round((180+uniform(userID,'fare')*1050)*100)/100;
  const metadata={...person.custom,synthetic_run_id:runID,synthetic_experiment:config.experiment,simulation_label:config.label,origin:'Sydney (SYD)',destination:person.custom.preferred_destination,product_type:'Flights',trip_type:'Return',travellers:1,currency:'AUD',booking_value:value,page_url:config.siteUrl};
  const events=[];
  const add=(eventName,page_name,extra={})=>events.push({eventName,...(eventName==='Booking Completed'?{value}:{}),metadata:Object.fromEntries(Object.entries({...metadata,page_name,...extra,synthetic_event_id:createHash('sha256').update(`${userID}:${eventName}`).digest('hex')}).map(([k,v])=>[k,String(v)]))});
  if(intent<.64+(banner==='value'?.02:0))add('Flight Search Submitted','home');
  if(intent<.38+(banner==='value'?.02:0))add('Flight Selected','results',{airline:['Qantas','Virgin Australia','Jetstar'][Math.floor(uniform(userID,'airline')*3)]});
  if(intent<checkoutRate){
    add('Checkout Started','extras');
    const booked=uniform(userID,'complete')<(banner==='value'?.42:.40);
    const failed=uniform(userID,'failure')<.02;
    if(booked||failed||uniform(userID,'details')<.7)add('Traveller Details Submitted','checkout',{traveller_count:1});
    if(failed)add('Payment Failed','checkout',{failure_reason:'Synthetic test decline'});
    if(booked){
      add('Payment Submitted','checkout',{payment_method:'Synthetic demo payment'});
      add('Booking Completed','checkout',{booking_id:`SYN-${userID}`,revenue:value,payment_method:'Synthetic demo payment'});
    }
  }
  return events;
}
export function validateWindow(now=Date.now()){
  if(now>=Date.parse(config.stopAt))throw new Error(`Traffic window closed at ${config.stopAt}; no events sent.`);
}
export async function run({send=false,users=config.usersPerRun,runID=`local-${Date.now()}`}={}){
  if(!Number.isInteger(users)||users<1||users>config.maxUsersPerRun)throw new Error(`users must be between 1 and ${config.maxUsersPerRun}`);
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(runID))throw new Error('Invalid run ID');
  if(send)validateWindow();
  const report={experiment:config.experiment,synthetic:true,mode:send?'live SDK':'dry run',runID,startedAt:new Date().toISOString(),stopAt:config.stopAt,users:0,queuedBusinessEvents:0,acceptedBusinessEvents:0,acceptedExposureUsers:0,groups:{control:{users:0,checkouts:0,bookings:0,failures:0},value:{users:0,checkouts:0,bookings:0,failures:0}}};
  const acceptedEvents=new Set(),acceptedExposures=new Set();
  let client;
  try{
    if(send){
      client=new StatsigClient(config.clientKey,profile(`webjet-synthetic-${runID}-0`),{loggingEnabled:'always',disableStorage:true,disableStableID:true,environment:{tier:'production'},logLevel:LogLevel.Error,loggingIntervalMs:1000});
      client.on('logs_flushed',({events})=>{
        for(const event of events){
          if(event.metadata?.synthetic_run_id===runID&&event.metadata?.synthetic_event_id)acceptedEvents.add(event.metadata.synthetic_event_id);
          if(event.eventName==='statsig::config_exposure'&&event.user?.userID?.startsWith(`webjet-synthetic-${runID}-`))acceptedExposures.add(event.user.userID);
        }
      });
      await client.initializeAsync({timeoutMs:10000});
    }
    for(let i=0;i<users;i++){
      if(send)validateWindow();
      const id=`webjet-synthetic-${runID}-${i}`;
      let banner=i%2?'value':'control';
      if(client){
        if(i>0)await client.updateUserAsync(profile(id),{timeoutMs:10000});
        let assigned;
        // Newly published definitions can briefly differ across CDN edges. Retry evaluation
        // without logging an exposure until this user's real assignment is available.
        for(let attempt=0;attempt<5;attempt++){
          assigned=client.getExperiment(config.experiment,{disableExposureLog:true});
          banner=assigned.get('banner','missing');
          if(assigned.groupName&&['control','value'].includes(banner))break;
          await pause(500*(attempt+1));
          await client.updateUserAsync(profile(id),{timeoutMs:10000});
        }
        if(!assigned.groupName||!['control','value'].includes(banner))throw new Error(`No active assignment for ${id}; reason=${assigned.details.reason}, group=${assigned.groupName}. Abort rather than fabricate exposure.`);
        client.getExperiment(config.experiment); // normal SDK exposure, actual current time
        await pause(10);
      }
      report.groups[banner].users++;
      report.users++;
      const events=journey(id,banner,runID);
      for(const event of events){
        if(event.eventName==='Checkout Started')report.groups[banner].checkouts++;
        if(event.eventName==='Booking Completed')report.groups[banner].bookings++;
        if(event.eventName==='Payment Failed')report.groups[banner].failures++;
        if(client){client.logEvent(event);await pause(5);}
        report.queuedBusinessEvents++;
      }
      if(client&&(i+1)%20===0)await client.flush();
    }
    if(client){
      for(let attempt=0;attempt<4;attempt++){
        await client.flush();
        if(acceptedEvents.size===report.queuedBusinessEvents&&acceptedExposures.size>=report.users)break;
        await pause(1000*(attempt+1));
      }
      if(acceptedEvents.size!==report.queuedBusinessEvents||acceptedExposures.size<report.users)throw new Error(`Unconfirmed delivery: ${acceptedEvents.size}/${report.queuedBusinessEvents} business events; ${acceptedExposures.size}/${report.users} exposure users`);
    }
  }catch(error){report.error=error.message;throw error;}
  finally{
    if(client)await client.shutdown();
    report.acceptedBusinessEvents=acceptedEvents.size;
    report.acceptedExposureUsers=acceptedExposures.size;
    report.finishedAt=new Date().toISOString();
    await mkdir('data/generated',{recursive:true});
    await writeFile('data/generated/statsig-traffic-report.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Synthetic Webjet traffic\n\nExperiment: \`${config.experiment}\`\n\n\`\`\`json\n${JSON.stringify(report,null,2)}\n\`\`\`\n\nThese are simulated inputs and ingestion acknowledgements, not Statsig’s experiment analysis.\n`);
  }
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const index=process.argv.indexOf('--users');
  run({send:process.argv.includes('--send'),users:index<0?config.usersPerRun:Number(process.argv[index+1]),runID:process.env.GITHUB_RUN_ID||`local-${Date.now()}`}).catch(e=>{console.error(e.message);process.exitCode=1});
}
