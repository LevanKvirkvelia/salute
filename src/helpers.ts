import { PromptElement, printChatElement } from "./PromptStorage";
import { Outputs } from "./actions/primitives";

export async function renderAgent(
  gen: AsyncGenerator<PromptElement & { outputs: Outputs }>
) {
  let lastRole = null;
  let lastElement: { outputs: Outputs } | null = null;
  for await (const a of gen) {
    if (a.role !== lastRole && a.role !== "disabled") {
      console.log(`\n------------------ ${a.role} ------------------`);
      lastRole = a.role;
    }
    printChatElement(a);
    lastElement = a;
  }

  console.log("\n----------------------------------------");
  console.log(lastElement?.outputs);
}
