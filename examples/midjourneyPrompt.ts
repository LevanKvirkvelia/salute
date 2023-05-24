import { assistant, gpt3, renderAgent, system, user } from "..";

const AI_NAME = "Midjourney";

async function main() {
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
  >(({ params, gen }) => [
    system`
      Act as a prompt generator for a generative AI called "${AI_NAME}". 
      ${AI_NAME} AI generates images based on given prompts.
    `,
    user`
      My query is: ${params.query}
      Generate descriptions about my query, in realistic photographic style, for an Instagram post. 
      The answer should be one sentence long, starting directly with the description.
    `,

    QUESTIONS.map((item) => [user`${item}`, assistant`${gen("answer")}`]),
  ]);

  return renderAgent(
    agent({
      query: `A picture of a dog`,
    }).generator
  );
}

main();
