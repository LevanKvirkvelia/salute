import { ai, davinci, gen } from "..";

async function main() {
  const proverbAgent = davinci(
    ({ params }) => ai`
      Tweak this proverb to apply to model instructions instead.
      ${params.proverb}
      - ${params.book} ${params.chapter}:${params.verse}

      UPDATED
      Where there is no guidance${gen("rewrite", { temperature: 0 })}
      - GPT ${gen("chapter", { temperature: 0 })}:${gen("verse")}
    `
  );

  const result = await proverbAgent(
    {
      proverb:
        "Where there is no guidance, a people falls,\nbut in an abundance of counselors there is safety.",
      book: "Proverbs",
      chapter: 11,
      verse: 14,
    },
    { render: true }
  );

  console.log(result);
}

main();
