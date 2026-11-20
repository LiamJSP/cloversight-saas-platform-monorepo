#!/usr/bin/env python3
"""Render the maintained CLOVERSIGHT architecture maps into docs/visuals."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'visuals'
OUT.mkdir(parents=True, exist_ok=True)

BG, PANEL, INK, MUTED = '#100e17', '#201c2b', '#fff9fd', '#bbb3c6'
PINK, ROSE, GOLD, BLUE = '#f07fbc', '#bd3c87', '#e6b75e', '#80cbe0'


def canvas(title, subtitle):
    fig, ax = plt.subplots(figsize=(17, 10), dpi=140)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    ax.text(4, 96, 'CLOVERSIGHT  /  ENGINEERING ATLAS', color=PINK, fontsize=12, weight='bold')
    ax.text(4, 90, title, color=INK, fontsize=27, weight='bold')
    ax.text(4, 85.7, subtitle, color=MUTED, fontsize=11)
    return fig, ax


def box(ax, x, y, w, h, title, detail, color=PINK):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.55,rounding_size=1.6',
                                facecolor=PANEL, edgecolor=color, linewidth=1.4))
    ax.add_patch(FancyBboxPatch((x, y + h - 1.3), w, 0.75,
                                boxstyle='round,pad=0,rounding_size=0.3', facecolor=color, edgecolor='none'))
    ax.text(x + 1.5, y + h - 4.3, title, color=INK, fontsize=13, weight='bold', va='top')
    ax.text(x + 1.5, y + h - 9.4, detail, color=MUTED, fontsize=10, va='top', linespacing=1.55)


def arrow(ax, start, end, color=ROSE, label=None, offset=(0, 0)):
    ax.add_patch(FancyArrowPatch(start, end, arrowstyle='-|>', mutation_scale=14,
                                 linewidth=1.8, color=color, connectionstyle='arc3,rad=0'))
    if label:
        ax.text((start[0]+end[0])/2+offset[0], (start[1]+end[1])/2+offset[1], label,
                fontsize=9, color=color, ha='center', va='center',
                bbox={'facecolor': BG, 'edgecolor': 'none', 'pad': 1.8})


def finish(fig, ax, filename, source):
    ax.text(4, 3, source, color=MUTED, fontsize=9)
    fig.savefig(OUT / filename, facecolor=BG, bbox_inches='tight', pad_inches=.18)
    fig.savefig(OUT / filename.replace('.svg', '.png'), facecolor=BG, bbox_inches='tight', pad_inches=.18)
    plt.close(fig)


fig, ax = canvas('System landscape', 'Static browser surfaces, central control plane, regional capture plane')
box(ax, 4, 63, 20, 15, 'Browser surfaces', 'Public site · Customer portal\nSteward console', PINK)
box(ax, 35, 63, 26, 15, 'CloudFront + S3', 'Static origins · WAF in staging\nShared JS/CSS · Managed login', BLUE)
box(ax, 72, 63, 24, 15, 'HTTP API + Cognito', 'Customer / steward JWT pools\nOrigin secret · Signed webhooks', GOLD)
box(ax, 72, 40, 24, 15, 'API Lambda', 'Router · Tenant services\nBilling · Reports · Notifications', PINK)
box(ax, 36, 40, 25, 15, 'Primary state', 'DynamoDB · KMS · S3\nSES · Secrets Manager · Stripe', BLUE)
box(ax, 4, 40, 20, 15, 'Scheduler + queues', 'EventBridge · Check SQS\nResult / billing / report SQS', GOLD)
box(ax, 4, 14, 26, 15, 'Primary worker', 'Lease · Credit reservation\nAggregate regional results', PINK)
box(ax, 39, 14, 25, 15, 'Regional queues', 'One capture queue + DLQ\nper deployed AWS Region', GOLD)
box(ax, 72, 14, 24, 15, 'Regional capture', 'Browser Lambda · Local S3\nCompare · Evidence · Result', BLUE)
for a, b, c, label, off in [
    ((24,71),(35,71),PINK,'HTTPS',(0,3)), ((61,71),(72,71),GOLD,'API / auth',(0,3)),
    ((84,65),(84,55),PINK,None,(0,0)), ((72,47),(61,47),BLUE,'state',(0,3)),
    ((36,47),(24,47),GOLD,'due work',(0,3)), ((14,40),(14,29),GOLD,None,(0,0)),
    ((30,21),(39,21),PINK,'dispatch',(0,3)), ((64,21),(72,21),GOLD,'capture',(0,3))]:
    arrow(ax, a, b, c, label, off)
ax.plot([84, 84, 17, 17], [14, 8, 8, 14], color=BLUE, linewidth=1.8)
arrow(ax, (17, 10), (17, 14), BLUE)
ax.text(51, 9.1, 'compact result → primary result SQS', color=BLUE, fontsize=9,
        ha='center', va='center', bbox={'facecolor': BG, 'edgecolor': 'none', 'pad': 1.8})
finish(fig, ax, 'system-landscape.svg', 'Sources: apps/* · src/server.mjs · src/aws/* · infra/cloudformation/{webwatch,regional-capture}.yaml')

fig, ax = canvas('Regional check lifecycle', 'One durable run · multiple in-region captures · central aggregation')
stages = [
    ('01  DISPATCH', 'EventBridge scheduler queries\n32 sharded due partitions.', 'src/aws/dispatcher.mjs', GOLD),
    ('02  CLAIM', 'Primary worker acquires lease,\nreserves per-region credits.', 'src/aws/worker.mjs', PINK),
    ('03  CAPTURE', 'Same-region SQS invokes browser\nLambda; compares local evidence.', 'src/aws/regional-capture-worker.mjs', BLUE),
    ('04  RETURN', 'Regional result is cached locally;\ncompact metadata enters primary SQS.', 'src/aws/regional-capture-worker.mjs', GOLD),
    ('05  COMMIT', 'Primary worker reads expected result\nIDs, settles credits, opens alerts.', 'src/monitoring/regional-coordinator.mjs', PINK),
    ('06  REVIEW', 'Customer API authorizes metadata\nthen signs regional S3 evidence URLs.', 'src/api/routes.mjs', BLUE),
]
for i, (heading, detail, file, color) in enumerate(stages):
    x = 4 + ((i % 3) if i < 3 else (5 - i))*32
    y = 57 if i < 3 else 23
    box(ax, x, y, 28, 22, heading, detail, color)
    ax.text(x+1.5, y+2.2, file, fontsize=8.2, color=color)
for start, end in [((32,68),(36,68)), ((64,68),(68,68)), ((82,57),(82,45)),
                   ((68,34),(64,34)), ((36,34),(32,34))]:
    arrow(ax, start, end, PINK)
ax.text(50, 10, 'A target outage consumes a capture credit  ·  infrastructure failure refunds it  ·  retries reuse the run/result',
        ha='center', color=INK, fontsize=10,
        bbox={'boxstyle':'round,pad=.8', 'facecolor':PANEL, 'edgecolor':ROSE})
finish(fig, ax, 'regional-check.svg', 'Sources: src/aws/{dispatcher,worker,regional-capture-worker}.mjs · src/monitoring/regional-coordinator.mjs')


def page(filename, eyebrow, title, intro, svg, sections):
    cards = ''.join(f'<article><h2>{heading}</h2><p>{body}</p></article>' for heading, body in sections)
    (OUT / filename).write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · CLOVERSIGHT engineering</title><style>
:root{{color-scheme:dark}}*{{box-sizing:border-box}}body{{margin:0;background:#100e17;color:#fff9fd;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}}a{{color:#f09bc9}}header,main,footer{{max-width:1420px;margin:auto;padding:28px clamp(20px,4vw,70px)}}header{{display:flex;justify-content:space-between;border-bottom:1px solid #403349}}.brand{{font-weight:800;letter-spacing:.05em}}.brand:before{{content:'◉';color:#ee7cbc;margin-right:10px}}.eyebrow{{color:#e6b75e;text-transform:uppercase;letter-spacing:.18em;font-size:.78rem;font-weight:800}}h1{{font-size:clamp(2.3rem,5vw,4.6rem);line-height:1.1;max-width:900px;margin:.2em 0}}.lede{{color:#c9bece;max-width:850px;font-size:1.15rem}}figure{{background:linear-gradient(150deg,#1b1724,#2b1e30);border:1px solid #624051;border-radius:22px;margin:36px 0;padding:12px}}figure img{{display:block;width:100%;height:auto}}figcaption{{padding:12px;color:#bbb3c6;font-size:.87rem}}.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:18px}}article{{border:1px solid #50384f;border-radius:18px;background:#201c2b;padding:18px 22px}}h2{{color:#f5a6cf;font-size:1.1rem;margin:0}}p{{margin:.5em 0}}footer{{color:#bbb3c6;font-size:.88rem}}@media print{{body,figure,article{{background:white;color:#16121c}}.lede,footer,figcaption{{color:#444}}}}
</style></head><body><header><div class="brand">CLOVERSIGHT <span style="color:#bbb3c6;font-weight:400">/ engineering</span></div><nav><a href="../architecture.md">Architecture notes</a> · <a href="../documentation.md">Docs workflow</a></nav></header>
<main><p class="eyebrow">{eyebrow}</p><h1>{title}</h1><p class="lede">{intro}</p>
<figure><img src="{svg}" alt="{title}: labeled boxes and arrows described in the notes below"><figcaption>Source linked map of the 0.5.9 repository. Illustrates configured paths, not deployed health or live status.</figcaption></figure><section class="cards" aria-label="Diagram notes">{cards}</section></main>
<footer>CLOVERSIGHT engineering atlas · Generated by <code>scripts/generate-architecture.py</code> · Consult the source files and deployment runbooks for exact conditions.</footer></body></html>''')


page('system-landscape.html', 'Map 01 / system boundaries', 'The CLOVERSIGHT system',
     'The three browser surfaces share visual and authentication code. The primary Region owns identity, billing, scheduling, and metadata; browser captures and evidence remain in their selected AWS Regions.',
     'system-landscape.svg', [
         ('Local runtime', 'src/server.mjs serves the static sites and API with FileStore and LocalAssets. It runs the same product services against local data.'),
         ('AWS control plane', 'infra/cloudformation/webwatch.yaml defines CloudFront, Cognito, HTTP API, DynamoDB, primary S3, queues, workers, SES, WAF, and alarms.'),
         ('Regional plane', 'infra/cloudformation/regional-capture.yaml defines a queue, browser Lambda, and private evidence bucket in each configured secondary Region.')])
page('regional-check.html', 'Map 02 / transaction lifecycle', 'From schedule to evidence',
     'A check is claimed centrally, dispatched to selected Regions, compared near its evidence, and committed only after compact results return or the deadline settles missing Regions.',
     'regional-check.svg', [
         ('Scheduling', '32 sharded due partitions feed the primary check queue. A lease prevents overlapping watcher checks.'),
         ('Capture', 'Each regional worker writes content-addressed evidence and a replayable run result before sending compact result metadata.'),
         ('Result and review', 'The primary worker aggregates durable per-region results, evaluates alerts, and exposes account-authorized metadata with short-lived evidence URLs.')])
print('Generated two SVG maps and two standalone reference pages.')
