import chalk = require("chalk");
import { ChatCompletionRequestMessage } from "openai";

export type PromptSources = "llm" | "parameter" | "constant" | "prompt";

export type Roles = "user" | "assistant" | "system" | "none";
export type PromptElement<Role extends Roles = Roles> = {
  content: string;
  source: PromptSources;
  role: Role;
};

export type Message = PromptElement[];

export class PromptStorage extends Array<Message> {
  constructor(private roles: boolean = true) {
    super();
  }

  pushElement(promptElement: PromptElement) {
    // console.log("pushing element", promptElement);
    const lastRolePrompt = this[this.length - 1];

    const lastRolePromptRole =
      lastRolePrompt?.[lastRolePrompt.length - 1]?.role;

    if (!this.roles) promptElement.role = "none";

    if (!lastRolePrompt || lastRolePromptRole !== promptElement.role) {
      super.push([promptElement]);
    } else {
      lastRolePrompt.push(promptElement);
    }
    return promptElement;
  }

  getElement(promptElement: PromptElement) {
    return promptElement;
  }

  getLLMElement(generated: string) {
    return {
      content: generated,
      role: this.roles ? "assistant" : "none",
      source: "llm",
    } as PromptElement;
  }

  toOpenAIPrompt() {
    if (this.roles) {
      const messages: ChatCompletionRequestMessage[] = [];
      for (const rolePrompt of this) {
        rolePrompt.forEach((promptElement, i) => {
          if (promptElement.role === "none")
            throw new Error("Role cannot be 'none'");

          if (i === 0) {
            messages.push({
              content: promptElement.content,
              role: promptElement.role,
            });
          } else {
            messages[messages.length - 1].content += promptElement.content;
          }
        });
      }
      return messages;
    } else {
      return this.map((mes) => {
        return mes.map((promptElement) => promptElement.content).join("");
      }).join("");
    }
  }
}

export function printChatElement(element: PromptElement) {
  switch (element.source) {
    case "constant":
      process.stdout.write(chalk.yellow(element.content));
      break;
    case "parameter":
      process.stdout.write(chalk.bgBlue(element.content));
      break;
    case "prompt":
      process.stdout.write(element.content);
      break;
    case "llm":
      process.stdout.write(chalk.bgGreen(element.content));
      break;
  }
}

function prettyChatLog(chat: PromptStorage) {
  for (const rolePrompt of chat) {
    console.log(`----------${rolePrompt[0].role}----------\n`);
    rolePrompt.forEach((el) => printChatElement(el));
    console.log("\n");
  }
}
