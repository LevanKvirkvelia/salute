import { EventEmitter } from "eventemitter3";
import { PromptElement, PromptStorage } from "../PromptStorage";
import {
  GenOptions,
  RoleAction,
  RoleTemplateFunction,
  ai,
  assistant,
  gen,
  map,
  system,
  user,
} from "../actions/actions";
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
import { renderStream } from "../helpers";

export type AnyObject = Record<string, any>;

export type CreateLLMCompletionFn = (
  props: {
    prompt: PromptStorage;
    stream: boolean;
  } & GenOptions
) => AsyncGenerator<[number, string], void>;

export type LLMCompletionFn = (
  props: {
    prompt: PromptStorage;
    stream: boolean;
  } & GenOptions
) => AsyncGenerator<[number, string], void>;

export type GenFunc<T extends Outputs> = (
  name: RecursiveOutputKeys<T>,
  options?: Omit<GenOptions, "stream">
) => Action<any, any>;
export type MapFunc<T> = (
  name: T,
  elements: TemplateActionInput<any, any>[]
) => Action<any, any>;

// type
type IsEmptyObject<T> = keyof T extends never ? true : false;

type SubTypeKeysOnly<O extends Outputs> = IsEmptyObject<O> extends true
  ? string
  : {
      [K in keyof O]: O[K] extends Outputs[] ? K : never;
    }[keyof O];

export type NonObjectKeys<T> = {
  [K in keyof T]: T[K] extends string | string[] ? K : never;
}[keyof T & string];

type ArrayElementType<T> = T extends (infer E)[] ? E : never;

export type RecursiveOutputKeys<T> = T extends string | string[]
  ? never
  : T extends any[]
  ? RecursiveOutputKeys<ArrayElementType<T>>
  :
      | NonObjectKeys<T>
      | {
          [K in keyof T]: RecursiveOutputKeys<T[K]>;
        }[keyof T & string];

export type Keys<T extends Outputs, K = keyof T> = K extends string
  ? T[K] extends string
    ? K
    : T[K] extends Outputs
    ? K | Keys<Extract<T[K], Outputs>>
    : never
  : never;


export type ActionFuncs<Parameters, O extends Outputs> = {
  gen: GenFunc<O>;
  map: MapFunc<SubTypeKeysOnly<O>>;
  ai: TemplateAction<Parameters, O>;
  user: RoleTemplateFunction<Parameters, O>;
  system: RoleTemplateFunction<Parameters, O>;
  assistant: RoleTemplateFunction<Parameters, O>;
};

export type AllowerOuputKeys<O extends Outputs> =
  RecursiveOutputKeys<O> extends never ? string : RecursiveOutputKeys<O>;

export type LLMEvents = string;

export type LLMListeners = {
  onPromptElement?: (element: PromptElement) => any;
  onLLMChunk?: (token: string) => any;
  onLLMResponse?: (token: string, name: string) => any;
  render?: boolean;
};

export type Agent<T extends AnyObject, O extends Outputs> = (
  props: T,
  listeners?: LLMListeners
) => {
  events: EventEmitter<LLMEvents>;
  generator: (returnAllElements?: boolean) => AsyncGenerator<PromptElement, O>;
  run(props?: LLMListeners): Promise<O>;
  then: (callback: (output: O) => any) => void;
  input(name: string, value: any): void;
  prompt: PromptStorage;
  outputs: O;
  next: () => Promise<string | null>;
};

type RolesLLMInput<
  Parameters extends AnyObject = any,
  O extends Outputs = any
> = (RoleAction<Parameters, O> | RoleAction<Parameters, O>[][])[];

type LLMInput<Parameters extends AnyObject, O extends Outputs> =
  | ((
      props: ActionProps<Parameters, O> & ActionFuncs<Parameters, O>
    ) => RolesLLMInput<Parameters> | Action<Parameters, O>)
  | RolesLLMInput<Parameters>;

export function llm<
  Parameters extends AnyObject = any,
  O extends Outputs = any
>(
  messages: LLMInput<Parameters, O>,
  context: Pick<Context, "llm" | "stream">
): Agent<Exclude<Parameters, undefined>, O> {
  return (parameters: Parameters, listeners: LLMListeners = {}) => {
    const events = new EventEmitter<LLMEvents>();
    const prompt = new PromptStorage();
    const outputs = {} as O;
    const state: State = { loops: {}, queue: {} };

    const actionPromps: ActionProps<Parameters, O> = {
      events,
      outputs,
      params: parameters,
      currentPrompt: prompt,
      context: { role: "none", outputAddress: [], ...context },
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

    async function* generatorFunc(returnAllElements = false) {
      if (listeners.onLLMResponse)
        events.on("*", ({ value, name }) => {
          listeners.onLLMResponse?.(value, name);
        });
      for (let i = 0; i < __messages.length; i++) {
        const generator = runActions(__messages[i], actionPromps);

        for await (const value of listeners.render
          ? renderStream(generator, context.llm.isChat)
          : generator) {
          prompt.pushElement(value);
          listeners.onPromptElement?.(value);
          if (returnAllElements) yield value;
          else if (value.source === "llm") {
            listeners.onLLMChunk?.(value.content);
            yield value;
          }
        }
      }
      return outputs;
    }

    function input(name: string, value: any) {
      if (!state.queue[name]) state.queue[name] = [];
      state.queue[name].push(value);
    }

    let generator: AsyncGenerator<PromptElement, O> | null = null;
    async function run({
      onPromptElement,
      onLLMChunk,
      onLLMResponse,
    }: LLMListeners = {}) {
      generator = generatorFunc(true);
      let result = await generator.next();
      events.on("*", ({ value, name }) => {
        onLLMResponse?.(value, name);
      });
      while (!result.done) {
        onPromptElement?.(result.value);

        if (result.value.source === "llm") {
          onLLMChunk?.(result.value.content);
        }

        result = await generator.next();
      }

      return outputs;
    }
    return {
      generator: generatorFunc,
      next: async () => {
        if (!generator) generator = generatorFunc(false);
        const n = await generator.next();
        if (n.done) return null;
        return n.value.content;
      },
      run,
      then(cb) {
        run()
          .then((output) => cb(output))
          .catch((e) => console.error(e));
      },
      events,
      outputs,
      prompt,
      input,
    };
  };
}

export const typedActionFuncs = <Parameters, O extends Outputs>(): ActionFuncs<
  Parameters,
  O
> => {
  return {
    ai: ai as any,
    gen: gen as any,
    map: map as any,
    user: user as any,
    system: system as any,
    assistant: assistant as any,
  };
};

export const createLLM = (func: LLMCompletionFn, isChat: boolean) => {
  const llmWrapped = <
    Params extends AnyObject = any,
    Out extends Outputs = any
  >(
    actions: LLMInput<Params, Out>,
    context?: Pick<Context, "stream">
  ) => {
    return llm(actions, { ...context, llm: llmWrapped });
  };

  llmWrapped.completion = func;
  llmWrapped.isChat = isChat;

  return llmWrapped;
};
