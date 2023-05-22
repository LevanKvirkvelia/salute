import { RoleAction, ai, RoleTemplateFunction } from "./actions";
import { PromiseOrCursor, generatorOrPromise } from "../generatorOrPromise";
import {
  chatGPT3Completion,
  chatGPT4Completion,
  davinciCompletion,
} from "../llmConnectors";
import { PromptElement, PromptStorage } from "../PromptStorage";
import { Outputs, TemplateAction } from "./primitives";

export type AnyObject = Record<string, any>;

export type LLMAction<T extends AnyObject> = (
  props: T
) => PromiseOrCursor<
  PromptElement,
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
}) => ReturnType<RoleTemplateFunction<Parameters>>[];

export function gpt3<Parameters extends AnyObject = any>(
  messages: RoleAction<Parameters>[] | LLMPromptArrayFunction<Parameters>
): LLMAction<Exclude<Parameters, undefined>> {
  return (parameters: Parameters) => {
    const chat = new PromptStorage();
    const outputs: Outputs = {};
    const _messages: RoleAction<Parameters>[] =
      typeof messages === "function"
        ? messages({
            ai: ai as unknown as TemplateAction<Parameters>,
            params: parameters,
          })
        : messages;

    async function* generator() {
      for (let i = 0; i < _messages.length; i++) {
        const roleGenerator = _messages[i]({
          completion: chatGPT3Completion,
          outputs,
          params: parameters,
          currentPrompt: chat,
          context: { role: "none" },
          nextString: undefined,
          state: { loops: {} },
        }).generator;

        for await (const value of roleGenerator) {
          chat.pushElement(value);
          yield value;
        }
      }
      return { prompt: chat, outputs };
    }

    return generatorOrPromise(generator());
  };
}

export function gpt4<Parameters extends AnyObject = any>(
  messages: RoleAction<Parameters>[] | LLMPromptArrayFunction<Parameters>
): LLMAction<Exclude<Parameters, undefined>> {
  return (parameters: Parameters) => {
    const prompt = new PromptStorage();
    const outputs: Outputs = {};
    const _messages: RoleAction<Parameters>[] =
      typeof messages === "function"
        ? messages({
            ai: ai as unknown as TemplateAction<Parameters>,
            params: parameters,
          })
        : messages;

    async function* generator() {
      for (let i = 0; i < _messages.length; i++) {
        const roleGenerator = _messages[i]({
          completion: chatGPT4Completion,
          outputs,
          params: parameters,
          currentPrompt: prompt,
          context: { role: "none" },
          nextString: undefined,
          state: { loops: {} },
        }).generator;

        for await (const value of roleGenerator) {
          prompt.pushElement(value);
          yield { ...value, prompt, outputs };
        }
      }
      return { prompt, outputs };
    }

    return generatorOrPromise(generator());
  };
}

export function davinci<Parameters extends AnyObject | undefined = any>(
  props: LLMPromptFunction<Parameters>
) {
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
        context: { role: "none" },
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
