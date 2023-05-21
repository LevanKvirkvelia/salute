import { RoleAction } from "../index";
import { Action, AnyObject, LLMAction, Variables } from "../api";
import { generatorOrPromise } from "../generatorOrPromise";
import { getActionsGenerator } from "../getActionsGenerator";
import { chatGPT3Completion } from "../llmConnectors";
import { PromptStorage, Roles, printChatElement } from "../prompt";

export function gpt3<Parameters extends AnyObject = any>(
  messages: RoleAction<Parameters>[]
): LLMAction<Exclude<Parameters, undefined>> {
  return (parameters: Parameters) => {
    const chat = new PromptStorage();
    const vars: Variables = {};
    const _messages: RoleAction<Parameters>[] = messages;

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
          yield value;
        }
      }
      return { prompt: chat, vars };
    }

    return generatorOrPromise(generator());
  };
}

export async function davinci<Parameters extends AnyObject | undefined = any>(
  strings: TemplateStringsArray,
  ...inputs: Action<Parameters>[]
) {
  return (params: Parameters) => {
    const currentPrompt = new PromptStorage(false);
    const variables: Variables = {};

    const generator = getActionsGenerator({
      strings,
      inputs,
      completion: chatGPT3Completion,
      currentPrompt,
      vars: variables,
      nextString: undefined,
      params,
      context: { role: "none" },
    });

    return generatorOrPromise(generator());
  };
}
