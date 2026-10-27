import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebEvent, sendMarketingEvent, WEB_EVENTS } from './link-pixel.mjs';
const businessId='86290c1e-1e75-4f20-9bd2-a88dd97ddbbc';
const siteId='2e2c18e5-f5b3-4331-8b49-7dde844e6507';
const uuid=()=> '01d6270b-f4ef-4259-bbc2-c8a6b1e42ad8';
const opts={randomUUID:uuid,now:()=>new Date('2026-10-27T00:00:00Z')};
for(const name of WEB_EVENTS){
  test('allowlisted event '+name,()=>{
    const e=createWebEvent({businessId,siteId,name,pagePath:'/tour?private=email@example.com'},opts);
    assert.equal(e.name,name);assert.equal(e.page_path,'/tour');assert.equal(e.event_id,uuid());
  });
}
test('cannot claim backend confirmed purchase in browser',()=>{
 assert.throws(()=>createWebEvent({businessId,siteId,name:'purchase_confirmed'},opts),/event_not_allowlisted/);
});
test('invalid owner ID is rejected',()=>{
 assert.throws(()=>createWebEvent({businessId:'fake',siteId,name:'page_view'},opts),/invalid_link_ids/);
});
test('no sensitive input fields or UTM value emitted',()=>{
 const e=createWebEvent({businessId,siteId,name:'whatsapp_click',email:'john@example.com',
 utm:{source:'instagram',content:'john@example.com'},ctaId:'whatsapp'},opts);
 assert.equal(e.email,undefined);assert.equal(e.utm.content,undefined);assert.equal(e.utm.source,'instagram');
 assert.throws(()=>createWebEvent({businessId,siteId,name:'page_view',pagePath:'/user/john@example.com'},opts),/invalid_page_path/);
});
test('denies delivery without consent or Zaraz',()=>{
 const e=createWebEvent({businessId,siteId,name:'view_item'},opts);let hits=0;
 const zaraz={track(){hits++}};
 assert.equal(sendMarketingEvent(e,{zaraz}).queued,false);assert.equal(hits,0);
 assert.equal(sendMarketingEvent(e,{marketingConsent:true}).queued,false);assert.equal(hits,0);
 assert.equal(sendMarketingEvent(e,{marketingConsent:true,zaraz}).queued,true);assert.equal(hits,1);
});
test('does not claim success on error',()=>{
 const e=createWebEvent({businessId,siteId,name:'begin_checkout'},opts);
 const r=sendMarketingEvent(e,{marketingConsent:true,zaraz:{track(){throw Error('error')}}});
 assert.deepEqual(r,{queued:false,reason:'zaraz_error'});
});
test('tampered payload cannot pass private path; filters UTM',()=>{
 const e=createWebEvent({businessId,siteId,name:'page_view'},opts);let got;
 const zaraz={track(name,data){got=data}};
 assert.equal(sendMarketingEvent({...e,page_path:'/person/john@example.com'},{marketingConsent:true,zaraz}).queued,false);
 assert.equal(sendMarketingEvent({...e,utm:{source:'john@example.com',campaign:'sale_2026'}},{marketingConsent:true,zaraz}).queued,true);
 assert.equal(got.utm_source,undefined);assert.equal(got.utm_campaign,'sale_2026');
});
