import { SiTailscale } from "@icons-pack/react-simple-icons";
import {
  updateServerAuthTokenSchema,
  updateServerTailnetUriSchema,
} from "@printworks/core/papercut/shared";
import { tailscaleOauthClientSchema } from "@printworks/core/tailscale/shared";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeySquare, Link } from "lucide-react";
import * as R from "remeda";
import { toast } from "sonner";

import { useAppForm } from "~/lib/hooks/form";
import { useTrpc } from "~/lib/hooks/trpc";
import { labelStyles } from "~/styles/components/primitives/field";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "~/ui/primitives/dialog";

const routeId = "/_authenticated/settings/services";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) => context.authorizeRoute(routeId),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid gap-6">
      <TailscaleCard />

      <PapercutCard />
    </div>
  );
}

function TailscaleCard() {
  const trpc = useTrpc();

  const isUpdatingOauthClient =
    useIsMutating({
      mutationKey:
        trpc.services.tailscale.setOauthClient.mutationOptions().mutationKey,
    }) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tailscale</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="flex justify-between gap-4">
          <div>
            <span className={labelStyles()}>OAuth Client</span>

            <CardDescription>
              Update the Tailscale OAuth client credentials used for
              communication with the PaperCut server.
            </CardDescription>
          </div>

          <DialogTrigger>
            <Button isLoading={isUpdatingOauthClient}>
              <SiTailscale className="mr-2 size-5" />
              {isUpdatingOauthClient ? "Updating" : "Update"}
            </Button>

            <DialogOverlay>
              <UpdateTailscaleOauthClient />
            </DialogOverlay>
          </DialogTrigger>
        </div>
      </CardContent>
    </Card>
  );
}

function UpdateTailscaleOauthClient() {
  const trpc = useTrpc();
  const setOauthClient = useMutation(
    trpc.services.tailscale.setOauthClient.mutationOptions({
      onSuccess: () =>
        toast.success(
          "Successfully saved the Tailscale OAuth client credentials.",
        ),
    }),
  );

  const form = useAppForm({
    validators: {
      onBlur: tailscaleOauthClientSchema,
    },
    defaultValues: {
      id: "",
      secret: "",
    },
    onSubmit: ({ value }) => setOauthClient.mutate(value),
  });

  return (
    <DialogContent>
      {({ close }) => (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Update OAuth Client</DialogTitle>

            <p className="text-muted-foreground text-sm">
              Update the Tailscale OAuth client credentials used for
              communication with the PaperCut server. These are encrypted and{" "}
              <strong>will not be visible after you save them</strong>.
            </p>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <form.AppField name="id">
              {(field) => (
                <field.TextField
                  labelProps={{ children: "ID" }}
                  errorMessageProps={{
                    children: field.state.meta.errors
                      .filter(Boolean)
                      .map(R.prop("message"))
                      .join(", "),
                  }}
                />
              )}
            </form.AppField>

            <form.AppField name="secret">
              {(field) => (
                <field.TextField
                  labelProps={{ children: "Secret" }}
                  errorMessageProps={{
                    children: field.state.meta.errors
                      .filter(Boolean)
                      .map(R.prop("message"))
                      .join(", "),
                  }}
                />
              )}
            </form.AppField>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>

            <form.AppForm>
              <form.SubmitButton>Save</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}

function PapercutCard() {
  const trpc = useTrpc();

  const isUpdatingTailnetUri =
    useIsMutating({
      mutationKey:
        trpc.services.papercut.setServerTailnetUri.mutationOptions()
          .mutationKey,
    }) > 0;

  const isUpdatingAuthToken =
    useIsMutating({
      mutationKey:
        trpc.services.papercut.setServerAuthToken.mutationOptions().mutationKey,
    }) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>PaperCut</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="flex justify-between gap-4">
          <div>
            <span className={labelStyles()}>Server Tailnet URI</span>

            <CardDescription>
              Update the URI of the PaperCut server on your Tailnet.
            </CardDescription>
          </div>

          <DialogTrigger>
            <Button isLoading={isUpdatingTailnetUri}>
              <Link className="mr-2 size-5" />
              {isUpdatingTailnetUri ? "Updating" : "Update"}
            </Button>

            <DialogOverlay>
              <UpdatePapercutServerTailnetUri />
            </DialogOverlay>
          </DialogTrigger>
        </div>

        <div className="flex justify-between gap-4">
          <div>
            <span className={labelStyles()}>Server Auth Token</span>

            <CardDescription>
              Update the auth token of the PaperCut server.
            </CardDescription>
          </div>

          <DialogTrigger>
            <Button isLoading={isUpdatingAuthToken}>
              <KeySquare className="mr-2 size-5" />
              {isUpdatingAuthToken ? "Updating" : "Update"}
            </Button>

            <DialogOverlay>
              <UpdatePapercutServerAuthToken />
            </DialogOverlay>
          </DialogTrigger>
        </div>
      </CardContent>
    </Card>
  );
}

function UpdatePapercutServerTailnetUri() {
  const trpc = useTrpc();

  const setServerTailnetUri = useMutation(
    trpc.services.papercut.setServerTailnetUri.mutationOptions({
      onSuccess: () =>
        toast.success("Successfully saved the PaperCut server Tailnet URI."),
    }),
  );

  const form = useAppForm({
    validators: {
      onBlur: updateServerTailnetUriSchema,
    },
    defaultValues: {
      tailnetUri: "",
    },
    onSubmit: ({ value }) => setServerTailnetUri.mutate(value),
  });

  return (
    <DialogContent>
      {({ close }) => (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Update Server Tailnet URI</DialogTitle>

            <p className="text-muted-foreground text-sm">
              Update the URI of the PaperCut server on your tailnet. This is
              encrypted and{" "}
              <strong>will not be visible after you save it</strong>.
            </p>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <form.AppField name="tailnetUri">
              {(field) => (
                <field.TextField
                  labelProps={{ children: "Server Tailnet URI" }}
                  inputProps={{
                    type: "url",
                    placeholder: "http://100.x.y.z:9191",
                  }}
                  errorMessageProps={{
                    children: field.state.meta.errors
                      .filter(Boolean)
                      .map(R.prop("message"))
                      .join(", "),
                  }}
                />
              )}
            </form.AppField>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>

            <form.AppForm>
              <form.SubmitButton>Save</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}

function UpdatePapercutServerAuthToken() {
  const trpc = useTrpc();

  const setServerAuthToken = useMutation(
    trpc.services.papercut.setServerAuthToken.mutationOptions({
      onSuccess: () =>
        toast.success("Successfully saved the PaperCut server auth token."),
    }),
  );

  const form = useAppForm({
    validators: {
      onBlur: updateServerAuthTokenSchema,
    },
    defaultValues: {
      authToken: "",
    },
    onSubmit: ({ value }) => setServerAuthToken.mutate(value),
  });

  return (
    <DialogContent>
      {({ close }) => (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Update Server Auth Token</DialogTitle>

            <p className="text-muted-foreground text-sm">
              Update the auth token of the PaperCut server. This is encrypted
              and <strong>will not be visible after you save it</strong>.
            </p>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <form.AppField name="authToken">
              {(field) => (
                <field.TextField
                  labelProps={{ children: "Server Auth Token" }}
                  errorMessageProps={{
                    children: field.state.meta.errors
                      .filter(Boolean)
                      .map(R.prop("message"))
                      .join(", "),
                  }}
                />
              )}
            </form.AppField>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>

            <form.AppForm>
              <form.SubmitButton>Save</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}
