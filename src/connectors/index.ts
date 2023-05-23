import { EventEmitter } from "eventemitter3";
import { PromptElement, PromptStorage } from "../PromptStorage";
import { GenOptions, RoleAction, ai, gen, map } from "../actions/actions";
import {
  Action,
  TemplateActionInput,
  Outputs,
  TemplateAction,
  State,
  runActions,
  Context,
} from "../actions/primitives";
import { PromiseOrCursor, generatorOrPromise } from "../generatorOrPromise";

type CreateCompletionFunc = (props: {
  prompt: PromptStorage;
  options?: GenOptions;
}) => Promise<AsyncGenerator<string>>;

export type AnyObject = Record<string, any>;

export type LLMCompletionFn = (
  props: {
    prompt: PromptStorage;
    stream: boolean;
  } & GenOptions
) => AsyncGenerator<string, string>;

type GenFunc<T> = (
  name: T,
  options?: Omit<GenOptions, "stream">
) => Action<any>;
type MapFunc<T> = <Parameters = any>(
  name: T,
  elements: TemplateActionInput<Parameters>[]
) => Action<Parameters>;

// type
type SubTypeKeysOnly<O extends Outputs> = {
  [K in keyof O]: O[K] extends Outputs[] ? K : unknown;
}[keyof O];

type NonObjectKeys<T> = {
  [K in keyof T]: T[K] extends string | string[] ? K : never;
}[keyof T];

type ArrayElementType<T> = T extends (infer E)[] ? E : never;

type RecursiveNonObjectKeys<T> = T extends string | string[]
  ? never
  : T extends any[]
  ? RecursiveNonObjectKeys<ArrayElementType<T>>
  :
      | {
          [K in keyof T]: RecursiveNonObjectKeys<T[K]>;
        }[keyof T]
      | NonObjectKeys<T>;

type ActionFuncs<O extends Outputs> = {
  gen: GenFunc<RecursiveNonObjectKeys<O>>;
  map: MapFunc<SubTypeKeysOnly<O>>;
};

export type LLMPromptFunction<Parameters, O extends Outputs> = (
  props: {
    ai: TemplateAction<Parameters>;
    params: Parameters;
  } & ActionFuncs<O>
) => ReturnType<TemplateAction<Parameters>>;

type LLMPromptArrayFunction<Parameters, O extends Outputs> = (
  props: {
    ai: TemplateAction<Parameters>;
    params: Parameters;
  } & ActionFuncs<O>
) => (RoleAction<Parameters>[][] | RoleAction<Parameters>)[];

// const

export type LLMActionResult<T extends AnyObject, O extends Outputs> = (
  props: T
) => PromiseOrCursor<
  PromptElement & {
    prompt: PromptStorage;
    outputs: O;
  },
  { prompt: PromptStorage; outputs: O }
> & {
  events: EventEmitter<Extract<RecursiveNonObjectKeys<O>, string>>;
  input(name: string, value: any): void;
};

export function llm<
  Parameters extends AnyObject = any,
  O extends Outputs = Outputs
>(
  messages:
    | (RoleAction<Parameters> | RoleAction<Parameters>[][])[]
    | LLMPromptArrayFunction<Parameters, O>
    | LLMPromptFunction<Parameters, O>,
  context: Pick<Context, "llm" | "stream">
): LLMActionResult<Exclude<Parameters, undefined>, O> {
  return (parameters: Parameters) => {
    const events = new EventEmitter<
      Extract<RecursiveNonObjectKeys<O>, string>
    >();

    const prompt = new PromptStorage();
    const outputs = {} as O;
    const state: State = { loops: {}, queue: {} };

    const _messages =
      typeof messages === "function"
        ? messages({
            ai: ai as unknown as TemplateAction<Parameters>,
            params: parameters,
            ...typedActionFuncs<O>(),
          })
        : messages;
    const __messages = Array.isArray(_messages) ? _messages : [_messages];

    async function* generator() {
      for (let i = 0; i < __messages.length; i++) {
        const generator = runActions(__messages[i], {
          events,
          outputs,
          params: parameters,
          currentPrompt: prompt,
          context: { role: "none", outputAddress: [], ...context },
          nextString: undefined,
          state,
        });

        for await (const value of generator) {
          prompt.pushElement(value);
          yield { ...value, prompt, outputs };
        }
      }
      return { prompt, outputs };
    }

    function input(name: string, value: any) {
      if (!state.queue[name]) state.queue[name] = [];
      state.queue[name].push(value);
    }

    // onNewOputput

    return generatorOrPromise(generator(), { input, events });
  };
}

export const typedActionFuncs = <O extends Outputs>(): ActionFuncs<O> => {
  return {
    gen: gen as unknown as GenFunc<RecursiveNonObjectKeys<O>>,
    map: map as unknown as MapFunc<SubTypeKeysOnly<O>>,
  };
};

export const createLLM = (func: CreateCompletionFunc) => {
  const completion: LLMCompletionFn = (props: {
    prompt: PromptStorage;
    stop?: string;
  }) => {
    async function* generator() {
      let fullString = "";

      for await (const chunk of await func(props)) {
        fullString += chunk.toString();
        yield chunk.toString();
      }

      return fullString;
    }

    return generator();
  };

  const llmWrapped = <
    Params extends AnyObject = any,
    Out extends Outputs = Outputs
  >(
    actions: Parameters<typeof llm<Params, Out>>[0],
    context?: Omit<Parameters<typeof llm<Params, Out>>[1], "llm">
  ) => {
    return llm(actions, { ...context, llm: llmWrapped });
  };

  llmWrapped.completion = completion;

  return llmWrapped;
};
