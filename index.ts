import { PromptElement, printChatElement } from "./src/PromptStorage";
import { Outputs } from "./src/actions/primitives";
import {
  loop,
  wait,
  gen,
  assistant,
  system,
  user,
} from "./src/actions/actions";
import { davinci, gpt3 } from "./src/connectors/OpenAI";

const AI_NAME = "Midjourney";

type PropsType = {
  proverb: string;
  book: string;
  chapter: number;
  verse: number;
};

function defaultExample() {
  const proverbAgent = davinci<
    PropsType,
    {
      rewrite: string;
      chapter: string;
      verse: string;
    }
  >(
    ({ ai, params, gen }) => ai`
      Tweak this proverb to apply to model instructions instead.
      ${params.proverb}
      - ${params.book} ${params.chapter}:${params.verse}

      UPDATED
      Where there is no guidance${gen("rewrite")}
      - GPT ${gen("chapter")}:${gen("verse")}
    `
  );

  const result = proverbAgent({
    proverb:
      "Where there is no guidance, a people falls,\nbut in an abundance of counselors there is safety.",
    book: "Proverbs",
    chapter: 11,
    verse: 14,
  });

  return result.generator;
}

function arrayInTextExample() {
  const QUESTIONS = [
    `Who is the first president of the United States?`,
    `What is the capital of France?`,
    `Who discovered the theory of relativity?`,
    `What is Pomelo?`,
  ];

  const proverbAgent = davinci(
    ({ ai, map, gen }) => ai`
      Answer the questions in a single sentence.

      ${map(
        "answers",
        QUESTIONS.map((item) => ai`Q: ${item}\nA:${gen("answer")}`)
      )}

      Thank You!
      `
  );

  return proverbAgent({}).generator;
}

function instaPrompt() {
  const QUESTIONS = [
    `Main elements with specific imagery details`,
    `Next, describe the environment`,
    `Now, provide the mood / feelings and atmosphere of the scene`,
    `Finally, describe the photography style (Photo, Portrait, Landscape, Fisheye, Macro) along with camera model and settings`,
  ];

  const agent = gpt3<
    { query: string },
    {
      lol: { a: string }[];
      answer: string[];
      random: string;
    }
  >(({ params, gen, map }) => [
    system`
      Act as a prompt generator for a generative AI called "${AI_NAME}". 
      ${AI_NAME} AI generates images based on given prompts.
    `,
    user`
      My query is:
      Generate descriptions about my query, in realistic photographic style, for an Instagram post. 
      The answer should be one sentence long, starting directly with the description.
    `,

    map(
      "lol",
      QUESTIONS.map((item) => [user`${item}`, assistant`${gen("a")}`])
    ),

    QUESTIONS.map((item) => [user`${item}`, assistant`${gen("answer")}`]),
  ]);

  return agent({
    query: `A picture of a dog`,
  }).generator;
}

function jsonExample() {
  const proverbAgent = davinci(
    ({ ai, gen }) => ai`
    The following is a character profile for an RPG game in JSON format.

    json
    {
        "description": "${gen("description")}",
        "name": "${gen("name", '"')}",
        "age": ${gen("age", ",")},
        "class": "${gen("class", '"')}",
        "mantra": "${gen("mantra", '"')}",
        "strength": ${gen("strength", ",")},
        "items": [${[0, 0, 0].map(() => ai`"${gen("item", '"')}",`)}]
    }`
  );

  return proverbAgent({}).generator;
}

// `{{#system~}}
// You are a helpful assistant
// {{~/system}}

// {{#user~}}
// You will answer the user as {{role}} in the following conversation. At every step, I will provide you with the user input, as well as a comment reminding you of your instructions. Never talk about the fact that you are an AI, even if the user asks you. Always answer as {{role}}.
// {{#if first_question}}You can also start the conversation.{{/if}}
// {{~/user}}

// {{~! The assistant either starts the conversation or not, depending on if this is the first or second agent }}
// {{#assistant~}}
// Ok, I will follow these instructions.
// {{#if first_question}}Let me start the conversation now:
// {{role}}: {{first_question}}{{/if}}
// {{~/assistant}}

// {{~! Then the conversation unrolls }}
// {{~#geneach 'conversation' stop=False}}
// {{#user~}}
// User: {{set 'this.input' (await 'input')}}
// Comment: Remember, answer as a {{role}}. Start your utterance with {{role}}:
// {{~/user}}

// ${gen("answer")}
// {{~/geneach}}`;

function democratAndRepublicanDebate() {
  const agent = gpt3<
    {
      role: string;
      firstQuestion?: string;
    },
    { inputs: { answer: string }[] }
  >(({ params, ai }) => [
    system`You are a helpful assistant`,
    user`
      You will answer the user as ${params.role} in the following conversation. 
      At every step, I will provide you with the user input, as well as a comment reminding you of your instructions. 
      Never talk about the fact that you are an AI, even if the user asks you. Always answer as ${params.role}.`,
    assistant`Ok, I will follow these instructions.`,

    loop("inputs", [user`${wait("question")}`, assistant`${gen("answer")}`]),
  ]);

  const democrat = agent({
    role: "democrat",
  });

  const republican = agent({
    role: "republican",
  });

  republican.input(
    "question",
    "What is your opinion on the topic of abortion?"
  );

  republican.events.on("answer", (answer) => {
    democrat.input("question", answer);
  });

  democrat.events.on("answer", (answer) => {
    republican.input("question", answer);
  });

  republican.then(() => {});

  renderAgent(democrat.generator);
}

async function renderAgent(
  gen: AsyncGenerator<PromptElement & { outputs: Outputs }>
) {
  let lastRole = null;
  let lastElement: { outputs: Outputs } | null = null;
  for await (const a of gen) {
    if (a.role !== lastRole && a.role !== "disabled") {
      console.log(`\n------------------ ${a.role} ------------------`);
      lastRole = a.role;
    }
    printChatElement(a);
    lastElement = a;
  }

  console.log("\n----------------------------------------");
  console.log(lastElement?.outputs);
}

async function main() {
  // await renderAgent(arrayInTextExample().generator);
  // await renderAgent(instaPrompt().generator);
  // await renderAgent(defaultExample());
  democratAndRepublicanDebate();
}

main();
