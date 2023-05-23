import { system, user, assistant } from "../src/actions/actions";
import { gpt3 } from "../src/connectors/OpenAI";
import { renderAgent } from "../src/helpers";

async function main() {
  const agent = gpt3<{ query: string }>(({ params, gen, map }) => [
    system`
        You are a helpful and terse assistant.
    `,
    user`
        I want a response to the following question: 
        ${params.query}
        Don't answer the question yet.
        Name 3 world-class experts (past or present) who would be great at answering this?
    `,
    assistant`${gen("expert_names")}`,
    user`Great, now please answer the question as if these experts had collaborated in writing a joint anonymous answer.`,
    assistant`${gen("answer")}`,
  ]);

  renderAgent(
    agent({
      query: `How can I be more productive?`,
    }).generator
  );
}

main();
