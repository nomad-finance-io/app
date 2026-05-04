# app-infra

CDK stack that deploys the Vite SPA to `https://app.nomadfinance.io`.

## Architecture

- **S3** private bucket (encryption + TLS-only) holds the built `dist/`
- **CloudFront** distribution fronts the bucket via Origin Access Control (OAC)
- **ACM** TLS certificate (DNS validated against the existing hosted zone)
- **Route 53** A and AAAA alias records for `app.nomadfinance.io`
- SPA fallback: `403`/`404` → `/index.html` (200) so client routes work
- Hashed assets in `assets/*` get `public, max-age=31536000, immutable`
- Root files (`index.html`, etc.) get `no-cache, must-revalidate`

The whole stack runs in `us-east-1` so the ACM cert is co-located with CloudFront.

## Prerequisites

- AWS CLI profile `unnatural-selection` configured
- A Route 53 hosted zone for `nomadfinance.io` in that account
- Node 20+
- The CDK account/region already bootstrapped:
  ```sh
  AWS_PROFILE=unnatural-selection npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1
  ```

## Install

```sh
cd infra
npm install
```

## Build the SPA first

`BucketDeployment` packages `../dist`, so build the app before any deploy:

```sh
cd ..
npm run build
cd infra
```

## Commands

All commands need the AWS profile:

```sh
AWS_PROFILE=unnatural-selection npm run synth
AWS_PROFILE=unnatural-selection npm run diff
AWS_PROFILE=unnatural-selection npm run deploy
AWS_PROFILE=unnatural-selection npm run destroy
```

## Notes

- The S3 bucket has `RemovalPolicy.RETAIN`. To fully tear down, empty and delete it manually after `cdk destroy`.
- Subsequent SPA deploys: rebuild `../dist`, then `npm run deploy`. CloudFront invalidation is handled automatically by `BucketDeployment`.
