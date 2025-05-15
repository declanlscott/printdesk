from sst import Resource


retain_on_delete = Resource.App.stage == "production"


def tags(tenant_id: str):
    return {
        "sst:app": Resource.App.name,
        "sst:stage": Resource.App.stage,
        "tenant-id": tenant_id,
    }


def build_name(name_template: str, tenant_id: str) -> str:
    return name_template.replace("{{tenant_id}}", tenant_id)


def reverse_dns(domain_name: str) -> str:
    return ".".join(domain_name.split(".")[::-1])
