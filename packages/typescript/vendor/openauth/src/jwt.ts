import { jwtVerify, SignJWT } from "jose";

import type { JWTPayload, KeyObject } from "jose";

export namespace jwt {
  export function create(payload: JWTPayload, algorithm: string, privateKey: KeyObject) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: algorithm, typ: "JWT", kid: "sst" })
      .sign(privateKey);
  }

  export function verify<T>(token: string, publicKey: KeyObject) {
    return jwtVerify<T>(token, publicKey);
  }
}
