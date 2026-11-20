# SMS verification fixture correction — 2026-09-26

The user-run `npm run verify` reported 167 passing tests and one failing SMS template test. The fixture used the seeded Free plan, which correctly denies SMS recipients before the template-validation scenario reaches its successful save. The SMS template test and the SMS-disabled deployment test now use the local Essentials plan to isolate their intended rules. A separate test retains direct coverage of the Free plan's SMS denial even when the template is valid.

This change affects tests and documentation only. The project code, build script, and deployed services are unchanged. The updated suite and the remainder of `verify` have not yet been run by the project author against this ZIP.
