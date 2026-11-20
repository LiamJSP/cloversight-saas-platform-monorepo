export function actorFromRequest(req, config) {
  const role = req.headers['x-local-role'] === 'steward' ? 'steward' : 'customer';
  const actorId = String(req.headers['x-local-user'] ?? (role === 'steward' ? config.stewardId : config.customerId));
  const email = String(req.headers['x-local-email'] ?? (role === 'customer' ? config.customerEmail : '') ?? '').trim().toLowerCase();
  return { role, actorId, email, ip: req.socket.remoteAddress ?? 'unknown', userAgent: String(req.headers['user-agent'] ?? '') };
}
export function requireRole(actor, role) {
  if (actor.role !== role) throw Object.assign(new Error('Forbidden.'), { statusCode: 403 });
}
