import { llm } from "../src/connectors";
import { davinci } from "../src/connectors/OpenAI";
import { renderAgent } from "../src/helpers";

async function main() {
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
        QUESTIONS.map((item) => ai`Q: ${item}\nA:${gen("answer")}\n`)
      )}

      Thank You!
      `,
    { llm: davinci }
  );

  renderAgent(proverbAgent({}).generator);
}

main();
