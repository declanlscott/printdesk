import { createFileRoute } from "@tanstack/react-router";

import { RegistrationWizardLayout } from "~/layouts/registration/wizard";

export const Route = createFileRoute("/register/_slug/_wizard")({
  component: RegistrationWizardLayout,
});
