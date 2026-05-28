import re
import math
import hashlib
import os
from typing import Dict, Tuple, Optional, Callable

import pulumi
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
from sst import Resource


def template(name_template: str, tenant_id: str) -> str:
    return name_template.replace("{{tenant_id}}", tenant_id)


def build_kv_namespace(name: str):
    data = f"{Resource.App.name}-{Resource.App.stage}-{name}"
    return hashlib.md5(data.encode("utf-8")).hexdigest()[:4]


class TransformOptions:
    def __init__(
        self,
        lower: Optional[bool] = None,
        suffix: Optional[Callable[[pulumi.Inputs], pulumi.Output[str]]] = None,
    ):
        self.lower = lower
        self.suffix = suffix


def transform_resource(tenant_id: str):
    rules: Dict[str, Tuple[str, int, Optional[TransformOptions]]] = {
        str(aws.appconfig.ConfigurationProfile.pulumi_resource_type): (
            "name",
            128,
            None,
        ),
        str(aws.iam.Role.pulumi_resource_type): ("name", 64, None),
        str(aws.scheduler.Schedule.pulumi_resource_type): ("name", 64, None),
        str(aws.sqs.Queue.pulumi_resource_type): (
            "name",
            80,
            TransformOptions(
                suffix=lambda props: pulumi.Output.from_input(
                    props.get("fifo_queue")
                ).apply(lambda fifo: ".fifo" if fifo else "")
            ),
        ),
        str(cloudflare.ConnectivityDirectoryService.pulumi_resource_type): (
            "name",
            64,
            None,
        ),
        str(cloudflare.ZeroTrustTunnelCloudflared.pulumi_resource_type): (
            "name",
            64,
            None,
        ),
        str(cloudflare.WorkersScript.pulumi_resource_type): (
            "script_name",
            54,
            TransformOptions(lower=True),
        ),
    }

    def transform(args: pulumi.ResourceTransformationArgs):
        rule = rules.get(args.type_)
        if rule is None:
            return None

        name: str = rule[0]
        max_: int = rule[1]
        opts: TransformOptions = rule[2]

        if name in args.props:
            return None

        suffix = (
            pulumi.Output.format("{0}{1}", tenant_id, opts.suffix(args.props))
            if opts is not None and opts.suffix is not None
            else pulumi.Output.from_input(tenant_id)
        )

        return pulumi.ResourceTransformationResult(
            props={
                **args.props,
                name: suffix.apply(
                    lambda suffix: (
                        physical(max_=max_, name=args.name, suffix=suffix)
                        if opts is None or opts.lower is False
                        else physical(max_=max_, name=args.name, suffix=suffix).lower()
                    )
                ),
            },
            opts=args.opts,
        )

    return transform


# Ported to python from https://github.com/sst/sst/blob/dev/platform/src/components/naming.ts by SST
PRETTY_CHARS = "abcdefhkmnorstuvwxz"


def logical(name: str):
    name = re.sub(r"[^a-zA-Z0-9]", "", name)
    return name[0].upper() + name[1:] if name else ""


def hash_number_to_pretty_string(number: int, length: int):
    char_length = len(PRETTY_CHARS)
    hash_ = ""
    while number > 0:
        hash_ = PRETTY_CHARS[number % char_length] + hash_
        number = math.floor(number / char_length)

    # Padding with 's'
    hash_ = hash_[:length]
    while len(hash_) < length:
        hash_ = "s" + hash_

    return hash_


def hash_string_to_pretty_string(s: str, length: int):
    hash_ = hashlib.sha256()
    hash_.update(s.encode("utf-8"))
    num = int(hash_.hexdigest()[:16], 16)
    return hash_number_to_pretty_string(num, length)


def prefix(max_: int, name: str):
    """
    This function does the following:
    - Removes all non-alphanumeric characters
    - Prefixes the name with the app name and stage
    - Truncates the name if it's too long
    i.e. foo => app-stage-foo
    """
    name = re.sub(r"[^a-zA-Z0-9]", "", name)

    stage_len = len(Resource.App.stage)
    name_len = len(name)
    if name_len + 1 >= max_:
        strategy = "name"
    elif name_len + stage_len + 2 >= max_:
        strategy = "stage+name"
    else:
        strategy = "app+stage+name"

    if strategy == "name":
        return name[:max_]
    elif strategy == "stage+name":
        return f"{Resource.App.stage[: max_ - name_len - 1]}-{name}"
    else:
        return (
            f"{Resource.App.name[: max_ - stage_len - name_len - 2]}-"
            f"{Resource.App.stage}-{name}"
        )


def physical(max_: int, name: str, suffix: str = ""):
    """
    This function does the following:
    - Removes all non-alphanumeric characters
    - Prefixes the name with the app name and stage
    - Truncates the name if it's too long
    - Adds a random suffix
    - Adds a suffix if provided
    """
    main = prefix(max_ - 9 - len(suffix), name)
    random_pretty = hash_string_to_pretty_string(os.urandom(8).hex(), 8)
    return f"{main}-{random_pretty}{suffix}"
