import { ChatCompletionRequestMessage } from "openai";

export type PromptSources = "llm" | "parameter" | "constant" | "prompt";

export type Roles = "user" | "assistant" | "system" | "none";
export type PromptElement = {
  content: string;
  source: PromptSources;
  role: Roles;
  hidden?: boolean | (() => boolean);
};

export type Message = PromptElement[];

export class PromptStorage extends Array<Message> {
  pushElement(promptElement: PromptElement) {
    // console.log("pushing element", promptElement);
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

  getElement(promptElement: PromptElement) {
    return promptElement;
  }

  getLLMElement(generated: string) {
    return {
      content: generated,
      role: "assistant",
      source: "llm",
    } as PromptElement;
  }

  toString(): string {
    return this.map((m) => {
      return m.map((promptElement) => promptElement.content).join("");
    }).join("");
  }

  toChatCompletion() {
    const messages: ChatCompletionRequestMessage[] = [];
    for (const rolePrompt of this) {
      rolePrompt.forEach((promptElement, i) => {
        if (promptElement.role === "none")
          throw new Error("Role cannot be 'none' or 'disabled'");
        try {
          const isHidden =
            (typeof promptElement.hidden === "function"
              ? promptElement.hidden()
              : promptElement.hidden) || false;
          if (isHidden) return;
        } catch (e) {
          console.log(e);
        }
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
