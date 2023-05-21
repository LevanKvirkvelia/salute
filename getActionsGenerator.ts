import { Action, ActionProps } from "./api";
import { PromptElement } from "./prompt";

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
  inputs: (Action<Parameters> | string)[];
}) {
  return async function* generator() {
    for (let i = 0; i < strings.length; i++) {
      const input = inputs[i];

      if (strings[i])
        yield currentPrompt.pushElement({
          content: strings[i],
          source: "prompt",
          role: context.role,
        });

      if (input === undefined) {
        continue;
      }

      if (typeof input === "function") {
        const generator = (input as Action<Parameters>)({
          completion,
          context,
          currentPrompt,
          params,
          vars,
          nextString: strings[i + 1] || nextString,
        });

        for await (const value of generator.generator) {
          yield currentPrompt.pushElement(value) as PromptElement;
        }
      } else {
        const newConstantElement: PromptElement = {
          content: input,
          source: "constant",
          role: context.role,
        };
        yield currentPrompt.pushElement(newConstantElement);
      }
    }
  };
}
