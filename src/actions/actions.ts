import {
  Action,
  createAction,
  createNewContext,
  Outputs,
  runActions,
  TemplateActionInput,
} from "./primitives";

export function wait<T extends string>(name: T): Action<any> {
  return createAction(async function* ({ currentPrompt, context, state }) {
    while (typeof state.queue[name]?.[0] === "undefined") {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const value = state.queue[name].shift();
    yield currentPrompt.getElement({
      content: `${value}` || "",
      source: "parameter",
      role: context.role,
    });
  });
}

function vars<P = any>(name: keyof P): Action<P> {
  return createAction(async function* ({ currentPrompt, context, params }) {
    yield currentPrompt.getElement({
      content: `${params[name]}` || "",
      source: "parameter",
      role: context.role,
    });
  });
}

export const gen = <T extends string>(name: T, stop?: string): Action<any> => {
  return createAction(async function* ({
    outputs,
    currentPrompt,
    completion,
    nextString,
    context,
    events,
  }) {
    const llmStream = completion({
      prompt: currentPrompt,
      stop: typeof stop === "string" ? stop : nextString,
    });
    let fullString = "";

    for await (const result of llmStream.generator) {
      fullString += result;
      yield currentPrompt.getLLMElement(result);
    }
    if (!context.outputToArray) outputs[name] = fullString;
    else {
      if (!Array.isArray(outputs[name])) outputs[name] = [];
      (outputs[name] as string[]).push(fullString);
    }
    events.emit(name, fullString);
  });
};

export function map<Parameters = any>(
  varName: string,
  elements: TemplateActionInput<Parameters>[]
): Action<Parameters> {
  return createAction(async function* (props) {
    const loopId = Math.random().toString(36).slice(2, 9);

    props.outputs[varName] = [];

    for (const element of elements) {
      const output: Outputs = {};
      (props.outputs[varName] as Outputs[]).push(output);
      const generator = runActions(element, {
        ...props,
        outputs: output,
        context: {
          ...props.context,
          outputAddress: [...props.context.outputAddress, varName],
          currentLoopId: loopId,
          outputToArray: false,
        },
      });
      yield* generator;
    }
  });
}

export function loop<Parameters = any>(
  varName: string,
  elements: TemplateActionInput<Parameters>
): Action<Parameters> {
  return createAction(async function* (props) {
    const loopId = Math.random().toString(36).slice(2, 9);

    props.outputs[varName] = [];

    while (props.state.loops[loopId] !== false) {
      const output: Outputs = {};
      (props.outputs[varName] as Outputs[]).push(output);
      const generator = runActions(elements, {
        ...props,
        outputs: output,
        context: {
          ...props.context,
          outputAddress: [...props.context.outputAddress, varName],
          currentLoopId: loopId,
          outputToArray: false,
        },
      });
      yield* generator;
    }
  });
}

export type RoleAction<Parameters> = Action<Parameters>;

export type RoleTemplateFunction<Parameters> = (
  strings: TemplateStringsArray,
  ...inputs: TemplateActionInput<Parameters>[]
) => RoleAction<Parameters>;

export const system = createNewContext(() => ({
  role: "system",
})) as RoleTemplateFunction<any>;
export const user = createNewContext(() => ({
  role: "user",
})) as RoleTemplateFunction<any>;
export const assistant = createNewContext(() => ({
  role: "assistant",
})) as RoleTemplateFunction<any>;
export const ai = createNewContext(() => ({}));
