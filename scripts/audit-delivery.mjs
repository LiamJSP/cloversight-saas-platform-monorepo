import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { awsJson } from './aws-cli.mjs';

export function queueDepth(attributes) {
  const counts = ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible', 'ApproximateNumberOfMessagesDelayed']
    .map(key => attributes?.[key]);
  if (!counts.every(value => typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)))) {
    throw new Error('SQS did not report all three message counts.');
  }
  return counts.reduce((sum, value) => sum + Number(value), 0);
}

export function checkOpsEmail(stackName, region, read = awsJson) {
  const parameter = key => "Parameters[?ParameterKey=='" + key + "'].ParameterValue | [0]";
  const query = "Stacks[0].{topic:Outputs[?OutputKey=='OpsTopicArn'].OutputValue | [0],stage:" + parameter('Stage') +
    ',email:' + parameter('OpsAlertEmail') + ',technical:' + parameter('TechnicalAlertEmail') + ',enabled:' + parameter('TechnicalAlertsEnabled') + '}';
  const stack = read(['cloudformation', 'describe-stacks', '--stack-name', stackName, '--query', query], { region });
  if (!stack || !['prod', 'staging', 'beta'].includes(stack.stage) || !stack.topic) throw new Error('Missing operational topic or stage.');
  const email = stack.email || (stack.stage !== 'prod' && stack.enabled === 'true' ? stack.technical : '');
  if (!email) {
    if (stack.stage === 'prod') throw new Error('Production requires an explicit OPS_ALERT_EMAIL.');
    return 'unconfigured';
  }
  const subscriptions = read(['sns', 'list-subscriptions-by-topic', '--topic-arn', stack.topic, '--query', 'Subscriptions'], { region });
  if (!Array.isArray(subscriptions) || !subscriptions.some(item =>
    item.TopicArn === stack.topic && item.Protocol === 'email' && item.Endpoint === email &&
    item.SubscriptionArn?.startsWith(stack.topic + ':'))) {
    throw new Error('Confirm the subscription for the configured operations email in this region.');
  }
  return 'confirmed';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, stack, region] = process.argv.slice(2);
    if (command === 'queue-depth') console.log(queueDepth(JSON.parse(fs.readFileSync(0, 'utf8'))));
    else if (command === 'ops-email' && stack && region) console.log(checkOpsEmail(stack, region));
    else throw new Error('Expected queue-depth or ops-email STACK REGION.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
