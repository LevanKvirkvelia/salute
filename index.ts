import { Action, AnyObject, LLMAction, RoleAction, Variables } from "./api";
import { generatorOrPromise } from "./generatorOrPromise";
import { chatGPT3Completion, davinciCompletion } from "./llms";
import {
  ChatPrompt,
  ChatPromptElement,
  Prompt,
  PromptElement,
  Roles,
  printChatElement,
} from "./prompt";

function gen(name: string, stop?: string): Action {
  return function ({
    variables,
    currentPrompt,
    completion,
    stop: defaultStop,
  }) {
    async function* generator() {
      const llmStream = completion({
        prompt: currentPrompt,
        stop: typeof stop === "string" ? stop : defaultStop,
      });
      for await (const result of llmStream.generator) {
        variables[name] = result;
        yield currentPrompt.getLLMElement(result);
      }
    }

    return generatorOrPromise(generator());
  };
}

function role(role: Roles) {
  return function (
    strings: TemplateStringsArray,
    ...inputs: (Action | string)[]
  ): RoleAction {
    return function ({ variables, currentPrompt, completion }) {
      async function* generator() {
        for (let i = 0; i < strings.length; i++) {
          const input = inputs[i];

          if (strings[i])
            yield currentPrompt.pushElement({
              content: strings[i],
              source: "prompt",
              role,
            });

          if (input === undefined) {
            break;
          } else if (typeof input === "function") {
            const generator = (input as Action<ChatPrompt>)({
              variables,
              completion,
              currentPrompt,
              stop: strings[i + 1],
            });

            for await (const value of generator.generator) {
              yield currentPrompt.pushElement(value) as ChatPromptElement;
            }
          } else {
            const newConstantElement: ChatPromptElement = {
              content: input,
              source: "constant",
              role,
            };
            yield currentPrompt.pushElement(newConstantElement);
          }
        }
      }

      return generatorOrPromise(generator());
    };
  };
}

const system = role("system");
const user = role("user");
const assistant = role("assistant");

function gpt3<T extends AnyObject | undefined = any>(
  messages: RoleAction[] | ((parameters: T) => RoleAction[])
): LLMAction<ChatPrompt, Exclude<T, undefined>> {
  return (parameters: T) => {
    const chat = new ChatPrompt();
    const variables: Variables = {};
    const _messages: RoleAction[] =
      typeof messages === "function" ? messages(parameters) : messages;

    async function* generator() {
      for (let i = 0; i < _messages.length; i++) {
        const roleGenerator = _messages[i]({
          completion: chatGPT3Completion,
          variables,
          currentPrompt: chat,
        }).generator;

        for await (const value of roleGenerator) {
          yield value;
        }
      }
      return {
        prompt: chat,
        variables,
      };
    }

    return generatorOrPromise(generator());
  };
}

async function davinci(
  strings: TemplateStringsArray,
  ...inputs: Action<Prompt>[]
) {
  const currentPrompt = new Prompt();
  const variables: Variables = {};

  async function* generator() {
    for (let i = 0; i < strings.length - 1; i++) {
      const input = inputs[i];

      yield currentPrompt.pushElement({
        content: strings[i],
        source: "prompt",
      });

      if (input === undefined) {
        continue;
      } else if (typeof input === "function") {
        const generator = input({
          variables,
          completion: davinciCompletion,
          currentPrompt: currentPrompt,
          stop: strings[i + 1],
        });

        for await (const value of generator.generator) {
          yield value;
        }
      } else {
        const newConstantElement: PromptElement = {
          content: input,
          source: "constant",
        };
        yield currentPrompt.pushElement(newConstantElement);
      }
    }
    return currentPrompt.pushElement({
      content: strings[strings.length - 1],
      source: "prompt",
    });
  }

  return generatorOrPromise(generator());
}

const AI_NAME = "Midjourney";

async function main() {
  const generator = gpt3<{ query: string }>(({ query }) => [
    system`Act as a prompt generator for a generative AI called "${AI_NAME}". 
${AI_NAME} AI generates images based on given prompts.`,
    user`My query is: ${query}

Generate descriptions about my query, in realistic photographic style, for an Instagram post. The answer should be one sentence long, starting directly with the description.
Main elements with specific imagery details:`,
    assistant`${gen("description")}`,
    user`Next, describe the environment.`,
    assistant`${gen("environment")}`,
    user`Now, provide the mood / feelings and atmosphere of the scene.`,
    assistant`${gen("mood", "\n")}`,
    user`Finally, describe the photography style (Photo, Portrait, Landscape, Fisheye, Macro) along with camera model and settings.`,
    assistant`${gen("photography", "\n")}`,
  ])({
    query: `Picture a yoga studio and a teacher demonstrating yoga poses while students follow along, expressing mindfulness and balance. Studio with natural wood floors, large windows.`,
  });

  let lastRole = null;
  for await (const a of generator.generator) {
    if (a.role !== lastRole) {
      console.log(`\n------------------ ${a.role} ------------------`);
      lastRole = a.role;
    }
    printChatElement(a);
  }
  console.log("\n----------------------------------------");
}

main();
