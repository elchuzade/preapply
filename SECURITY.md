# Security policy

PreApply is a browser extension that runs on accelerator websites, so security reports matter even though it has no server.

## Reporting a vulnerability

Please **don't open a public issue**. Use GitHub's [private vulnerability reporting](https://github.com/elchuzade/preapply/security/advisories/new) instead. You'll get a reply within 7 days.

Especially relevant:

- anything that lets a web page read PreApply's saved answers or reach into its UI
- data files that could inject markup or script into the panel
- the extension making network requests to anything other than the jsDelivr data URL

## Supported versions

Only the latest release gets security fixes.
