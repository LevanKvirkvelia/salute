export type PromiseOrCursor<Element, Return = void> = {
  next: (...args: [] | [unknown]) => Promise<IteratorResult<Element, Return>>;
  generator: AsyncGenerator<Element, Return, any>;
  then(cb: (result: Return) => void): void;
};

export function generatorOrPromise<T>(gen: T) {
  // @ts-ignore
  const typedGen = gen as AsyncGenerator<any, any, any>;
  return {
    generator: gen,
    next: typedGen.next,
    async then(cb: (result: any) => void) {
      let result = await typedGen.next();

      while (!result.done) {
        result = await typedGen.next();
      }

      cb?.(result.value);
    },
  };
}
