import * as path from 'node:path';
import {
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_route53 as route53,
  aws_route53_targets as targets,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface SiteStackProps extends StackProps {
  readonly domainName: string;
  readonly hostedZoneName: string;
  readonly siteAssetsPath: string;
}

export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneName, siteAssetsPath } = props;

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: hostedZoneName,
    });

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: domainName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    const certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const spaErrorResponses: cloudfront.ErrorResponse[] = [403, 404].map((status) => ({
      httpStatus: status,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
      ttl: Duration.minutes(5),
    }));

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate,
      domainNames: [domainName],
      defaultRootObject: 'index.html',
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      errorResponses: spaErrorResponses,
    });

    new route53.ARecord(this, 'AliasRecordA', {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      deleteExisting: true,
    });

    new route53.AaaaRecord(this, 'AliasRecordAAAA', {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      deleteExisting: true,
    });

    const assetsPath = path.resolve(__dirname, '..', siteAssetsPath);

    new s3deploy.BucketDeployment(this, 'DeployHashedAssets', {
      sources: [s3deploy.Source.asset(assetsPath)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true,
      exclude: ['*'],
      include: ['assets/*'],
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(Duration.days(365)),
        s3deploy.CacheControl.immutable(),
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeployRootFiles', {
      sources: [s3deploy.Source.asset(assetsPath)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/index.html', '/'],
      prune: false,
      exclude: ['assets/*'],
      cacheControl: [
        s3deploy.CacheControl.noCache(),
        s3deploy.CacheControl.mustRevalidate(),
      ],
    });
  }
}
