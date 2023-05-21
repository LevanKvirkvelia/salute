import { Action, ActionProps, PromiseOrCursor } from "./api";
import { generatorOrPromise } from "./generatorOrPromise";
import { PromptElement, Roles, printChatElement } from "./PromptStorage";

function param<P>(name: keyof P): Action<P> {
  return function ({ currentPrompt, context, params }) {
    async function* generator() {
      yield currentPrompt.getElement({
        content: `${params[name]}` || "",
        source: "parameter",
        role: context.role,
      });
    }

    return generatorOrPromise(generator());
  };
}

export function gen(name: string, stop?: string): Action<any> {
  return function <P>({
    vars,
    currentPrompt,
    completion,
    nextString,
  }: ActionProps<P>) {
    async function* generator() {
      const llmStream = completion({
        prompt: currentPrompt,
        stop: typeof stop === "string" ? stop : nextString,
      });
      let fullString = "";

      for await (const result of llmStream.generator) {
        fullString += result;
        yield currentPrompt.getLLMElement(result);
      }
      vars[name] = fullString;
    }

    return generatorOrPromise(generator());
  };
}

type AIInputBasic = string | number | PromiseOrCursor<PromptElement, void>;
type AIInput<Parameters> =
  | AIInputBasic
  | Action<Parameters>
  | ((props: ActionProps<Parameters>) => string | number)
  | AIInput<Parameters>[];

export function getActionsGenerator<Parameters>({
  inputs,
  context,
  strings,
  completion,
  currentPrompt,
  vars,
  params,
  nextString,
}: ActionProps<Parameters> & {
  strings: TemplateStringsArray;
  inputs: AIInput<Parameters>[];
}) {
  return async function* generator() {
    for (let i = 0; i < strings.length; i++) {
      if (strings[i]) {
        yield currentPrompt.getElement({
          content: strings[i],
          source: "prompt",
          role: context.role,
        });
      }

      const input = inputs[i];

      if (input === undefined) {
        continue;
      }
      const inputArray = Array.isArray(input) ? input : [input];
      for (const _input of inputArray) {
        const element =
          typeof _input === "function"
            ? _input({
                completion,
                context,
                currentPrompt,
                params,
                vars,
                nextString: strings[i + 1] || nextString,
              })
            : _input;

        if (typeof element === "number" || typeof element === "string") {
          yield currentPrompt.getElement({
            content: `${element}`,
            source: typeof _input === "function" ? "parameter" : "constant",
            role: context.role,
          });
        } else {
          if (!Array.isArray(element)) {
            for await (const value of element.generator) {
              yield currentPrompt.getElement(value);
            }
          }
        }
      }
    }
  };
}

export type AIFunction<Parameters> = (
  strings: TemplateStringsArray,
  ...inputs: AIInput<Parameters>[]
) => Action<Parameters>;

export type RoleAction<Parameters> = Action<Parameters>;

export type RoleAIFunction<Parameters> = (
  strings: TemplateStringsArray,
  ...inputs: AIInput<Parameters>[]
) => RoleAction<Parameters>;

function aiWithContext<Parameters>({
  role,
}: {
  role?: Roles;
}): AIFunction<Parameters> {
  return function (
    strings: TemplateStringsArray,
    ...inputs: AIInput<Parameters>[]
  ) {
    const _strings = strings.map((s) => s.replace(/\n\s+/g, "\n"));
    const f: Action<Parameters> = function ({ context, ...props }) {
      const generator = getActionsGenerator({
        ...props,
        strings: _strings as unknown as TemplateStringsArray,
        inputs,
        context: { ...context, role: role || context.role },
      });

      return generatorOrPromise(generator());
    };
    return f;
  };
}

export const system = aiWithContext({ role: "system" }) as RoleAIFunction<any>;
export const user = aiWithContext({ role: "user" }) as RoleAIFunction<any>;
export const assistant = aiWithContext({
  role: "assistant",
}) as RoleAIFunction<any>;
export const ai = aiWithContext({});
