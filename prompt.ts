import chalk = require("chalk");
import { ChatCompletionRequestMessage } from "openai";

export type PromptSources = "llm" | "parameter" | "constant" | "prompt";
export type Roles = "user" | "assistant" | "system";

export type PromptElement = {
  content: string;
  source: PromptSources;
};
export type ChatPromptElement = PromptElement & { role: Roles };

export type PromptElementTypes = PromptElement | ChatPromptElement;
export type PromptTypes = Prompt | ChatPrompt;

export type ChatRolePrompt = ChatPromptElement[];

export class ChatPrompt extends Array<ChatRolePrompt> {
  pushElement(promptElement: ChatPromptElement) {
    const lastRolePrompt = this[this.length - 1];

    const lastRolePromptRole =
      lastRolePrompt?.[lastRolePrompt.length - 1]?.role;

    if (!lastRolePrompt || lastRolePromptRole !== promptElement.role) {
      super.push([promptElement]);
    } else {
      lastRolePrompt.push(promptElement);
    }
    return promptElement;
  }

  getLLMElement(generated: string) {
    return {
      content: generated,
      role: "assistant",
      source: "llm",
    } as ChatPromptElement;
  }

  toOpenAIPrompt() {
    const messages: ChatCompletionRequestMessage[] = [];
    for (const rolePrompt of this) {
      rolePrompt.forEach((promptElement, i) => {
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
  }
}

export class Prompt extends Array<PromptElement> {
  pushElement(promptElement: PromptElement) {
    this.push(promptElement);
    return promptElement;
  }

  getLLMElement(promptElement: string) {
    const newElement: PromptElement = {
      content: promptElement,
      source: "llm",
    };

    return newElement;
  }

  toOpenAIPrompt() {
    let prompt = "";
    for (const promptElement of this) {
      prompt += promptElement.content;
    }
    return prompt;
  }
}

export function printChatElement(element: ChatPromptElement) {
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

function prettyChatLog(chat: ChatPrompt) {
  for (const rolePrompt of chat) {
    console.log(`----------${rolePrompt[0].role}----------\n`);
    rolePrompt.forEach((el) => printChatElement(el));
    console.log("\n");
  }
}
