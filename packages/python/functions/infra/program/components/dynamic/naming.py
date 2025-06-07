# Ported to python from https://github.com/sst/sst/blob/a3fd8fa92d559c91b89731faa6a9b843c60f95af/platform/src/components/naming.ts by SST

import hashlib
import re

from sst import Resource

PRETTY_CHARS = "abcdefhkmnorstuvwxz"


def logical_name(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9]", "", name)
    return name[0].upper() + name[1:]


def physical_name(max_length: int, name: str, tenant_id: str, suffix: str = "") -> str:
    # This function does the following:
    # - Removes all non-alphanumeric characters
    # - Prefixes the name with the project and stack names
    # - Truncates the name if it's too long

    name = re.sub(r"[^a-zA-Z0-9]", "", name)

    def get_prefixed_name() -> str:
        l = max_length - len(suffix)
        project = f"pd-{Resource.AppData.stage}"
        stack = tenant_id
        project_len = len(project)
        stack_len = len(stack)
        name_len = len(name)

        if project_len + stack_len + name_len + 2 <= l:
            return f"{project}-{stack}-{name}"

        if stack_len + name_len + 1 <= l:
            project_truncated = project[: l - stack_len - name_len - 2]
            return (
                f"{project_truncated}-{stack}-{name}"
                if project_truncated
                else f"{project}-{name}"
            )

        stack_truncated = stack[: max(8, l - name_len - 1)]
        name_truncated = name[: l - len(stack_truncated) - 1]
        return f"{stack_truncated}-{name_truncated}"

    prefixed_name = get_prefixed_name()
    return f"{prefixed_name}{suffix}"


def hash_number_to_pretty_string(number: int, length: int) -> str:
    char_length = len(PRETTY_CHARS)
    hash_str = ""
    while number > 0:
        hash_str = PRETTY_CHARS[number % char_length] + hash_str
        number = number // char_length

    # Padding with 's'
    hash_str = hash_str[:length]
    while len(hash_str) < length:
        hash_str = "s" + hash_str

    return hash_str


def hash_string_to_pretty_string(input_str: str, length: int) -> str:
    hash_obj = hashlib.sha256(input_str.encode())
    hex_digest = hash_obj.hexdigest()
    num = int(hex_digest[:16], 16)
    return hash_number_to_pretty_string(num, length)
