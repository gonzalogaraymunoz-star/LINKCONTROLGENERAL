/** LINK PIXEL · contrato de eventos anónimos; NO instala Meta ni guarda datos. */
export const WEB_EVENTS = Object.freeze(['page_view','view_item','whatsapp_click','begin_checkout']);
const EVENT_SET = new Set(WEB_EVENTS);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIM = /^[a-zA-Z0-9_.-]{1,96}$/;
const UTM_KEYS = ['source','medium','campaign','content','term'];
const safeDimension = (v) => typeof v === 'string' && DIM.test(v) ? v : undefined;
const safePath = (v) => typeof v === 'string' && v.startsWith('/') && !v.startsWith('//')
  && v.length <= 300 && /^\/[a-zA-Z0-9_./~-]*$/.test(v) && !/[0-9]{7,}/.test(v);

export function createWebEvent(input, { randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto), now = () => new Date() } = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('event_input_required');
  const { businessId, siteId, name, pagePath = '/', productId, ctaId, utm = {} } = input;
  if (!UUID.test(businessId ?? '') || !UUID.test(siteId ?? '')) throw new TypeError('invalid_link_ids');
  if (!EVENT_SET.has(name)) throw new TypeError('event_not_allowlisted');
  if (typeof pagePath !== 'string' || !pagePath.startsWith('/') || pagePath.startsWith('//')) throw new TypeError('invalid_page_path');
  const path = pagePath.split(/[?#]/, 1)[0];
  if (!safePath(path)) throw new TypeError('invalid_page_path');
  if (typeof randomUUID !== 'function') throw new TypeError('secure_uuid_unavailable');
  const cleanUtm = {};
  for (const key of UTM_KEYS) { const v = safeDimension(utm?.[key]); if (v) cleanUtm[key] = v; }
  const e = { event_id: randomUUID(), name, business_id: businessId, site_id: siteId,
    page_path: path, occurred_at: now().toISOString(), utm: cleanUtm };
  if (safeDimension(productId)) e.product_id = productId;
  if (safeDimension(ctaId)) e.cta_id = ctaId;
  return e;
}

/** Invoca Zaraz si existe consentimiento de marketing. NO confirma entrega a Meta. */
export function sendMarketingEvent(event, { marketingConsent = false, zaraz } = {}) {
  if (marketingConsent !== true) return { queued: false, reason: 'marketing_consent_required' };
  if (!event || !EVENT_SET.has(event.name) || !UUID.test(event.business_id ?? '')
    || !UUID.test(event.site_id ?? '') || !UUID.test(event.event_id ?? '') || !safePath(event.page_path)) {
    return { queued: false, reason: 'invalid_event' };
  }
  if (typeof zaraz?.track !== 'function') return { queued: false, reason: 'zaraz_unavailable' };
  const utm = {};
  for (const key of UTM_KEYS) { const v = safeDimension(event.utm?.[key]); if (v) utm['utm_'+key] = v; }
  try {
    zaraz.track('link_pixel_'+event.name, {
      event_id: event.event_id, business_id: event.business_id, site_id: event.site_id,
      page_path: event.page_path,
      ...(safeDimension(event.product_id) ? { product_id: event.product_id } : {}),
      ...(safeDimension(event.cta_id) ? { cta_id: event.cta_id } : {}), ...utm
    });
    return { queued: true, reason: 'dispatched_to_zaraz_api' };
  } catch { return { queued: false, reason: 'zaraz_error' }; }
}
