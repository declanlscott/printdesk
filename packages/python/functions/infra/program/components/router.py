import re
from typing import Optional

import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from sst import Resource

from . import ssl
from utils import naming, tags


class RouterArgs:
    def __init__(self,
                 tenant_id: str,
                 secret: pulumi.Input[str],
                 api_domain_name: pulumi.Input[str],
                 assets_domain_name: pulumi.Input[str],
                 documents_domain_name: pulumi.Input[str]):
        self.tenant_id = tenant_id
        self.secret = secret
        self.api_domain_name = api_domain_name
        self.assets_domain_name = assets_domain_name
        self.documents_domain_name = documents_domain_name


class Router(pulumi.ComponentResource):
    def __init__(self, args: RouterArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:Router",
            name="Router",
            props=vars(args),
            opts=opts
        )

        self.__cdn_ssl = ssl.DnsValidatedCertificate(
            name="Cdn",
            args=ssl.DnsValidatedCertificateArgs(
                tenant_id=args.tenant_id,
                domain_name=naming.template(Resource.TenantDomains.cdn.nameTemplate, args.tenant_id),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__key_value_store = aws.cloudfront.KeyValueStore(
            resource_name="KeyValueStore",
            opts=pulumi.ResourceOptions(parent=self)
        )

        kv_namespace = naming.build_kv_namespace("Router")

        class Pattern:
            def __init__(self, host: str, path: str):
                self.host = host
                self.path = path

        def parse_pattern(pattern: str):
            parts = pattern.split("/")
            host = parts[0]
            path = "/" + "/".join(parts[1:])

            escaped = re.sub(r'[.+?^${}()|[\]\\]', r'\\\g<0>', host) # Escape special regex chars
            escaped = escaped.replace("*", ".*") # Replace * with .*

            return Pattern(host=escaped, path=path)

        api_namespace = naming.build_kv_namespace("Api")
        api_pattern: pulumi.Output[Pattern] = self.__cdn_ssl.certificate.domain_name.apply(
            lambda domain_name: parse_pattern(f"{domain_name}/api")
        )

        assets_namespace = naming.build_kv_namespace("Assets")
        assets_pattern: pulumi.Output[Pattern] = self.__cdn_ssl.certificate.domain_name.apply(
            lambda domain_name: parse_pattern(f"{domain_name}/assets")
        )

        documents_namespace = naming.build_kv_namespace("Documents")
        documents_pattern: pulumi.Output[Pattern] = self.__cdn_ssl.certificate.domain_name.apply(
            lambda domain_name: parse_pattern(f"{domain_name}/documents")
        )

        self.__key_value_pairs = aws.cloudfront.KeyvaluestoreKeysExclusive(
            resource_name="KeyValuePairs",
            args=aws.cloudfront.KeyvaluestoreKeysExclusiveArgs(
                key_value_store_arn=self.__key_value_store.arn,
                resource_key_value_pairs=[
                    aws.cloudfront.KeyvaluestoreKeysExclusiveResourceKeyValuePairArgs(
                        key=f"{kv_namespace}:routes",
                        # NOTE: If size of value exceeds 1KB, chunking needs to be implemented
                        # Quota: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-keyvaluestores
                        # Reference implementation: https://github.com/sst/sst/blob/19b85a752620151232715a720331aeabd0c1ab4b/pkg/server/resource/aws-kv-routes-update.go#L325
                        value=pulumi.Output.json_dumps([
                            f"url,{api_namespace},{api_pattern.host},{api_pattern.path}",
                            f"bucket,{assets_namespace},{assets_pattern.host},{assets_pattern.path}",
                            f"bucket,{documents_namespace},{documents_pattern.host},{documents_pattern.path}",
                        ]),
                    ),
                    aws.cloudfront.KeyvaluestoreKeysExclusiveResourceKeyValuePairArgs(
                        key=f"{api_namespace}:metadata",
                        value=pulumi.Output.json_dumps({
                            "host": args.api_domain_name,
                            "rewrite": {
                                "regex": "^/api/(.*)$",
                                "to": "/$1",
                            },
                        }),
                    ),
                    aws.cloudfront.KeyvaluestoreKeysExclusiveResourceKeyValuePairArgs(
                        key=f"{assets_namespace}:metadata",
                        value=pulumi.Output.json_dumps({
                            "domain": args.assets_domain_name,
                            "rewrite": {
                                "regex": "^/assets/(.*)$",
                                "to": "/$1",
                            },
                        }),
                    ),
                    aws.cloudfront.KeyvaluestoreKeysExclusiveResourceKeyValuePairArgs(
                        key=f"{documents_namespace}:metadata",
                        value=pulumi.Output.json_dumps({
                            "domain": args.documents_domain_name,
                            "rewrite": {
                                "regex": "^/documents/(.*)$",
                                "to": "/$1",
                            },
                        }),
                    ),
                ],
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.__request_function = aws.cloudfront.Function(
            resource_name="RequestFunction",
            args=aws.cloudfront.FunctionArgs(
                runtime="cloudfront-js-2.0",
                key_value_store_associations=[self.__key_value_store.arn],
                code=pulumi.Output.format("""// This code is adapted from SST (MIT License).
// https://github.com/sst/sst/blob/432418a2bb8d55584aace24982a90782e8b83431/platform/src/components/aws/router.ts#L1481
import cf from "cloudfront";
async function handler(event) {
  if (event.request.headers.host.value === "{0}" && event.request.uri.startsWith("/api")) {
    event.request.headers["{1}"] = {
      value: "{2}",
    };
  }
  
  if (event.request.headers.host.value.includes('cloudfront.net')) {
    return {
      statusCode: 403,
      statusDescription: 'Forbidden',
      body: {
        encoding: "text",
        data: '<html><head><title>403 Forbidden</title></head><body><center><h1>403 Forbidden</h1></center></body></html>'
      }
    };
  }

  function setUrlOrigin(urlHost, override) {
    event.request.headers["x-forwarded-host"] = event.request.headers.host;
    const origin = {
      domainName: urlHost,
      customOriginConfig: {
        port: 443,
        protocol: "https",
        sslProtocols: ["TLSv1.2"],
      },
      originAccessControlConfig: {
        enabled: false,
      }
    };
    override = override ?? {};
    if (override.protocol === "http") {
      delete origin.customOriginConfig;
    }
    if (override.connectionAttempts) {
      origin.connectionAttempts = override.connectionAttempts;
    }
    if (override.timeouts) {
      origin.timeouts = override.timeouts;
    }
    cf.updateRequestOrigin(origin);
  }

  function setS3Origin(s3Domain, override) {
    delete event.request.headers["Cookies"];
    delete event.request.headers["cookies"];
    delete event.request.cookies;

    const origin = {
      domainName: s3Domain,
      originAccessControlConfig: {
        enabled: true,
        signingBehavior: "always",
        signingProtocol: "sigv4",
        originType: "s3",
      }
    };
    override = override ?? {};
    if (override.connectionAttempts) {
      origin.connectionAttempts = override.connectionAttempts;
    }
    if (override.timeouts) {
      origin.timeouts = override.timeouts;
    }
    cf.updateRequestOrigin(origin);
  }

  const routerNS = "{3}";

  async function getRoutes() {
    let routes = [];
    try {
      const v = await cf.kvs().get(routerNS + ":routes");
      routes = JSON.parse(v);

      // handle chunked routes
      if (routes.parts) {
        const chunkPromises = [];
        for (let i = 0; i < routes.parts; i++) {
          chunkPromises.push(cf.kvs().get(routerNS + ":routes:" + i));
        }
        const chunks = await Promise.all(chunkPromises);
        routes = JSON.parse(chunks.join(""));
      }
    } catch (e) {}
    return routes;
  }

  async function matchRoute(routes) {
    const requestHost = event.request.headers.host.value;
    const requestHostWithEscapedDots = requestHost.replace(/\./g, "\\.");
    const requestHostRegexPattern = "^" + requestHost + "$";
    let match;
    routes.forEach(r => {
      var parts = r.split(",");
      const type = parts[0];
      const routeNs = parts[1];
      const host = parts[2];
      const hostLength = host.length;
      const path = parts[3];
      const pathLength = path.length;

      // Do not consider if the current match is a better winner
      if (match && (
          hostLength < match.hostLength
          || (hostLength === match.hostLength && pathLength < match.pathLength)
      )) return;

      const hostMatches = host === ""
        || host === requestHostWithEscapedDots
        || (host.includes("*") && new RegExp(host).test(requestHostRegexPattern));
      if (!hostMatches) return;

      const pathMatches = event.request.uri.startsWith(path);
      if (!pathMatches) return;

      match = {
        type,
        routeNs,
        host,
        hostLength,
        path,
        pathLength,
      };
    });

    // Load metadata
    if (match) {
      try {
        const type = match.type;
        const routeNs = match.routeNs;
        const v = await cf.kvs().get(routeNs + ":metadata");
        return { type, routeNs, metadata: JSON.parse(v) };
      } catch (e) {}
    }
  }

  // Look up the route
  const routes = await getRoutes();
  const route = await matchRoute(routes);
  if (!route) return event.request;
  if (route.metadata.rewrite) {
    const rw = route.metadata.rewrite;
    event.request.uri = event.request.uri.replace(new RegExp(rw.regex), rw.to);
  }
  if (route.type === "url") setUrlOrigin(route.metadata.host, route.metadata.origin);
  if (route.type === "bucket") setS3Origin(route.metadata.domain, route.metadata.origin);
  return event.request;
}""",
                                          self.__cdn_ssl.certificate.domain_name,
                                          Resource.HeaderNames.ROUTER_SECRET,
                                          args.secret,
                                          kv_namespace),
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__distribution = aws.cloudfront.Distribution(
            resource_name="Distribution",
            args=aws.cloudfront.DistributionArgs(
                enabled=True,
                comment=f"{args.tenant_id} router",
                origins=[
                    aws.cloudfront.DistributionOriginArgs(
                        origin_id="default",
                        domain_name="placeholder.printdesk.app",
                        custom_origin_config=aws.cloudfront.DistributionOriginCustomOriginConfigArgs(
                            http_port=80,
                            https_port=443,
                            origin_protocol_policy="https-only",
                            origin_read_timeout=20,
                            origin_ssl_protocols=["TLSv1.2"]
                        )
                    )
                ],
                default_cache_behavior=aws.cloudfront.DistributionDefaultCacheBehaviorArgs(
                    target_origin_id="default",
                    viewer_protocol_policy="redirect-to-https",
                    allowed_methods=[
                        "DELETE",
                        "GET",
                        "HEAD",
                        "OPTIONS",
                        "PATCH",
                        "POST",
                        "PUT",
                    ],
                    cached_methods=["GET", "HEAD"],
                    compress=True,
                    cache_policy_id=Resource.CloudfrontApiCachePolicy.id,
                    origin_request_policy_id=aws.cloudfront.get_origin_request_policy_output(
                        name="Managed-AllViewerExceptHostHeader",
                    ).id,
                    trusted_key_groups=[Resource.CloudfrontKeyGroup.id],
                    function_associations=[
                        aws.cloudfront.DistributionDefaultCacheBehaviorFunctionAssociationArgs(
                            event_type="viewer-request",
                            function_arn=self.__request_function.arn,
                        ),
                    ]
                ),
                restrictions=aws.cloudfront.DistributionRestrictionsArgs(
                    geo_restriction=aws.cloudfront.DistributionRestrictionsGeoRestrictionArgs(
                        restriction_type="none"
                    )
                ),
                aliases=[self.__cdn_ssl.certificate.domain_name],
                viewer_certificate=aws.cloudfront.DistributionViewerCertificateArgs(
                    acm_certificate_arn=self.__cdn_ssl.certificate.arn,
                    ssl_support_method="sni-only",
                    minimum_protocol_version="TLSv1.2_2021",
                ),
                wait_for_deployment=False,
                price_class="PriceClass_100",
                tags=tags(args.tenant_id)
            ),
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.__cdn_alias_record = cloudflare.Record(
            resource_name="CdnAliasRecord",
            args=cloudflare.RecordArgs(
                zone_id=Resource.Zone.id,
                type="CNAME",
                name=self.__cdn_ssl.certificate.domain_name,
                content=self.__distribution.domain_name,
                ttl=1,
                proxied=True,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                delete_before_replace=True,
            )
        )

        self.register_outputs({
            "key_value_store": self.__key_value_store.id,
            "key_value_pairs": self.__key_value_pairs.id,
            "request_function": self.__request_function.id,
            "distribution": self.__distribution.id,
            "cdn_alias_record": self.__cdn_alias_record.id,
        })
