import { PromptElement, PromptStorage, Roles } from "./PromptStorage";

export type PromiseOrCursor<Element, Return = void> = {
  next: (...args: [] | [unknown]) => Promise<IteratorResult<Element, Return>>;
  generator: AsyncGenerator<Element, Return, any>;
  then(cb: (result: Return) => void): void;
};
export type Variables = { [key: string]: string };

export type ActionProps<Parameters> = {
  context: {
    role: Roles;
  };
  params: Parameters;
  vars: Variables;
  currentPrompt: PromptStorage;
  completion: LLMCompletionFn;
  nextString: string | undefined;
};

export type Action<Parameters> = (
  props: ActionProps<Parameters>
) => PromiseOrCursor<PromptElement, void>;

export type AnyObject = Record<string, any>;

export type LLMAction<T extends AnyObject> = (
  props: T
) => PromiseOrCursor<PromptElement, { prompt: PromptStorage; vars: Variables }>;

export type LLMCompletionFn = (props: {
  prompt: PromptStorage;
  stop?: string;
}) => PromiseOrCursor<string, string>;
