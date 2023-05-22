import { RoleAction, ai, RoleTemplateFunction } from "./actions";
import { PromiseOrCursor, generatorOrPromise } from "../generatorOrPromise";
import {
  chatGPT3Completion,
  chatGPT4Completion,
  davinciCompletion,
} from "../llmConnectors";
import { PromptElement, PromptStorage } from "../PromptStorage";
import { Outputs, TemplateAction, runActions } from "./primitives";

export type AnyObject = Record<string, any>;

export type LLMAction<T extends AnyObject> = (
  props: T
) => PromiseOrCursor<
  PromptElement & { prompt: PromptStorage; outputs: Outputs },
  { prompt: PromptStorage; outputs: Outputs }
>;

export type LLMCompletionFn = (props: {
  prompt: PromptStorage;
  stop?: string;
}) => PromiseOrCursor<string, string>;

type LLMPromptFunction<Parameters> = (props: {
  ai: TemplateAction<Parameters>;
  params: Parameters;
}) => ReturnType<TemplateAction<Parameters>>;

type LLMPromptArrayFunction<Parameters> = (props: {
  ai: TemplateAction<Parameters>;
  params: Parameters;
}) => (RoleAction<Parameters>[][] | RoleAction<Parameters>)[];

function chatGptFactory(llmFunction: LLMCompletionFn) {
  return function <Parameters extends AnyObject = any>(
    messages:
      | (RoleAction<Parameters> | RoleAction<Parameters>[][])[]
      | LLMPromptArrayFunction<Parameters>
  ): LLMAction<Exclude<Parameters, undefined>> {
    return (parameters: Parameters) => {
      const prompt = new PromptStorage();
      const outputs: Outputs = {};
      const _messages =
        typeof messages === "function"
          ? messages({
              ai: ai as unknown as TemplateAction<Parameters>,
              params: parameters,
            })
          : messages;

      async function* generator() {
        for (let i = 0; i < _messages.length; i++) {
          const generator = runActions(_messages[i], {
            completion: llmFunction,
            outputs,
            params: parameters,
            currentPrompt: prompt,
            context: { role: "none", outputAddress: [] },
            nextString: undefined,
            state: { loops: {} },
          });

          for await (const value of generator) {
            prompt.pushElement(value);
            yield { ...value, prompt, outputs };
          }
        }
        return { prompt, outputs };
      }

      return generatorOrPromise(generator());
    };
  };
}

export const gpt3 = chatGptFactory(chatGPT3Completion);
export const gpt4 = chatGptFactory(chatGPT4Completion);

export function davinci<Parameters extends AnyObject | undefined = any>(
  props: LLMPromptFunction<Parameters>
): LLMAction<Exclude<Parameters, undefined>> {
  return (params: Parameters) => {
    const prompt = new PromptStorage(false);
    const outputs: Outputs = {};

    async function* generator() {
      const generator = props({
        ai: ai as unknown as TemplateAction<Parameters>,
        params,
      })({
        completion: davinciCompletion,
        outputs,
        context: { role: "none", outputAddress: [] },
        params,
        currentPrompt: prompt,
        nextString: undefined,
        state: { loops: {} },
      });

      for await (const value of generator.generator) {
        prompt.pushElement(value);
        yield { ...value, prompt, outputs };
      }

      return { prompt, outputs };
    }

    return generatorOrPromise(generator());
  };
}
