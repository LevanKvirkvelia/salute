import { davinci, gpt3 } from "./actions/llms";
import { Action, ActionProps, AnyObject, LLMAction, Variables } from "./api";
import { generatorOrPromise } from "./generatorOrPromise";
import { getActionsGenerator } from "./getActionsGenerator";
import { Roles, printChatElement } from "./prompt";

function param<T>(name: keyof T["params"]): Action<T> {
  return function ({ currentPrompt, context, params }) {
    async function* generator() {
      yield currentPrompt.pushElement({
        content: `${params[name]}` || "",
        source: "parameter",
        role: context.role,
      });
    }

    return generatorOrPromise(generator());
  };
}

function gen(name: string, stop?: string): Action<any> {
  return function ({ vars, currentPrompt, completion, nextString }) {
    async function* generator() {
      const llmStream = completion({
        prompt: currentPrompt,
        stop: typeof stop === "string" ? stop : nextString,
      });
      for await (const result of llmStream.generator) {
        vars[name] = result;
        yield currentPrompt.getLLMElement(result);
      }
    }

    return generatorOrPromise(generator());
  };
}

export type RoleAction<Parameters> = Action<Parameters>;
function role<Parameters>(role: Roles) {
  return function (
    strings: TemplateStringsArray,
    ...inputs: (Action<Parameters> | string)[]
  ) {
    const f: RoleAction<Parameters> = function ({ context, ...props }) {
      const generator = getActionsGenerator({
        ...props,
        strings,
        inputs,
        context: { ...context, role },
      });

      return generatorOrPromise(generator());
    };
    return f;
  };
}

export const system = role("system");
export const user = role("user");
export const assistant = role("assistant");

function each<T = any>(items: T[]) {
  return function (
    strings: TemplateStringsArray,
    ...inputs: (Action | string)[]
  ): Action {
    return function (props) {
      async function* generator() {
        for (const item of items) {
          const innerGenerator = getActionsGenerator({
            ...props,
            strings,
            inputs,
          });

          for await (const value of innerGenerator()) {
            yield value;
          }
        }
      }

      return generatorOrPromise(generator());
    };
  };
}

const AI_NAME = "Midjourney";

const QUESTIONS = [
  `Main elements with specific imagery details`,
  `Next, describe the environment`,
  `Now, provide the mood / feelings and atmosphere of the scene`,
  `Finally, describe the photography style (Photo, Portrait, Landscape, Fisheye, Macro) along with camera model and settings`,
];

async function main() {
  const agent = gpt3<{ query: string }>([
    system`
      Act as a prompt generator for a generative AI called "${AI_NAME}".
      ${AI_NAME} AI generates images based on given prompts.
    `,
    user`
      My query is: ${gen("name")}
      Generate descriptions about my query, in realistic photographic style, for an Instagram post.
      The answer should be one sentence long, starting directly with the description.
    `,
    ...QUESTIONS.flatMap((item) => [
      user`${item}`,
      assistant`${gen("answer")}`,
    ]),
  ]);

  agent({
    query: `fksdlfsl;df;lds`,
  });

  agent({
    query: `asdasd`,
  });

  const proverbAgent = davinci<{
    proverb: string;
    book: string;
    chapter: number;
    verse: number;
  }>`
    Tweak this proverb to apply to model instructions instead.
    ${(q) => q.params.proverb}
    - {{book}} {{chapter}}:{{verse}}

    UPDATED
    Where there is no guidance{{gen 'rewrite' stop="\\n-"}}
    - GPT {{gen 'chapter'}}:{{gen 'verse'}}
  `;

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
