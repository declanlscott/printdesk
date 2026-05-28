from pydantic import BaseModel, model_serializer

from utils import SEPARATOR


class Hash(BaseModel):
    salt: str
    derived_key: str

    @model_serializer()
    def serialize_model(self):
        return f"{self.salt}{SEPARATOR}{self.derived_key}"
