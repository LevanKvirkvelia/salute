import { assistant, gen, gpt3, system, user } from "../dist";

async function main() {
  const agent = gpt3(
    [
      system`You are a helpful and terse assistant.`,
      user`
        I want a response to the following question: 
        ${({ params }) => params.query}
        
        Please answer the question as if experts had collaborated in writing an anonymous answer.
      `,
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
