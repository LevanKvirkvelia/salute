import { davinci } from "..";

async function main() {
  const jsonAgent = davinci(
    ({ ai, gen }) => ai`
        The following is a character profile for an RPG game in JSON format.
    
        json
        {
            "description": "${gen("description", { stop: '"' })}",
            "name": "${gen("name", { stop: '"' })}",
            "age": ${gen("age", { stop: "," })},
            "class": "${gen("class", { stop: '"' })}",
            "mantra": "${gen("mantra", { stop: '"' })}",
            "strength": ${gen("strength", { stop: "," })},
            "items": [${[0, 0, 0].map(
              () => ai`"${gen("item", { stop: '"' })}",`
            )}]
        }`,

    { stream: true }
  );

  const result = await jsonAgent({}, { render: true });
  console.log(result);
}

main();
