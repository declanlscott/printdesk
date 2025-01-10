import { SiTailscale } from "@icons-pack/react-simple-icons";
import {
  updateServerAuthTokenSchema,
  updateServerTailnetUriSchema,
} from "@printworks/core/papercut/shared";
import { updateTailscaleOauthClientSchema } from "@printworks/core/tailscale/shared";
import { useForm } from "@tanstack/react-form";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeySquare, Link } from "lucide-react";
import { toast } from "sonner";

import { useMutationOptions } from "~/lib/hooks/data";
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
import { Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

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
  const { tailscaleOauthClient } = useMutationOptions();

  const isUpdatingOauthClient =
    useIsMutating({
      mutationKey: tailscaleOauthClient().mutationKey,
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
  const { tailscaleOauthClient } = useMutationOptions();

  const { mutate } = useMutation({
    ...tailscaleOauthClient(),
    onSuccess: () =>
      toast.success(
        "Successfully saved the Tailscale OAuth client credentials.",
      ),
  });

  const form = useForm({
    defaultValues: {
      id: "",
      secret: "",
    },
    onSubmit: ({ value }) => mutate(value),
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
            <form.Field
              name="id"
              validators={{
                onBlur: updateTailscaleOauthClientSchema.entries.id,
              }}
            >
              {({ name, state, handleChange, handleBlur }) => (
                <div>
                  <Label htmlFor={name}>ID</Label>

                  <Input
                    id={name}
                    value={state.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />

                  <span className="text-sm text-red-500">
                    {state.meta.errors.join(", ")}
                  </span>
                </div>
              )}
            </form.Field>

            <form.Field
              name="secret"
              validators={{
                onBlur: updateTailscaleOauthClientSchema.entries.secret,
              }}
            >
              {({ name, state, handleChange, handleBlur }) => (
                <div>
                  <Label htmlFor={name}>Secret</Label>

                  <Input
                    id={name}
                    value={state.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />

                  <span className="text-sm text-red-500">
                    {state.meta.errors.join(", ")}
                  </span>
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>

            <form.Subscribe selector={({ canSubmit }) => canSubmit}>
              {(canSubmit) => (
                <Button type="submit" isDisabled={!canSubmit}>
                  Save
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}

function PapercutCard() {
  const { papercutServerTailnetUri, papercutServerAuthToken } =
    useMutationOptions();

  const isUpdatingTailnetUri =
    useIsMutating({ mutationKey: papercutServerTailnetUri().mutationKey }) > 0;

  const isUpdatingAuthToken =
    useIsMutating({
      mutationKey: papercutServerAuthToken().mutationKey,
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
  const { papercutServerTailnetUri } = useMutationOptions();

  const { mutate } = useMutation({
    ...papercutServerTailnetUri(),
    onSuccess: () =>
      toast.success("Successfully saved the PaperCut server Tailnet URI."),
  });

  const form = useForm({
    defaultValues: {
      tailnetUri: "",
    },
    onSubmit: ({ value }) => mutate(value),
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
            <form.Field
              name="tailnetUri"
              validators={{
                onBlur: updateServerTailnetUriSchema.entries.tailnetUri,
              }}
            >
              {({ name, state, handleChange, handleBlur }) => (
                <div>
                  <Label htmlFor={name}>Server Tailnet URI</Label>

                  <Input
                    id={name}
                    type="url"
                    placeholder="http://100.x.y.z:9191"
                    value={state.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />

                  <span className="text-sm text-red-500">
                    {state.meta.errors.join(", ")}
                  </span>
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>

            <form.Subscribe selector={({ canSubmit }) => canSubmit}>
              {(canSubmit) => (
                <Button type="submit" isDisabled={!canSubmit}>
                  Save
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}

function UpdatePapercutServerAuthToken() {
  const { papercutServerAuthToken } = useMutationOptions();

  const { mutate } = useMutation({
    ...papercutServerAuthToken(),
    onSuccess: () =>
      toast.success("Successfully saved the PaperCut server auth token."),
  });

  const form = useForm({
    defaultValues: {
      authToken: "",
    },
    onSubmit: ({ value }) => mutate(value),
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
            <form.Field
              name="authToken"
              validators={{
                onBlur: updateServerAuthTokenSchema.entries.authToken,
              }}
            >
              {({ name, state, handleChange, handleBlur }) => (
                <div>
                  <Label htmlFor={name}>Server Auth Token</Label>

                  <Input
                    id={name}
                    value={state.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />

                  <span className="text-sm text-red-500">
                    {state.meta.errors.join(", ")}
                  </span>
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>

            <form.Subscribe selector={({ canSubmit }) => canSubmit}>
              {(canSubmit) => (
                <Button type="submit" isDisabled={!canSubmit}>
                  Save
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}
