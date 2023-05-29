import { LLMCompletionFn } from "../connectors";
import {
  Action,
  createAction,
  createNewContext,
  Outputs,
  runActions,
  TemplateActionInput,
} from "./primitives";

export function wait<T extends string>(
  name: T,
  save: boolean | string = false
): Action<any, any> {
  return createAction(async function* ({
    currentPrompt,
    context,
    state,
    outputs,
  }) {
    while (typeof state.queue[name]?.[0] === "undefined") {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const value = state.queue[name].shift();
    const saveName = save && typeof save === "string" ? save : name;

    const isOutputToArray = context.leafId
      .slice(-2)
      .every((x) => typeof x === "number");

    if (!isOutputToArray) outputs[saveName] = value;
    else {
      if (!Array.isArray(outputs[saveName])) outputs[saveName] = [];
      (outputs[saveName] as string[]).push(value);
    }

    yield currentPrompt.getElement({
      content: `${value}` || "",
      source: "parameter",
      role: context.role,
    });
  });
}

export type GenOptions = {
  stop?: string;
  stopRegex?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  llm?: { completion: LLMCompletionFn };
  // saveStopText?: string | boolean;
  n?: number;
  // logprobs?: number | null;
  // pattern?: string | null;
  // hidden?: boolean;
  // parse?: boolean;
  // tokenHealing?: boolean | null;
};

export const gen = (name: string, options?: GenOptions): Action<any, any> => {
  const { stop } = options || {};

  return createAction(async function* ({
    outputs,
    currentPrompt,
    nextString,
    context,
    events,
  }) {
    const llmStream = context.llm.completion({
      ...options,
      prompt: currentPrompt,
      stop: (typeof stop === "string" ? stop : nextString) || undefined,
      stream: context.stream || false,
    });

    let fullStrings: string[] = new Array<string>(options?.n || 1).fill("");

    for await (const result of llmStream) {
      fullStrings[result[0]] += result[1];
      if (context.stream && result[0] === 0) {
        yield currentPrompt.getLLMElement(result[1]);
      }
    }

    const isMulti = options?.n && options.n > 1;
    const isOutputToArray = context.leafId
      .slice(-2)
      .every((x) => typeof x === "number");
    // console.log({
    //   isMulti,
    //   n: options?.n,
    //   outputToArray: isOutputToArray,
    //   address: context.leafId,
    // });
    if (!isOutputToArray)
      outputs[name] = isMulti ? fullStrings : fullStrings[0];
    else {
      if (!Array.isArray(outputs[name])) outputs[name] = [];
      if (isMulti) (outputs[name] as string[][]).push(fullStrings);
      else (outputs[name] as string[]).push(fullStrings[0]);
    }
    events.emit(name, fullStrings);
    events.emit("*", { name, value: fullStrings });
    if (!context.stream) {
      yield currentPrompt.getLLMElement(fullStrings[0]);
    }
  });
};

export function map<Parameters = any>(
  varName: string,
  elements: TemplateActionInput<Parameters, any>[]
): Action<Parameters, any> {
  return createAction(async function* (props) {
    const loopId = Math.random().toString(36).slice(2, 9);

    props.outputs[varName] = [];

    for (const [index, element] of elements.entries()) {
      const output: Outputs = {};
      (props.outputs[varName] as Outputs[]).push(output);
      const generator = runActions(element, {
        ...props,
        outputs: output,
        context: {
          ...props.context,
          outputAddress: [...props.context.outputAddress, varName],
          leafId: [...props.context.leafId, `map(${index})`],
          currentLoopId: loopId,
        },
      });
      yield* generator;
    }
  });
}

export function loop<Parameters = any>(
  varName: string,
  elements: TemplateActionInput<Parameters, any>
): Action<Parameters, any> {
  return createAction(async function* (props) {
    const loopId = Math.random().toString(36).slice(2, 9);
    props.outputs[varName] = [];
    let i = 0;
    while (props.state.loops[loopId] !== false) {
      const output: Outputs = {};
      (props.outputs[varName] as Outputs[]).push(output);
      const generator = runActions(elements, {
        ...props,
        outputs: output,
        context: {
          ...props.context,
          outputAddress: [...props.context.outputAddress, varName],
          leafId: [...props.context.leafId, "loop", i],
          currentLoopId: loopId,
        },
      });
      yield* generator;
      i++;
    }
  });
}

export function block<Parameters = any>(
  elements: TemplateActionInput<Parameters, any>,
  option?: {
    hidden?: (() => boolean) | boolean;
  }
): Action<Parameters, any> {
  return createAction(async function* (props) {
    const generator = runActions(elements, {
      ...props,
      context: {
        ...props.context,
        leafId: [...props.context.leafId, "block"],
      },
    });

    for await (const element of generator) {
      const oldHidden = element.hidden;
      if (option?.hidden) {
        element.hidden = function () {
          return (
            (typeof option.hidden === "function"
              ? option.hidden()
              : option.hidden) ||
            (typeof oldHidden === "function" ? oldHidden() : oldHidden) ||
            false
          );
        };
      }
      yield element;
    }
  });
}

export type RoleAction<Parameters, O extends Outputs> = Action<Parameters, O>;

export type RoleTemplateFunction<Parameters, O extends Outputs> = (
  strings: TemplateStringsArray,
  ...inputs: TemplateActionInput<Parameters, O>[]
) => RoleAction<Parameters, O>;

export const system = createNewContext(() => ({
  role: "system",
})) as RoleTemplateFunction<any, any>;
export const user = createNewContext(() => ({
  role: "user",
})) as RoleTemplateFunction<any, any>;
export const assistant = createNewContext(() => ({
  role: "assistant",
})) as RoleTemplateFunction<any, any>;
export const ai = createNewContext(() => ({}));
