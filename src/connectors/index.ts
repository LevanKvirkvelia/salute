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
  ActionProps,
} from "../actions/primitives";
import { PromiseOrCursor, generatorOrPromise } from "../generatorOrPromise";

export type AnyObject = Record<string, any>;

export type CreateLLMCompletionFn = (
  props: {
    prompt: PromptStorage;
    stream: boolean;
  } & GenOptions
) => AsyncGenerator<string, void>;

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

type ActionFuncs<Parameters, O extends Outputs> = {
  gen: GenFunc<RecursiveNonObjectKeys<O>>;
  map: MapFunc<SubTypeKeysOnly<O>>;
  ai: TemplateAction<Parameters>;
};

export type LLMActionResult<T extends AnyObject, O extends Outputs> = (
  props: T
) => PromiseOrCursor<
  PromptElement & {
    prompt: PromptStorage;
    outputs: O;
  },
  { prompt: PromptStorage; outputs: O }
> & {
  events: EventEmitter<
    Extract<RecursiveNonObjectKeys<O>, string> extends never
      ? string
      : Extract<RecursiveNonObjectKeys<O>, string>
  >;
  input(name: string, value: any): void;
};

type RolesLLMInput<Parameters extends AnyObject = any> = (
  | RoleAction<Parameters>
  | RoleAction<Parameters>[][]
)[];

export function llm<
  Parameters extends AnyObject = any,
  O extends Outputs = Outputs
>(
  messages:
    | ((
        props: ActionProps<Parameters> & ActionFuncs<Parameters, O>
      ) => RolesLLMInput<Parameters> | Action<Parameters>)
    | RolesLLMInput<Parameters>,

  context: Pick<Context, "llm" | "stream">
): LLMActionResult<Exclude<Parameters, undefined>, O> {
  return (parameters: Parameters) => {
    const events = new EventEmitter<
      Extract<RecursiveNonObjectKeys<O>, string> extends never
        ? string
        : Extract<RecursiveNonObjectKeys<O>, string>
    >();

    const prompt = new PromptStorage();
    const outputs = {} as O;
    const state: State = { loops: {}, queue: {} };

    const actionPromps: ActionProps<Parameters> = {
      events,
      outputs,
      params: parameters,
      currentPrompt: prompt,
      context: { role: "user", outputAddress: [], ...context },
      nextString: undefined,
      state,
    };

    const _messages =
      typeof messages === "function"
        ? messages({
            ...actionPromps,
            ...typedActionFuncs<Parameters, O>(),
          })
        : messages;
    const __messages = Array.isArray(_messages) ? _messages : [_messages];

    async function* generator() {
      for (let i = 0; i < __messages.length; i++) {
        const generator = runActions(__messages[i], actionPromps);

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

    return generatorOrPromise(generator(), { input, events });
  };
}

export const typedActionFuncs = <Parameters, O extends Outputs>(): ActionFuncs<
  Parameters,
  O
> => {
  return {
    ai: ai as unknown as TemplateAction<Parameters>,
    gen: gen as unknown as GenFunc<RecursiveNonObjectKeys<O>>,
    map: map as unknown as MapFunc<SubTypeKeysOnly<O>>,
  };
};

export const createLLM = (func: CreateLLMCompletionFn, isChat: boolean) => {
  const completion: LLMCompletionFn = (props) => {
    async function* generator() {
      let fullString = "";

      for await (const chunk of func(props)) {
        fullString += chunk.toString();
        yield chunk.toString();
      }

      return fullString;
    }

    return generator();
  };

  const llmWrapped = <
    Params extends AnyObject = any,
    Out extends Outputs = any
  >(
    actions: Parameters<typeof llm<Params, Out>>[0],
    context?: Omit<Parameters<typeof llm<Params, Out>>[1], "llm">
  ) => {
    return llm(actions, { ...context, llm: llmWrapped });
  };

  llmWrapped.completion = completion;
  llmWrapped.isChat = isChat;

  return llmWrapped;
};
