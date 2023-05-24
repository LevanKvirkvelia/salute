import { assistant, gen, gpt3, system, user } from "..";

async function main() {
  const agent = gpt3(
    [
      system`
        You are a helpful and terse assistant.
    `,
      user`
        I want a response to the following question: 
        ${({ params }) => params.query}
        Don't answer the question yet.
        Name 3 world-class experts (past or present) who would be great at answering this?
    `,
      assistant`${gen("expert_names")}`,
      user`Great, now please answer the question as if these experts had collaborated in writing a joint anonymous answer.`,
      assistant`${gen("answer")}`,
    ],
    { stream: true }
  );

  const result = await agent(
    { query: `How can I be more productive?` },
    { render: true }
  );

  console.log(result);
}

main();
