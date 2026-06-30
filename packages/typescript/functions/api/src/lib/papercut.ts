import { Appconfig } from "@printdesk/core/aws/appconfig";
import { AppconfigAgent } from "@printdesk/core/aws/appconfig/agent";
import * as Config from "@printdesk/core/config/layer";
import * as PapercutApi from "@printdesk/core/papercut/api/layer";
import { SstResource } from "@printdesk/core/sst/resource";
import { Xml } from "@printdesk/core/xml";
import { XmlRpc } from "@printdesk/core/xml/rpc";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

export const papercutApiLayer = PapercutApi.layer.pipe(
  Layer.provide([Config.layer, XmlRpc.XmlRpc.layer("/")]),
  Layer.provide([Appconfig.layer, AppconfigAgent.layer, Xml.Builder.layer, Xml.Parser.layer]),
  Layer.provide([FetchHttpClient.layer, SstResource.layer]),
);
