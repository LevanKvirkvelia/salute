import { RoleAction, AIFunction, ai, RoleAIFunction } from "../actions";
import { AnyObject, LLMAction, Variables } from "../api";
import { generatorOrPromise } from "../generatorOrPromise";
import {
  chatGPT3Completion,
  chatGPT4Completion,
  davinciCompletion,
} from "../llmConnectors";
import { PromptStorage } from "../PromptStorage";

type LLMPromptFunction<Parameters> = (props: {
  ai: AIFunction<Parameters>;
  params: Parameters;
}) => ReturnType<AIFunction<Parameters>>;

type LLMPromptArrayFunction<Parameters> = (props: {
  ai: AIFunction<Parameters>;
  params: Parameters;
}) => ReturnType<RoleAIFunction<Parameters>>[];

export function gpt3<Parameters extends AnyObject = any>(
  messages: RoleAction<Parameters>[] | LLMPromptArrayFunction<Parameters>
): LLMAction<Exclude<Parameters, undefined>> {
  return (parameters: Parameters) => {
    const chat = new PromptStorage();
    const vars: Variables = {};
    const _messages: RoleAction<Parameters>[] =
      typeof messages === "function"
        ? messages({
            ai: ai as unknown as AIFunction<Parameters>,
            params: parameters,
          })
        : messages;

    async function* generator() {
      for (let i = 0; i < _messages.length; i++) {
        const roleGenerator = _messages[i]({
          completion: chatGPT3Completion,
          vars,
          params: parameters,
          currentPrompt: chat,
          context: { role: "none" },
          nextString: undefined,
        }).generator;

        for await (const value of roleGenerator) {
          chat.pushElement(value);
          yield value;
        }
      }
      return { prompt: chat, vars };
    }

    return generatorOrPromise(generator());
  };
}

export function gpt4<Parameters extends AnyObject = any>(
  messages: RoleAction<Parameters>[] | LLMPromptArrayFunction<Parameters>
): LLMAction<Exclude<Parameters, undefined>> {
  return (parameters: Parameters) => {
    const chat = new PromptStorage();
    const vars: Variables = {};
    const _messages: RoleAction<Parameters>[] =
      typeof messages === "function"
        ? messages({
            ai: ai as unknown as AIFunction<Parameters>,
            params: parameters,
          })
        : messages;

    async function* generator() {
      for (let i = 0; i < _messages.length; i++) {
        const roleGenerator = _messages[i]({
          completion: chatGPT4Completion,
          vars,
          params: parameters,
          currentPrompt: chat,
          context: { role: "none" },
          nextString: undefined,
        }).generator;

        for await (const value of roleGenerator) {
          chat.pushElement(value);
          yield value;
        }
      }
      return { prompt: chat, vars };
    }

    return generatorOrPromise(generator());
  };
}

export function davinci<Parameters extends AnyObject | undefined = any>(
  props: LLMPromptFunction<Parameters>
) {
  return (params: Parameters) => {
    const chat = new PromptStorage(false);
    const vars: Variables = {};

    async function* generator() {
      const generator = props({
        ai: ai as unknown as AIFunction<Parameters>,
        params,
      })({
        completion: davinciCompletion,
        vars,
        context: { role: "none" },
        params,
        currentPrompt: chat,
        nextString: undefined,
      });

      for await (const value of generator.generator) {
        chat.pushElement(value);
        yield { ...value, chat, vars };
      }

      return { prompt: chat, vars };
    }

    return generatorOrPromise(generator());
  };
}
