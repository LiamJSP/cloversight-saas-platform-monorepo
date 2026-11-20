import { actorFromRequest } from '../security/auth.mjs';
import { requestId } from '../lib.mjs';
export function requestContext(req, config) { return { ...actorFromRequest(req, config), requestId: String(req.headers['x-request-id'] ?? requestId()) }; }
