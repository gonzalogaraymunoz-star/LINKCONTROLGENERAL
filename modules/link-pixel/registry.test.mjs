import test from 'node:test';
import assert from 'node:assert/strict';
import { planSiteBinding, normalizedHost } from './registry.mjs';
const b='a1ce730c-8b7c-4a6a-9342-58fadbbfaac1', other='9826756c-c4bb-49c9-92c0-f6b1c6cb243c';
const site={id:'2e2c18e5-f5b3-4331-8b49-7dde844e6507', business_id:b, website_url:'https://raicesdeatacama.cl/ventas?utm_source=ig',kind:'acquisition',status:'registered'};
const account={id:'a0128ec7-790e-4fbd-aa89-93589b032bf8', business_id:b, provider:'meta'};
const asset={id:'dda1bc9a-f46f-43c1-b2da-bbc33d5fb9dc',business_id:b,provider_account_id:account.id,kind:'meta_pixel'};
const base={businessId:b,site,account,asset,method:'zaraz'};
test('valid site and asset produce only a proposed plan',()=>{
 const x=planSiteBinding(base); assert.equal(x.status,'proposed'); assert.equal(x.hostname,'raicesdeatacama.cl'); assert.equal('token' in x,false);
});
test('same pixel can be linked to another verified website of same business',()=>{
 const otherSite={...site,id:'997c36ce-b631-4f11-97ad-e60003392d48',website_url:'https://raicesbrasil.com.br/'};
 assert.equal(planSiteBinding({...base,site:otherSite}).asset_id,asset.id);
});
test('cross business website is rejected',()=>assert.throws(()=>planSiteBinding({...base,site:{...site,business_id:other}}),/cross_business_binding_denied/));
test('cross business asset is rejected',()=>assert.throws(()=>planSiteBinding({...base,asset:{...asset,business_id:other}}),/cross_business_binding_denied/));
test('asset must belong to provider account',()=>assert.throws(()=>planSiteBinding({...base,asset:{...asset,provider_account_id:other}}),/asset_owner_account_mismatch/));
test('provider mismatch is rejected',()=>assert.throws(()=>planSiteBinding({...base,asset:{...asset,kind:'ga4_property'}}),/asset_provider_mismatch/));
test('reference/archive site cannot be instrumented',()=>assert.throws(()=>planSiteBinding({...base,site:{...site,kind:'reference'}}),/non_installable_site/));
test('duplicate meta pixel install on same site is rejected',()=>assert.throws(()=>planSiteBinding({...base,existingBindings:[{site_id:site.id,asset_id:asset.id,status:'proposed'}]}),/duplicate_site_asset_binding/));
test('invalid method is rejected',()=>assert.throws(()=>planSiteBinding({...base,method:'custom'}),/install_method_invalid/));
test('reporting-only plan does not ask for site tracking consent',()=>{
 const r=planSiteBinding({...base,method:'reporting_only'});assert.equal(r.requires_consent_review,false);
});
test('host must be valid HTTPS with no embedded credentials',()=>{
 for (const url of ['http://raicesdeatacama.cl/','https://user:password@raicesdeatacama.cl/','https://localhost:3000/']) assert.throws(()=>normalizedHost(url));
});
test('does not claim verification from account status',()=>{
 const r=planSiteBinding({...base,account:{...account,status:'verified'}});assert.equal(r.status,'proposed');
});
