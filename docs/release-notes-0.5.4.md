# CLOVERSIGHT 0.5.4 release notes

The 0.5.3 test suite passed, but the subsequent CloudFormation source validation stopped at a Python `SyntaxError`: the embedded parser used JavaScript's `&&` in an assertion. This release uses Python's `and`. It also replaces four obsolete `assert True or ...` expressions with meaningful template checks that match the existing CloudFront and resource-retention configuration and asserts that the API stage depends on `TeamProxyRoute`.

The API architecture, Stripe plan catalogue, and customer application behavior are unchanged from 0.5.3. `npm run verify` has not been executed by the project author for this release. Before deployment, complete any outstanding CloudFormation rollback as documented in `docs/deployment.md`. A newly built immutable worker image is required for the 0.5.4 package marker.
