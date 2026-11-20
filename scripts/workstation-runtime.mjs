// Node 24 is a workstation candidate for owner testing. AWS remains on Node 22.
export const workstationNodeMajors = Object.freeze([22, 24]);

export function assertWorkstationNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (!workstationNodeMajors.includes(major)) throw new Error('Use Node.js 22 or 24 LTS with npm 10+. See docs/node24-dependency-upgrade.md.');
  return major;
}
