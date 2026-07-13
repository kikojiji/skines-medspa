/**
 * Skines Med Spa — Lead conversion tracking
 * Fires GA4 'generate_lead' exactly once per successful lead-form submission.
 * Call window.skinesTrackLead('<formKey>') from a form's SUCCESS callback only.
 * Never on form_start / click / validation error / page load.
 * Broadcasts to both GA4 properties (Fresha + Skines) via window.gtag.
 */
(function () {
  'use strict';
  var fired = {};
  window.skinesTrackLead = function (formKey) {
    formKey = formKey || 'default';
    if (fired[formKey]) return;              // duplicate-submission guard
    fired[formKey] = true;
    try {
      if (typeof window.gtag === 'function') {
        gtag('event', 'generate_lead');      // exact call required
      }
    } catch (e) { /* fail silently — never block UX */ }
  };
})();
