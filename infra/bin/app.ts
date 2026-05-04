#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SiteStack } from '../lib/site-stack';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
if (!account) {
  throw new Error(
    'CDK_DEFAULT_ACCOUNT is not set. Run with: AWS_PROFILE=unnatural-selection npx cdk <command>',
  );
}

new SiteStack(app, 'NomadAppSiteStack', {
  env: { account, region: 'us-east-1' },
  domainName: 'app.nomadfinance.io',
  hostedZoneName: 'nomadfinance.io',
  siteAssetsPath: '../dist',
  description: 'app.nomadfinance.io static site (S3 + CloudFront + ACM + Route 53)',
});
