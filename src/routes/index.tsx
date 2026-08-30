import { createFileRoute } from "@tanstack/react-router";
import { BinderApp } from "@/components/binder-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <BinderApp />;
}
