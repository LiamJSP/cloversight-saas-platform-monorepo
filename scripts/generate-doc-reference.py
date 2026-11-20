#!/usr/bin/env python3
"""Generate source-linked infrastructure and gateway reference from CloudFormation."""
from collections import Counter
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'docs' / 'reference'


class CloudFormationLoader(yaml.SafeLoader):
    pass


def intrinsic(loader, suffix, node):
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    return loader.construct_mapping(node)


CloudFormationLoader.add_multi_constructor('!', intrinsic)


def template(name):
    path = ROOT / 'infra' / 'cloudformation' / name
    return yaml.load(path.read_text(), Loader=CloudFormationLoader)


def escape(value):
    return str(value).replace('|', '\\|').replace('\n', ' ')


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    templates = [('Primary control plane', 'webwatch.yaml'), ('Regional capture', 'regional-capture.yaml')]
    lines = ['# CloudFormation resource inventory', '',
             'Generated from `infra/cloudformation/*.yaml` by `scripts/generate-doc-reference.py`.',
             'Logical resources are conditional where noted; this is source inventory, not proof of a deployed stack.', '']
    for label, name in templates:
        data = template(name)
        resources = data['Resources']
        counts = Counter(v['Type'].split('::')[1] for v in resources.values())
        lines.extend([f'## {label}', '', f'Source: `infra/cloudformation/{name}`. '
                      f'{len(resources)} logical resources; {len(data.get("Parameters", {}))} parameters; '
                      f'{len(data.get("Outputs", {}))} outputs.', '',
                      'Services: ' + ', '.join(f'{k} ({v})' for k, v in sorted(counts.items())) + '.', '',
                      '| Logical ID | AWS resource type | Condition |', '| --- | --- | --- |'])
        for key, value in resources.items():
            lines.append(f'| `{escape(key)}` | `{escape(value["Type"])}` | `{escape(value.get("Condition", "always"))}` |')
        lines.extend(['', '### Outputs', '', '| Name |', '| --- |'])
        lines.extend(f'| `{escape(key)}` |' for key in data.get('Outputs', {}))
        lines.append('')
    (OUTPUT / 'cloudformation.md').write_text('\n'.join(lines) + '\n')

    primary = template('webwatch.yaml')
    routes = [(name, value['Properties']['RouteKey'], value['Properties'].get('AuthorizationType', 'NONE'),
               value.get('Condition', 'always'))
              for name, value in primary['Resources'].items() if value['Type'] == 'AWS::ApiGatewayV2::Route']
    lines = ['# AWS HTTP API gateway routes', '',
             'Generated from `infra/cloudformation/webwatch.yaml` by `scripts/generate-doc-reference.py`.',
             'An `ANY .../{proxy+}` gateway mapping accepts multiple verbs and paths; the actual allowed '
             'operations and account/owner checks live in `src/api/routes.mjs`. JWT authorizers protect '
             'gateway routes; signed responses and provider webhooks perform their own checks in application code.', '',
             '| Logical ID | Gateway route key | Gateway authorization | Condition |', '| --- | --- | --- | --- |']
    lines.extend(f'| `{escape(name)}` | `{escape(key)}` | `{escape(auth)}` | `{escape(condition)}` |'
                 for name, key, auth, condition in routes)
    lines.extend(['', '## Runtime boundaries', '',
                  '- `src/aws/handler.mjs` checks the injected CloudFront origin secret on private routes, including direct API Gateway requests.',
                  '- `src/api/routes.mjs` applies customer membership, owner-only mutations, tenant scope, webhook signatures, and rate limits.',
                  '- `src/server.mjs` serves the same router locally with file-backed state and local authorization.',
                  '- `POST /api/webhooks/twilio/*` is present only when `TwilioEnabled` is true in the template and `smsEnabled` is true at runtime.', ''])
    (OUTPUT / 'gateway-routes.md').write_text('\n'.join(lines))
    print(f'Generated {len(routes)} gateway routes and {sum(len(template(n)["Resources"]) for _, n in templates)} resources.')


if __name__ == '__main__':
    main()
