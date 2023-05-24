import { davinci, renderAgent } from "..";

async function main() {
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
            "items": [${[0, 0, 0].map(
              () => ai`"${gen("item", { stop: '"' })}",`
            )}]
        }`
  );

  renderAgent(proverbAgent({}).generator);
}

main();
