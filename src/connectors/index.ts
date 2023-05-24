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
import { renderStream } from "../helpers";

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
type IsEmptyObject<T> = keyof T extends never ? true : false;

type SubTypeKeysOnly<O extends Outputs> = IsEmptyObject<O> extends true
  ? string
  : {
      [K in keyof O]: O[K] extends Outputs[] ? K : never;
    }[keyof O];

type NonObjectKeys<T> = {
  [K in keyof T]: T[K] extends string | string[] ? K : never;
}[keyof T & string];

type ArrayElementType<T> = T extends (infer E)[] ? E : never;

type RecursiveOutputKeys<T> = T extends string | string[]
  ? never
  : T extends any[]
  ? RecursiveOutputKeys<ArrayElementType<T>>
  :
      | NonObjectKeys<T>
      | {
          [K in keyof T]: RecursiveOutputKeys<T[K]>;
        }[keyof T & string];

type ActionFuncs<Parameters, O extends Outputs> = {
  gen: GenFunc<RecursiveOutputKeys<O>>;
  map: MapFunc<SubTypeKeysOnly<O>>;
  ai: TemplateAction<Parameters>;
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

type RolesLLMInput<Parameters extends AnyObject = any> = (
  | RoleAction<Parameters>
  | RoleAction<Parameters>[][]
)[];

type LLMInput<Parameters extends AnyObject, O extends Outputs> =
  | ((
      props: ActionProps<Parameters> & ActionFuncs<Parameters, O>
    ) => RolesLLMInput<Parameters> | Action<Parameters>)
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

    const actionPromps: ActionProps<Parameters> = {
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
      async then(cb) {
        cb(await run());
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
    ai: ai as unknown as TemplateAction<Parameters>,
    gen: gen as unknown as GenFunc<RecursiveOutputKeys<O>>,
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
    actions: LLMInput<Params, Out>,
    context?: Pick<Context, "stream">
  ) => {
    return llm(actions, { ...context, llm: llmWrapped });
  };

  llmWrapped.completion = completion;
  llmWrapped.isChat = isChat;

  return llmWrapped;
};
