// app/page.jsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Home() {
  const store = cookies();
  const token = store.get("access_token")?.value;

  redirect(token ? "/dashboard" : "/login");
}
