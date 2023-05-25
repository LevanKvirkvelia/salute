import { davinci, llm, renderStream } from "..";

async function main() {
  const QUESTIONS = [
    `Who is the first president of the United States?`,
    `What is the capital of France?`,
    `Who discovered the theory of relativity?`,
    `What is Pomelo?`,
  ];

  const agent = llm(
    ({ ai, map, gen }) => ai`
      Answer the questions in a single sentence.

      ${map(
        "answers",
        QUESTIONS.map((item) => ai`Q: ${item}\nA:${gen("answer")}\n`)
      )}

      Thank You!
      `,
    { llm: davinci, stream: true }
  );

  console.log(await agent({}, { render: true }));
}

main();
