import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

function resource(source,id){const lines=source.split('\n');const start=lines.findIndex(l=>l===`  ${id}:`);assert.notEqual(start,-1,`${id} resource must exist`);let end=start+1;while(end<lines.length&&!/^  [A-Za-z][A-Za-z0-9]*:\s*$/.test(lines[end]))end++;return lines.slice(start,end).join('\n');}
function apiBehaviors(source){const lines=source.split('\n');const out=[];for(let i=0;i<lines.length;i++){if(lines[i].trim()!=='TargetOriginId: ApiOrigin')continue;const indent=lines[i].length-lines[i].trimStart().length;let s=i;while(s>0){const p=lines[s-1],pi=p.length-p.trimStart().length;if(pi===indent-2&&p.trimStart().startsWith('- ')){s--;break;}s--;}let e=i+1;while(e<lines.length){const l=lines[e];if(!l.trim()){e++;continue;}const li=l.length-l.trimStart().length;if(li<indent||(li===indent-2&&l.trimStart().startsWith('- ')))break;e++;}out.push(lines.slice(s,e).join('\n'));}return out;}

test('CloudFront API behaviors use no-store origin responses, forward Authorization, and never forward the injected origin secret from viewers', async()=>{
  const source=await fs.readFile('infra/cloudformation/webwatch.yaml','utf8');
  const cache=resource(source,'ApiNoCachePolicy');
  assert.match(cache,/DefaultTTL:\s*0/); assert.match(cache,/MaxTTL:\s*1/); assert.match(cache,/MinTTL:\s*0/);
  assert.match(cache,/HeaderBehavior:\s+whitelist/); assert.match(cache,/^\s*-\s+Authorization\s*$/m);
  assert.doesNotMatch(cache,/^\s*-\s+(?:Host|X-WebWatch-Origin)\s*$/m);
  const comments=[...source.matchAll(/^\s*Comment:\s*(.+)$/gm)].map(([,value])=>value.trim().replace(/^['\"]|['\"]$/g,'')); assert.ok(comments.every(value=>value.length<=128),'CloudFront policy comments must be <= 128 characters');
  const handler=await fs.readFile('src/aws/handler.mjs','utf8'); assert.match(handler,/['\"]cache-control['\"]:\s*['\"]no-store['\"]/);
  const origin=resource(source,'ApiOriginRequestPolicy');
  assert.match(origin,/HeaderBehavior:\s+whitelist/);
  for(const h of ['Accept','Accept-Language','Content-Type','Origin','Access-Control-Request-Headers','Access-Control-Request-Method','If-Match','If-None-Match']) assert.match(origin,new RegExp(`^\\s*-\\s+${h}\\s*$`,'m'));
  assert.doesNotMatch(origin,/^\s*-\s+(?:Authorization|Host|X-WebWatch-Origin)\s*$/m);
  const behaviors=apiBehaviors(source); assert.ok(behaviors.length>=2);
  for(const b of behaviors){assert.match(b,/CachePolicyId:\s+!Ref ApiNoCachePolicy/);assert.match(b,/OriginRequestPolicyId:\s+!Ref ApiOriginRequestPolicy/);}
  assert.match(source,/RouteKey:\s*'ANY \/unsubscribe\/\{proxy\+\}'/);
  assert.match(source,/PathPattern:\s*\/unsubscribe\/\*/);
  assert.ok((source.match(/HeaderName: X-WebWatch-Origin/g)||[]).length>=2);
});
