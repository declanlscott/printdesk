import { useCallback, useRef } from "react";

/**
 * Returns a referentially stable version of the provided value.
 */
export function useStableRef<TValue>(value: TValue) {
  const ref = useRef(value);
  ref.current = value;

  return ref;
}

/**
 * Returns a referentially stable version of the provided callback.
 */
export function useStableCallback<TArgs extends Array<unknown>, TReturn = void>(
  callback: (...args: TArgs) => TReturn,
) {
  const callbackRef = useStableRef(callback);

  return useCallback(
    (...args: TArgs) => callbackRef.current(...args),
    [callbackRef],
  );
}
