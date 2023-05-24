import { PromptElement, printChatElement } from "./PromptStorage";
import { Outputs } from "./actions/primitives";

export async function renderAgent(
  gen: AsyncGenerator<PromptElement & { outputs: Outputs }>,
  showRoles = true
) {
  let lastRole = null;
  let lastElement: { outputs: Outputs } | null = null;

  for await (const a of gen) {
    if (a.role !== lastRole && showRoles) {
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

export function isArrayTemplateStringsArray(
  strings: any | TemplateStringsArray
): strings is TemplateStringsArray {
  return Array.isArray((strings as TemplateStringsArray).raw);
}
