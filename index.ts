import { PromptElement, printChatElement } from "./PromptStorage";
import { assistant, gen, system, user } from "./actions";
import { davinci, gpt3, gpt4 } from "./actions/llms";

const AI_NAME = "Midjourney";

function defaultExample() {
  const proverbAgent = davinci<{
    proverb: string;
    book: string;
    chapter: number;
    verse: number;
  }>(
    ({ ai, params }) => ai`
Tweak this proverb to apply to model instructions instead.
${params.proverb}
- ${params.book} ${params.chapter}:${params.verse}

UPDATED
Where there is no guidance${gen("rewrite")}
- GPT ${gen("chapter")}:${gen("verse")}
`
  );

  const generator = proverbAgent({
    proverb:
      "Where there is no guidance, a people falls,\nbut in an abundance of counselors there is safety.",
    book: "Proverbs",
    chapter: 11,
    verse: 14,
  });

  return generator;
}

function arrayInTextExample() {
  const QUESTIONS = [
    `Who is the first president of the United States?`,
    `What is the capital of France?`,
    `Who discovered the theory of relativity?`,
    `What is Pomelo?`,
  ];
  const proverbAgent = davinci(
    ({ ai }) => ai`
      Answer the following questions in a single sentence.

      ${QUESTIONS.map((item) => ai`
        Q: ${item}
        A:${gen("answer")}
      `)}

      Thank You!
      `
  );

  return proverbAgent({});
}

function instaPrompt() {
  const QUESTIONS = [
    `Main elements with specific imagery details`,
    `Next, describe the environment`,
    `Now, provide the mood / feelings and atmosphere of the scene`,
    `Finally, describe the photography style (Photo, Portrait, Landscape, Fisheye, Macro) along with camera model and settings`,
  ];
  const agent = gpt3<{ query: string }>(({ ai, params }) => [
    system`Act as a prompt generator for a generative AI called "${AI_NAME}". ${AI_NAME} AI generates images based on given prompts.`,
    user`My query is: ${params.query}
Generate descriptions about my query, in realistic photographic style, for an Instagram post. The answer should be one sentence long, starting directly with the description.

`,
    ...QUESTIONS.flatMap((item) => [
      user`${item}`,
      assistant`${gen("answer")}`,
    ]),
  ]);
  return agent({
    query: `A picture of a dog`,
  });
}

async function renderAgent(gen: AsyncGenerator<PromptElement>) {
  let lastRole = null;
  for await (const a of gen) {
    if (a.role !== lastRole) {
      console.log(`\n------------------ ${a.role} ------------------`);
      lastRole = a.role;
    }
    printChatElement(a);
  }

  console.log("\n----------------------------------------");
}

async function main() {
  await renderAgent(arrayInTextExample().generator);
  await renderAgent(instaPrompt().generator);
  await renderAgent(defaultExample().generator);
}

main();
