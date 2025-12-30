import { Button } from "@printdesk/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div>
      <div className="p-2 text-red-500">Hello from About!</div>
      <Button>Button!</Button>
    </div>
  );
}
