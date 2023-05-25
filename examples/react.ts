import { assistant, gen, gpt4, loop, system, user, wait } from "..";
import { block } from "../src/actions/actions";

async function main() {
  const agent = gpt4<
    { goal: string },
    { option: string[]; prosandcons: string }
  >(
    ({ params, user, outputs }) => [
      system`You are a helpful assistant`,
      user`I want to ${params.goal}.`,
      block(
        [
          user`
          Can you please generate one option for how to accomplish this?
          Please make the option very short, at most one line.
        `,
          assistant`${gen("option", { temperature: 1, maxTokens: 500, n: 5 })}`,
        ],
        { hidden: () => outputs.option?.length > 0 }
      ),
      block(
        [
          user`
          Can you please comment on the pros and cons of each of the following options, and then pick the best option?
          ---
          ${({ outputs }) =>
            outputs.option.map((o, i) => `Option ${i}: ${o}`).join("\n")}
          ---
          Please discuss each option very briefly (one line for pros, one for cons), and end by saying Best=X, where X is the best option.
        `,
          assistant`${gen("prosandcons", { temperature: 0, maxTokens: 500 })}`,
        ],
        { hidden: () => !!outputs.prosandcons }
      ),
      user`
      Here is my plan:
      ${({ outputs }) =>
        outputs.option[+(outputs.prosandcons.match(/Best=(\d+)/)?.[1] || 0)]}
      Please elaborate on this plan, and tell me how to best accomplish it.
    `,
      assistant`${gen("plan", { maxTokens: 500 })}`,
    ],
    { stream: true }
  );

  const result = await agent({ goal: "read more books" }, { render: true });

  console.log(result);
}

main();
