import { EventEmitter } from "eventemitter3";
import merge from "ts-deepmerge";
import { PromptElement, PromptStorage, Roles } from "../PromptStorage";
import { LLMCompletionFn } from "../connectors";
import { isPromise } from "../helpers";

export type Outputs = Record<string, string | string[] | Outputs[]>;

export type Context = {
  role: Roles;
  currentLoopId?: string;
  outputToArray?: boolean;
  outputAddress: string[];
};

export type Queue = {
  [key: string]: any[];
};

export type State = {
  loops: { [key: string]: false | number };
  queue: Queue;
};

export type ActionProps<Parameters> = {
  events: EventEmitter<any, any>;
  context: Readonly<Context>;
  state: State;
  params: Parameters;
  outputs: Outputs;
  currentPrompt: PromptStorage;
  completion: LLMCompletionFn;
  nextString: string | undefined;
};

export type Action<Parameters, Return = void> = (
  props: ActionProps<Parameters>
) => AsyncGenerator<PromptElement, Return>;

export function createAction<Parameters = any>(
  generator: (
    props: ActionProps<Parameters>
  ) => AsyncGenerator<PromptElement, void, unknown>,
  updateProps: (props: ActionProps<Parameters>) => ActionProps<Parameters> = (
    props
  ) => props
): Action<Parameters> {
  return function (props) {
    return generator(updateProps(props));
  };
}

export type TemplateActionBasicInput =
  | string
  | number
  | AsyncGenerator<PromptElement, void>;
export type TemplateActionInput<Parameters> =
  | ((
      props: ActionProps<Parameters>
    ) =>
      | TemplateActionInput<Parameters>
      | Promise<TemplateActionInput<Parameters>>)
  | TemplateActionBasicInput
  | Action<Parameters>
  | TemplateActionInput<Parameters>[];

export async function* runActions<Parameters>(
  action: TemplateActionInput<Parameters>,
  props: ActionProps<Parameters>
): AsyncGenerator<PromptElement, void, unknown> {
  const { context, state } = props;

  const element = typeof action === "function" ? action(props) : action;
  if (Array.isArray(element)) {
    const currentLoopId = Math.random().toString(36).slice(2);
    let i = 0;
    const isInArray = context.role !== "none" || !context.outputAddress[0];
    for (const _element of element) {
      if (isInArray) {
        state.loops[currentLoopId] = i++;
        yield* runActions(_element, {
          ...props,
          context: {
            ...context,
            currentLoopId: currentLoopId,
            outputToArray: true,
          },
        });
      } else {
        yield* runActions(_element, props);
      }
    }
  } else if (typeof element === "number" || typeof element === "string") {
    yield {
      content: `${element}`,
      source: typeof action === "function" ? "parameter" : "constant",
      role: context.role,
    };
  } else if (typeof element === "function") {
    yield* runActions(element, props);
  } else if (isPromise<TemplateActionInput<Parameters>>(element)) {
    const resolvedElement = await element;
    yield* runActions(resolvedElement, props);
  } else {
    yield* element;
  }
}

export function runTemplateActions<Parameters>({
  inputs,
  strings,
}: {
  strings: TemplateStringsArray;
  inputs: TemplateActionInput<Parameters>[];
}) {
  return async function* generator({
    context,
    currentPrompt,
    nextString,
    ...rest
  }: ActionProps<Parameters>) {
    for (let i = 0; i < strings.length; i++) {
      if (strings[i]) {
        yield currentPrompt.getElement({
          content: strings[i],
          source: "prompt",
          role: context.role,
        });
      }

      if (inputs[i] === undefined) continue;

      yield* runActions(inputs[i], {
        ...rest,
        context,
        currentPrompt,
        nextString: strings[i + 1],
      });
    }
  };
}

export type TemplateAction<Parameters> = (
  strings: TemplateStringsArray,
  ...inputs: TemplateActionInput<Parameters>[]
) => Action<Parameters>;

export function createNewContext<Parameters>(
  getContext: () => Partial<Context>
): TemplateAction<Parameters> {
  return function (
    strings: TemplateStringsArray,
    ...inputs: TemplateActionInput<Parameters>[]
  ) {
    const _strings = strings.map((s) => s.replace(/\n\s+/g, "\n"));

    return createAction(
      runTemplateActions({
        strings: _strings as unknown as TemplateStringsArray,
        inputs,
      }),
      (props) => ({
        ...props,
        context: merge(props.context, getContext()) as Context,
      })
    );
  };
}
