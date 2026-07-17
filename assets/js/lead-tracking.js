/**
 * Skines Head Spa — Lead tracking (compatibility fallback)
 * ---------------------------------------------------------------------------
 * generate_lead is now owned by the core layer (assets/js/skines-tracker.js),
 * which attaches the attribution snapshot + event_id and de-dupes per formKey.
 *
 * This file remains only as a DEGRADED fallback: if the core layer fails to
 * load for any reason, this defines a bare window.skinesTrackLead so a
 * successful tirage submission still records generate_lead in GA4.
 *
 * It never overrides the core implementation (guarded by `if (!…)`), and the
 * core — loaded `defer` — runs after this and replaces the fallback with the
 * richer version. tirage.html keeps calling window.skinesTrackLead('tirage').
 */
(function () {
  'use strict';
  if (window.skinesTrackLead) return;            // core already provided it
  var fired = {};
  window.skinesTrackLead = function (formKey) {
    formKey = formKey || 'default';
    if (fired[formKey]) return;
    fired[formKey] = true;
    try { if (typeof window.gtag === 'function') gtag('event', 'generate_lead'); }
    catch (e) { /* never block UX */ }
  };
})();
