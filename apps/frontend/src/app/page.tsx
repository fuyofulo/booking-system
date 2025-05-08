import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");

  // This won't render since we're redirecting
  return null;
}
