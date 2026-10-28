/** LINK Pixel registry: local, pure, public-metadata binding validation. No IO or secrets. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ASSET_KINDS = Object.freeze({
  meta: ['meta_pixel', 'meta_dataset'],
  google_analytics: ['ga4_property', 'ga4_web_stream'],
  cloudflare: ['zaraz_zone', 'web_analytics_site'],
});
export const INSTALL_METHODS = Object.freeze(['zaraz', 'direct', 'reporting_only']);
const fail = (reason) => { throw new TypeError(reason); };

export function normalizedHost(value) {
  let url;
  try { url = new URL(value); } catch { return fail('website_url_invalid'); }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || url.port
    || url.hostname === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname)) {
    return fail('website_host_invalid');
  }
  return url.hostname.toLowerCase();
}

/** The objects supplied here MUST have been read by an authorized server from canonical tables. */
export function planSiteBinding({ businessId, site, account, asset, method, existingBindings = [] }) {
  if (!UUID.test(businessId ?? '') || !site || !account || !asset) fail('canonical_context_required');
  if (![site.business_id, account.business_id, asset.business_id].every((id) => id === businessId)) {
    fail('cross_business_binding_denied');
  }
  if (![site.id, account.id, asset.id].every((id) => UUID.test(id ?? ''))) fail('record_id_invalid');
  if (asset.provider_account_id !== account.id) fail('asset_owner_account_mismatch');
  if (!Object.hasOwn(ASSET_KINDS, account.provider) || !ASSET_KINDS[account.provider].includes(asset.kind)) {
    fail('asset_provider_mismatch');
  }
  if (!INSTALL_METHODS.includes(method)) fail('install_method_invalid');
  if (site.kind === 'reference' || !['registered', 'verified'].includes(site.status)) fail('non_installable_site');
  const hostname = normalizedHost(site.website_url);
  if (method === 'zaraz' && !['meta_pixel', 'meta_dataset', 'ga4_web_stream'].includes(asset.kind)) {
    fail('zaraz_destination_invalid');
  }
  if (method === 'direct' && !['meta_pixel', 'ga4_web_stream', 'web_analytics_site'].includes(asset.kind)) {
    fail('direct_install_invalid');
  }
  if (existingBindings.some((binding) => binding.site_id === site.id && binding.asset_id === asset.id
    && binding.status !== 'disabled' && binding.status !== 'revoked')) fail('duplicate_site_asset_binding');
  return Object.freeze({
    business_id: businessId,
    site_id: site.id,
    asset_id: asset.id,
    method,
    hostname,
    status: 'proposed', // Never mark connected or verified based on local inputs.
    requires_verified_authorization: true,
    requires_consent_review: method !== 'reporting_only',
  });
}
