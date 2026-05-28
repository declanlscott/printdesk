import json
from typing import TypedDict, Optional, Dict, Any, List

import pulumi

from utils import Cloudflare


class VpcServiceBindingProviderInputs(TypedDict):
    script_name: str
    name: str
    service_id: str


class VpcServiceBindingProviderOutputs(VpcServiceBindingProviderInputs):
    pass


class VpcServiceBindingProvider(pulumi.dynamic.ResourceProvider):
    def __init__(self):
        super().__init__()
        self._cloudflare: Optional[Cloudflare] = None

    def configure(self, req: pulumi.dynamic.ConfigureRequest):
        self._cloudflare = Cloudflare(
            account_id=req.config.require("cloudflareAccountId"),
            api_token=req.config.require("cloudflare:apiToken"),
        )

    def _get_bindings(self, script_name: str) -> List[Dict[str, Any]]:
        return (
            self._cloudflare.request(
                resource=f"/accounts/{self._cloudflare.account_id}/workers/scripts/{script_name}/settings",
            ).result["bindings"]
            or []
        )

    def _set_bindings(self, script_name: str, bindings: List[Dict[str, Any]]):
        files = {"settings": (None, json.dumps({"bindings": bindings}))}

        self._cloudflare.request(
            resource=f"/accounts/{self._cloudflare.account_id}/workers/scripts/{script_name}/settings",
            method="PATCH",
            files=files,
        )

    def create(
        self, props: VpcServiceBindingProviderInputs
    ) -> pulumi.dynamic.CreateResult:
        bindings = self._get_bindings(script_name=props["script_name"])

        if any(binding["name"] == props["name"] for binding in bindings):
            raise ValueError(
                f'Worker script "{props["script_name"]}" already has existing binding named "{props["name"]}".'
            )

        self._set_bindings(
            script_name=props["script_name"],
            bindings=[
                *bindings,
                {
                    "type": "vpc_service",
                    "name": props["name"],
                    "service_id": props["service_id"],
                },
            ],
        )

        return pulumi.dynamic.CreateResult(
            id_=f"{props['script_name']}:{props['name']}", outs=dict(props)
        )

    def read(
        self, id_: str, props: VpcServiceBindingProviderOutputs
    ) -> pulumi.dynamic.ReadResult:
        bindings = self._get_bindings(script_name=props["script_name"])

        binding = next(
            (binding for binding in bindings if binding["name"] == props["name"]), None
        )
        if not binding:
            raise ValueError(
                f'Worker script "{props["script_name"]}" is missing VPC service binding "{props["name"]}".'
            )

        return pulumi.dynamic.ReadResult(
            id_=id_,
            outs={
                "script_name": props["script_name"],
                **binding,
            },
        )

    def update(
        self,
        _id: str,
        _olds: VpcServiceBindingProviderOutputs,
        _news: VpcServiceBindingProviderInputs,
    ) -> pulumi.dynamic.UpdateResult:
        bindings = [
            binding
            for binding in (self._get_bindings(script_name=_olds["script_name"]))
            if binding["name"] != _olds["name"]
        ]

        self._set_bindings(
            script_name=_news["script_name"],
            bindings=[
                *bindings,
                {
                    "type": "vpc_service",
                    "name": _news["name"],
                    "service_id": _news["service_id"],
                },
            ],
        )

        return pulumi.dynamic.UpdateResult(outs=dict(_news))

    def delete(self, _id: str, _props: VpcServiceBindingProviderOutputs):
        self._set_bindings(
            script_name=_props["script_name"],
            bindings=[
                binding
                for binding in (self._get_bindings(script_name=_props["script_name"]))
                if binding["name"] != _props["name"]
            ],
        )
