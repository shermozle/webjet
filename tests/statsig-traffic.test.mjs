import test from 'node:test';
import assert from 'node:assert/strict';
import {journey,profile,config,validateWindow} from '../scripts/statsig-traffic.mjs';

test('synthetic journeys preserve funnel order and exclude fabricated SDK events',()=>{
  const ids=new Set();
  for(let i=0;i<1000;i++)for(const banner of ['control','value']){
    const user=`test-${banner}-${i}`,events=journey(user,banner,'unit-test'),names=events.map(e=>e.eventName);
    if(names.includes('Booking Completed'))assert(names.indexOf('Checkout Started')<names.indexOf('Payment Submitted')&&names.indexOf('Payment Submitted')<names.indexOf('Booking Completed'));
    if(names.includes('Checkout Started'))assert(names.includes('Flight Search Submitted')&&names.includes('Flight Selected'));
    for(const event of events){
      assert(!event.eventName.startsWith('statsig::')&&!event.eventName.includes('page_view')&&!event.eventName.includes('session'));
      assert(!('time' in event));
      assert.equal(event.metadata.synthetic,'true');
      assert.equal(event.metadata.data_source,config.source);
      assert(!ids.has(event.metadata.synthetic_event_id));ids.add(event.metadata.synthetic_event_id);
    }
  }
});
test('scenario produces a modest planned checkout lift without changing identity',()=>{
  const counts={control:0,value:0};
  for(let i=0;i<20000;i++)for(const arm of ['control','value']){
    const id=`power-check-${i}`;
    counts[arm]+=journey(id,arm,'unit-test').some(e=>e.eventName==='Checkout Started')?1:0;
    assert.equal(profile(id).userID,id);
  }
  assert(counts.control/20000>.19&&counts.control/20000<.21);
  assert(counts.value/20000>.21&&counts.value/20000<.23);
  const lift=counts.value/counts.control-1;
  assert(lift>.07&&lift<.13);
});
test('traffic deadline is enforced and missing assignments cannot generate outcomes',()=>{
  assert.throws(()=>validateWindow(Date.parse(config.stopAt)),/window closed/);
  assert.doesNotThrow(()=>validateWindow(Date.parse(config.stopAt)-1));
  assert.throws(()=>journey('x','missing','test'),/Unrecognized/);
  assert.deepEqual(journey('same','control','same-run'),journey('same','control','same-run'));
});
