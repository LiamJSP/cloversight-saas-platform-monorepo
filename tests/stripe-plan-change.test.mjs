import test from 'node:test';
import assert from 'node:assert/strict';
import { StripeBillingProvider } from '../src/billing/providers.mjs';

const config = {
  stripeSecretKey: 'sk_test_example', stripeRequestThreeDSecure: 'automatic',
  stripePriceIds: { essentials: 'price_essentials', professional: 'price_professional' },
};
function jsonResponse(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }); }
function fixture(subtotal = 3950) {
  const subscription = { id:'sub_1', customer:'cus_1', status:'active', collection_method:'charge_automatically', metadata:{accountId:'acct_1'}, items:{data:[{id:'si_1',price:{id:'price_essentials'},current_period_start:1782864000,current_period_end:1785456000}]} };
  const invoice = { id:'in_1', customer:'cus_1', currency:'usd', subtotal, total:subtotal, status:'paid', payments:{data:[{id:'inpay_1',is_default:true,payment:{type:'payment_intent',payment_intent:{id:'pi_1',payment_method:'pm_1'}}}]}, subscription_details:{metadata:{accountId:'acct_1'}}, lines:{data:[{type:'subscription',period:{start:1782864000,end:1785456000}}]} };
  const updated = { ...subscription, metadata:{accountId:'acct_1',transactionId:'txn_1'}, latest_invoice:invoice, items:{data:[{...subscription.items.data[0],price:{id:'price_professional'}}]} };
  return { subscription, invoice, updated };
}

function input() { return { accountId:'acct_1',transactionId:'txn_1',planId:'professional',currentPlanId:'essentials',fullPlanPriceMinor:4900,currentPlanPriceMinor:1900,amountMinor:3950,currency:'USD',providerCustomerId:'cus_1',subscriptionId:'sub_1',prorationDateEpoch:1784150400,idempotencyKey:'plan-change:txn_1' }; }

test('Stripe plan change never combines a fixed proration date with an immediate billing-anchor reset', async (t) => {
  const original = globalThis.fetch; t.after(()=>{globalThis.fetch=original});
  const calls=[]; const f=fixture();
  globalThis.fetch=async (url, options={})=>{calls.push({url:String(url),method:options.method,body:String(options.body??'')});
    const u=String(url);
    if(u.includes('/prices/price_professional')) return jsonResponse({id:'price_professional',unit_amount:4900,currency:'usd',type:'recurring',recurring:{interval:'month'}});
    if(u.includes('/prices/price_essentials')) return jsonResponse({id:'price_essentials',unit_amount:1900,currency:'usd',type:'recurring',recurring:{interval:'month'}});
    if(u.includes('/subscriptions/sub_1') && options.method==='GET') return jsonResponse(f.subscription);
    if(u.includes('/invoices/create_preview')) return jsonResponse(f.invoice);
    if(u.includes('/subscriptions/sub_1') && options.method==='POST') return jsonResponse(f.updated);
    throw new Error(`Unexpected request ${options.method} ${u}`);
  };
  const result=await new StripeBillingProvider(config).changePlan(input());
  assert.equal(result.status,'completed'); assert.equal(result.amountMinor,3950);
  const preview=calls.find(c=>c.url.includes('create_preview')).body;
  const subscriptionPosts=calls.filter(c=>c.url.includes('/subscriptions/sub_1')&&c.method==='POST');
  const binding=subscriptionPosts.find(c=>c.body.includes('metadata%5BtransactionId%5D'))?.body;
  const update=subscriptionPosts.find(c=>c.body.includes('payment_behavior'))?.body;
  assert.match(binding,/txn_1/);
  assert.doesNotMatch(update,/metadata%5BtransactionId%5D/);
  assert.match(preview,/subscription_details%5Bbilling_cycle_anchor%5D=now/);
  assert.match(update,/billing_cycle_anchor=now/);
  assert.doesNotMatch(preview,/proration_date/); assert.doesNotMatch(update,/proration_date/);
});

test('Stripe preview amount mismatch prevents the subscription mutation', async (t) => {
  const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original});
  let updated=false; const f=fixture(4050);
  globalThis.fetch=async (url, options={})=>{const u=String(url);
    if(u.includes('/prices/price_professional')) return jsonResponse({id:'price_professional',unit_amount:4900,currency:'usd',type:'recurring',recurring:{interval:'month'}});
    if(u.includes('/prices/price_essentials')) return jsonResponse({id:'price_essentials',unit_amount:1900,currency:'usd',type:'recurring',recurring:{interval:'month'}});
    if(u.includes('/subscriptions/sub_1')&&options.method==='GET') return jsonResponse(f.subscription);
    if(u.includes('/invoices/create_preview')) return jsonResponse(f.invoice);
    if(u.includes('/subscriptions/sub_1')&&options.method==='POST'){updated=true;return jsonResponse(f.updated)}
    throw new Error('unexpected');};
  await assert.rejects(()=>new StripeBillingProvider(config).changePlan(input()),e=>e.code==='AMOUNT_RECONCILIATION_FAILED');
  assert.equal(updated,false);
});

test('Stripe request failures identify the operation without exposing provider object identifiers', async (t) => {
  const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original});
  globalThis.fetch=async()=>jsonResponse({error:{type:'invalid_request_error',code:'parameter_unknown',param:'billing_cycle_anchor',message:'Unknown parameter.'}},400);
  await assert.rejects(
    ()=>new StripeBillingProvider(config).request('POST','/subscriptions/sub_sensitive_example',{billing_cycle_anchor:'now'}),
    (error)=>error.code==='parameter_unknown'&&error.providerOperation==='POST /subscriptions/:id'&&!error.providerOperation.includes('sensitive'),
  );
});
