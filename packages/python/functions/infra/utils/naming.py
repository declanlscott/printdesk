# # Ported to python from https://github.com/sst/sst/blob/dev/platform/src/components/naming.ts by SST

import re
import math
import hashlib
import os

from sst import Resource

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
    hash_.update(s.encode('utf-8'))
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

    stage_len = len(Resource.AppData.stage)
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
        return f"{Resource.AppData.stage[:max_ - name_len - 1]}-{name}"
    else:
        return (
            f"{Resource.AppData.name[:max_ - stage_len - name_len - 2]}-"
            f"{Resource.AppData.stage}-{name}"
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
