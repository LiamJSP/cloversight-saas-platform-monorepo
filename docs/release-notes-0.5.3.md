# CLOVERSIGHT 0.5.3 release notes

The API Gateway stage has route-level throttling for `ANY /api/team/{proxy+}`. Because the stage identified that route by a literal key, CloudFormation had no dependency on `TeamProxyRoute` and could update the stage before creating the route. Release 0.5.3 declares the dependency explicitly and retains the existing rate limits, route authorization, and infrastructure resource identifiers.

An existing `UPDATE_ROLLBACK_FAILED` stack must be recovered before deploying 0.5.3. Check the route's live state and CloudFormation ownership as described in `docs/deployment.md`. A new dependency affects subsequent updates; it does not repair a currently running rollback or recreate a route whose stack-owned physical resource was deleted outside CloudFormation.

Release 0.5.3 changes the package version, so its worker source/image contract requires building and pushing a new immutable worker image before the primary and regional deployments. The Stripe catalogue is unchanged.
