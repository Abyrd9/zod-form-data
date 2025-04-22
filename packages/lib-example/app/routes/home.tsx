import { useZodForm, parseZodFormData } from "@abyrd9/zod-form-data";
import type { Route } from "./+types/home";
import { z } from "zod";
import { data, useFetcher } from "react-router";

const SimpleFormSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();

  const submission = parseZodFormData(form, { schema: SimpleFormSchema });
  return data(submission);
}

export default function Home() {
  const fetcher = useFetcher<typeof action>();
  const { fields } = useZodForm({
    schema: SimpleFormSchema,
    errors: fetcher.data?.success ? undefined : fetcher.data?.errors,
  });

  console.log(fields)

  return (
    <main>
      <fetcher.Form method="post">
        <input
          name={fields.name.name}
          value={fields.name.value}
          onChange={(e) => fields.name.onChange(e.target.value)}
        />
        <input
          name={fields.email.name}
          value={fields.email.value}
          onChange={(e) => fields.email.onChange(e.target.value)}
        />
        <input
          name={fields.password.name}
          value={fields.password.value}
          onChange={(e) => fields.password.onChange(e.target.value)}
        />

        <p>{fields.name.error}</p>
        <button type="submit">Submit</button>
      </fetcher.Form>
    </main>
  );
}
