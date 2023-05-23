import { PromptElement, printChatElement } from "./PromptStorage";
import { Outputs } from "./actions/primitives";

export async function renderAgent(
  gen: AsyncGenerator<PromptElement & { outputs: Outputs }>
) {
  let lastRole = null;
  let lastElement: { outputs: Outputs } | null = null;
  let hasRoles = true;
  for await (const a of gen) {
    if (hasRoles && a.role === "none") hasRoles = false;
    if (a.role !== lastRole && hasRoles) {
      console.log(`\n------------------ ${a.role} ------------------`);
      lastRole = a.role;
    }
    printChatElement(a);
    lastElement = a;
  }

  console.log("\n----------------------------------------");
  console.log(lastElement?.outputs);
}

export function isPromise<T>(obj: any): obj is Promise<T> {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  );
}
