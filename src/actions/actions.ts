import {
  Action,
  createAction,
  createNewContext,
  Outputs,
  runActions,
  TemplateAction,
  TemplateActionInput,
} from "./primitives";

function wait<P = any>(name: keyof P): Action<P> {
  return createAction(async function* ({ currentPrompt, context, params }) {
    while (typeof params[name] === undefined) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    yield currentPrompt.getElement({
      content: `${params[name]}` || "",
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

export function loop<Parameters>(varName: string): TemplateAction<Parameters> {
  return function (
    strings: TemplateStringsArray,
    ...inputs: TemplateActionInput<Parameters>[]
  ): Action<Parameters> {
    return createAction(async function* (props) {
      const loopId = Math.random().toString(36).slice(2, 9);
      const outputs: Outputs[] = [];

      props.outputs[varName] = outputs;

      let i = 0;
      while (props.state.loops[loopId] !== false) {
        props.state.loops[loopId] = i++;
        const output: Outputs = {};
        outputs.push(output);

        const loopAI = createNewContext(() => ({
          currentLoopId: loopId,
        }));

        const generator = loopAI(
          strings,
          ...inputs
        )({ ...props, outputs: output });

        yield* generator.generator;
      }
    });
  };
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
