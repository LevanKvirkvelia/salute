import { assistant, gpt3, loop, renderAgent, system, user, wait } from "..";

async function main() {
  const agent = gpt3<
    { role: string; firstQuestion?: string },
    { inputs: { answer: string }[] }
  >(({ params, gen }) => [
    system`You are a helpful assistant`,
    user`
    You will answer the user as ${params.role} in the following conversation. 
    At every step, I will provide you with the user input, as well as a comment reminding you of your instructions. 
    Never talk about the fact that you are an AI, even if the user asks you. Always answer as ${params.role}.`,
    assistant`Ok, I will follow these instructions.`,

    loop("inputs", [user`${wait("question")}`, assistant`${gen("answer")}`]),
  ]);

  const democrat = agent({ role: "democrat" });
  const republican = agent({ role: "republican" });

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

  democrat.then(() => {});

  renderAgent(republican.generator);
}

main();
