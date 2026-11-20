# Worker build DNS hotfix for 0.5.8

This source snapshot retains the application release marker `0.5.8` and all prior 0.5.8 application changes. It adds an optional network mode to `infra/scripts/build-worker-image.sh`. The default still uses Docker's standard build network.

On the reported OpenSUSE workstation, the host resolves `registry.npmjs.org`, while a fresh Docker Buildx `RUN` step using DNS server `192.168.1.1` fails. The worker image fails at its npm installation step with `EAI_AGAIN`, before it can be pushed to ECR. The host-network setting is an opt-in workaround for this local build problem; it does not change Lambda networking or AWS infrastructure.

First prove host-network DNS works using a **fresh, uncached** build step. Run this single command in a terminal:

```bash
printf 'FROM public.ecr.aws/lambda/nodejs@sha256:7679eb91ec13e83517cffbbefdd4bf56b0f556ebb56b724c15f86d13ef84f25b\nRUN getent ahostsv4 registry.npmjs.org\n' | docker buildx build --progress=plain --no-cache --pull=false --platform linux/amd64 --network=host --allow=network.host -
```

If it lists IP addresses and finishes successfully, use `WEBWATCH_WORKER_BUILD_NETWORK=host npm run aws:build-worker` from the **new** project directory after copying your private `.env` there. Do not retry the full worker build if the fresh probe fails; inspect that error instead. BuildKit may reject host networking if its entitlement is disabled, in which case the builder or local Docker networking needs repair. Host-network steps share the workstation's network namespace during image construction, so use this only for trusted build inputs and keep the default isolated mode after local Docker DNS is fixed.

The build script is an input to the immutable worker image source hash. Build a fresh worker image from this snapshot, set `WORKER_IMAGE_URI` in the new directory's `.env` to the digest printed by `.local/worker-image.env`, and deploy the primary, regional, and web components following `docs/deployment.md`. Do not reuse an image built from the earlier 0.5.8 source folder.

This hotfix has not been built, run, or deployed by its author. The fresh host-network probe in the previous exchange returned a cached layer and therefore did not establish whether host networking currently resolves npm.
