// ============================================================
// FWL CRM - WhatsApp module router (single serverless function)
// Consolidates the WhatsApp CRUD endpoints to stay under the
// Vercel Hobby 12-function limit. Public URLs are unchanged -
// vercel.json rewrites map the original paths to ?r=<route>.
//   /api/whatsapp-conversations -> /api/whatsapp?r=conversations
//   /api/whatsapp-messages      -> /api/whatsapp?r=messages
//   /api/whatsapp-templates     -> /api/whatsapp?r=templates
//   /api/whatsapp-settings      -> /api/whatsapp?r=settings
//   /api/followups              -> /api/whatsapp?r=followups
//   /api/analytics-whatsapp     -> /api/whatsapp?r=analytics
// (api/whatsapp-webhook.js stays separate: it needs raw-body
//  parsing for HMAC verification.)
// ============================================================

const routes = {
  conversations: require('./_wa-conversations'),
  messages:      require('./_wa-messages'),
  templates:     require('./_wa-templates'),
  settings:      require('./_wa-settings'),
  followups:     require('./_wa-followups'),
  analytics:     require('./_wa-analytics'),
};

export default async function handler(req, res) {
  const r = req.query.r;
  const route = routes[r];
  if (!route) {
    return res.status(404).json({ error: 'Unknown WhatsApp route: ' + (r || '(none)') });
  }
  return route(req, res);
}
