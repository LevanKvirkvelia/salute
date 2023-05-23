import { llm } from "./src/connectors";
import { davinci, gpt3 } from "./src/connectors/OpenAI";
import { renderAgent } from "./src/helpers";

type PropsType = {
  proverb: string;
  book: string;
  chapter: number;
  verse: number;
};

function defaultExample() {
  const proverbAgent = llm<
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
    `,
    {
      llm: davinci,
    }
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

  const proverbAgent = llm(
    ({ ai, map, gen }) => ai`
      Answer the questions in a single sentence.

      ${map(
        "answers",
        QUESTIONS.map((item) => ai`Q: ${item}\nA:${gen("answer")}`)
      )}

      Thank You!
      `,
    { llm: davinci }
  );

  return proverbAgent({}).generator;
}

function jsonExample() {
  const proverbAgent = davinci(
    ({ ai, gen }) => ai`
    The following is a character profile for an RPG game in JSON format.

    json
    {
        "description": "${gen("description")}",
        "name": "${gen("name", { stop: '"' })}",
        "age": ${gen("age", { stop: "," })},
        "class": "${gen("class", { stop: '"' })}",
        "mantra": "${gen("mantra", { stop: '"' })}",
        "strength": ${gen("strength", { stop: "," })},
        "items": [${[0, 0, 0].map(() => ai`"${gen("item", { stop: '"' })}",`)}]
    }`
  );

  return proverbAgent({}).generator;
}

async function main() {
  // await renderAgent(arrayInTextExample().generator);
  // await renderAgent(instaPrompt().generator);
  await renderAgent(arrayInTextExample());
}

main();
