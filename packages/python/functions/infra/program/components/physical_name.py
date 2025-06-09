from typing import Optional

import pulumi
import pulumi_random as random

from utils import naming


class PhysicalNameArgs:
    def __init__(self, max_: int, suffix: Optional[str] = None):
        self.max = max_
        self.suffix = suffix


class PhysicalName(pulumi.ComponentResource):
    def __init__(self, name: str, args: PhysicalNameArgs, opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__(
            t="pd:resource:PhysicalName",
            name=name,
            props=vars(args),
            opts=opts
        )

        self.__main = pulumi.Output.from_input(naming.prefix_name(args.max - 9 - len(args.suffix), name))

        self.__random_suffix: pulumi.Output[str] = random.RandomBytes(
            resource_name=f"{name}PhysicalNameRandomSuffix",
            args=random.RandomBytesArgs(length=8),
            opts=pulumi.ResourceOptions(parent=self)
        ).hex.apply(lambda hex: naming.hash_string_to_pretty_string(hex, 8))

        self.__result = pulumi.Output.format("{0}-{1}", self.__main, self.__random_suffix)

        self.register_outputs(
            {
                "main": self.__main,
                "randomSuffix": self.__random_suffix,
                "result": self.__result
            }
        )

    @property
    def result(self):
        return self.__result
