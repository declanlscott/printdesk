import { useContext, useEffect } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";
import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Check, CircleCheck, CircleDashed, Home, LogOut } from "lucide-react";

import {
  EnforceAbac,
  EnforceRouteAbac,
} from "~/app/components/ui/access-control";
import { Avatar, AvatarImage } from "~/app/components/ui/primitives/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/app/components/ui/primitives/command";
import { DialogOverlay } from "~/app/components/ui/primitives/dialog";
import { selectedRoomIdAtom } from "~/app/lib/atoms";
import {
  useCommandBar,
  useCommandBarActions,
} from "~/app/lib/hooks/command-bar";
import { query, useMutator } from "~/app/lib/hooks/data";
import { useSubscribe } from "~/app/lib/hooks/replicache";
import { useUser } from "~/app/lib/hooks/user";
import { links } from "~/app/lib/links";

import type { Room } from "@printworks/core/rooms/sql";
import type { ToOptions } from "@tanstack/react-router";
import type { CommandBarPage } from "~/app/types";

export function CommandBar() {
  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { getActivePage, popPage } = useCommandBarActions();
  const activePage = getActivePage();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        state?.toggle();
      }
    };

    document.addEventListener("keydown", down);

    return () => document.removeEventListener("keydown", down);
  }, [state]);

  return (
    <DialogOverlay>
      <CommandDialog
        commandProps={{
          onKeyDown(e) {
            if (activePage.type === "home" || input.length) return;

            if (e.key === "Backspace") {
              e.preventDefault();

              popPage();
            }
          },
        }}
      >
        {activePage.type === "home" && <HomeCommand {...activePage} />}

        {activePage.type === "room" && <RoomCommand {...activePage} />}

        {activePage.type === "room-settings-select-room" && (
          <RoomSettingsSelectRoomCommand {...activePage} />
        )}

        {activePage.type === "product-settings-select-room" && (
          <ProductSettingsSelectRoomCommand {...activePage} />
        )}

        {activePage.type === "product-settings-select-product" && (
          <ProductSettingsSelectProductCommand {...activePage} />
        )}
      </CommandDialog>
    </DialogOverlay>
  );
}

type HomeCommandProps = Extract<CommandBarPage, { type: "home" }>;
function HomeCommand(_props: HomeCommandProps) {
  const user = useUser();

  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { setInput, pushPage } = useCommandBarActions();

  const navigate = useNavigate();

  const rooms = useSubscribe(query.rooms());
  const users = useSubscribe(query.users());

  const handleNavigation = async (to: ToOptions) =>
    navigate(to).then(() => state?.close());

  const navigationKeywords = ["navigation", "navigate"];

  return (
    <>
      <CommandInput
        placeholder="Type a command or search..."
        autoFocus
        value={input}
        onValueChange={setInput}
      />

      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {links.mainNav()[user.profile.role].map((link) => (
            <CommandItem
              key={link.name}
              onSelect={() => handleNavigation(link.props.href)}
              keywords={navigationKeywords}
            >
              <div className="mr-2 [&>svg]:size-5">{link.icon}</div>

              <p>
                Jump to <span className="font-medium">{link.name}</span>
              </p>
            </CommandItem>
          ))}

          {/* <CommandItem keywords={[...navigationKeywords, "log out"]}>
            <LogOut className="text-destructive mr-2 size-5" />

            <span className="text-destructive">Logout</span>
          </CommandItem> */}
        </CommandGroup>

        {rooms?.length ? (
          <>
            <CommandSeparator />

            <CommandGroup heading="Rooms">
              {rooms.map((room) => (
                <CommandItem
                  key={room.id}
                  onSelect={() => pushPage({ type: "room", roomId: room.id })}
                  keywords={["rooms", "room"]}
                >
                  <Home className="mr-2 size-5" />

                  <span>{room.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {users?.length ? (
          <>
            <CommandSeparator />

            <CommandGroup heading="Users">
              {users.map((u) => (
                <EnforceRouteAbac
                  routeId="/_authenticated/users/$userId"
                  input={[u.id]}
                  unauthorized={
                    <CommandItem key={u.id} keywords={["users", "user"]}>
                      <Avatar className="mr-3 size-8">
                        <AvatarImage src={`/api/users/${u.id}/photo`} />
                      </Avatar>

                      <span>{u.profile.name}</span>
                    </CommandItem>
                  }
                >
                  <CommandItem
                    key={u.id}
                    keywords={["users", "user"]}
                    onSelect={async () =>
                      handleNavigation({
                        to: "/users/$userId",
                        params: { userId: u.id },
                      })
                    }
                  >
                    <Avatar className="mr-3 size-8">
                      <AvatarImage src={`/api/users/${u.id}/photo`} />
                    </Avatar>

                    <span>{u.profile.name}</span>
                  </CommandItem>
                </EnforceRouteAbac>
              ))}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />

        <CommandGroup heading="Scope">
          {links.settings()[user.profile.role].map((link) => (
            <CommandItem
              key={`settings-${link.name}`}
              onSelect={() => handleNavigation(link.props.href)}
              keywords={["scope", "settings"]}
            >
              <div className="mr-2 [&>svg]:size-5">{link.icon}</div>

              <p>
                Jump to <span className="font-medium">Settings</span>{" "}
                {link.name}
              </p>
            </CommandItem>
          ))}

          {links.roomSettings("")[user.profile.role].map((link) => (
            <CommandItem
              key={`room-settings-${link.name}`}
              onSelect={() =>
                pushPage({
                  type: "room-settings-select-room",
                  to: link.props.href.to,
                })
              }
              keywords={["scope", "room settings"]}
            >
              <div className="mr-2 [&>svg]:size-5">{link.icon}</div>

              <p>
                Jump to <span className="font-medium">Room Settings</span>{" "}
                {link.name}
              </p>
            </CommandItem>
          ))}

          {links.productSettings("", "")[user.profile.role].map((link) => (
            <CommandItem
              key={`product-settings-${link.name}`}
              onSelect={() =>
                pushPage({
                  type: "product-settings-select-room",
                  to: link.props.href.to,
                })
              }
              keywords={["scope", "product settings"]}
            >
              <div className="mr-2 [&>svg]:size-5">{link.icon}</div>

              <p>
                Jump to <span className="font-medium">Product Settings</span>{" "}
                {link.name}
              </p>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}

type RoomCommandProps = Extract<CommandBarPage, { type: "room" }>;
function RoomCommand(props: RoomCommandProps) {
  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { setInput, popPage } = useCommandBarActions();

  const [, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  const { updateRoom } = useMutator();

  const room = useSubscribe(query.room(props.roomId));

  function selectRoom() {
    setSelectedRoomId(props.roomId);

    state?.close();
  }

  async function updateRoomStatus(status: Room["status"]) {
    await updateRoom({
      id: props.roomId,
      status,
      updatedAt: new Date(),
    });

    state?.close();
  }

  return (
    <>
      <CommandInput
        placeholder={`Room: ${room?.name}`}
        autoFocus
        value={input}
        onValueChange={setInput}
        back={{ buttonProps: { onPress: () => popPage() } }}
      />

      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Room">
          {room && (
            <>
              <CommandItem onSelect={() => selectRoom()}>
                <Check className="mr-2 size-5" />

                <p>
                  <span className="font-medium">Select</span> {room.name}
                </p>
              </CommandItem>

              <EnforceAbac resource="rooms" action="update" input={[]}>
                {room.status === "draft" ? (
                  <CommandItem onSelect={() => updateRoomStatus("published")}>
                    <CircleCheck className="mr-2 size-5" />

                    <p>
                      <span className="font-medium">Publish</span> {room.name}
                    </p>
                  </CommandItem>
                ) : (
                  <CommandItem onSelect={() => updateRoomStatus("draft")}>
                    <CircleDashed className="mr-2 size-5" />

                    <p>
                      <span className="font-medium">Draft</span> {room.name}
                    </p>
                  </CommandItem>
                )}
              </EnforceAbac>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </>
  );
}

type RoomSettingsSelectRoomCommandProps = Extract<
  CommandBarPage,
  { type: "room-settings-select-room" }
>;
function RoomSettingsSelectRoomCommand(
  props: RoomSettingsSelectRoomCommandProps,
) {
  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { setInput, popPage } = useCommandBarActions();

  const rooms = useSubscribe(query.rooms());

  const navigate = useNavigate();

  const handleNavigation = async (to: ToOptions) =>
    navigate(to).then(() => state?.close());

  return (
    <>
      <CommandInput
        placeholder="Select room..."
        autoFocus
        value={input}
        onValueChange={setInput}
        back={{ buttonProps: { onPress: () => popPage() } }}
      />

      <CommandList>
        <CommandEmpty>No rooms found.</CommandEmpty>

        <CommandGroup heading="Rooms">
          {rooms?.map((room) => (
            <CommandItem
              key={room.id}
              onSelect={() =>
                handleNavigation({ to: props.to, params: { roomId: room.id } })
              }
            >
              {room.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}

type ProductSettingsSelectRoomCommandProps = Extract<
  CommandBarPage,
  { type: "product-settings-select-room" }
>;
function ProductSettingsSelectRoomCommand(
  props: ProductSettingsSelectRoomCommandProps,
) {
  const { input } = useCommandBar();
  const { setInput, popPage, pushPage } = useCommandBarActions();

  const rooms = useSubscribe(query.rooms());

  return (
    <>
      <CommandInput
        placeholder="Select room..."
        autoFocus
        value={input}
        onValueChange={setInput}
        back={{ buttonProps: { onPress: () => popPage() } }}
      />

      <CommandList>
        <CommandEmpty>No rooms found.</CommandEmpty>

        <CommandGroup heading="Rooms">
          {rooms?.map((room) => (
            <CommandItem
              key={room.id}
              onSelect={() =>
                pushPage({
                  type: "product-settings-select-product",
                  roomId: room.id,
                  to: props.to,
                })
              }
            >
              {room.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}

type ProductSettingsSelectProductCommandProps = Extract<
  CommandBarPage,
  { type: "product-settings-select-product" }
>;
function ProductSettingsSelectProductCommand(
  props: ProductSettingsSelectProductCommandProps,
) {
  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { setInput, popPage } = useCommandBarActions();

  const products = useSubscribe(query.products(), {
    onData: (products) =>
      products.filter((product) => product.roomId === props.roomId),
  });

  const navigate = useNavigate();

  const handleNavigation = async (to: ToOptions) =>
    navigate(to).then(() => state?.close());

  return (
    <>
      <CommandInput
        placeholder="Select product..."
        autoFocus
        value={input}
        onValueChange={setInput}
        back={{ buttonProps: { onPress: () => popPage() } }}
      />

      <CommandList>
        <CommandEmpty>No products found.</CommandEmpty>

        {products?.length ? (
          <CommandGroup heading="Products">
            {products?.map((product) => (
              <CommandItem
                key={product.id}
                onSelect={() =>
                  handleNavigation({
                    to: props.to,
                    params: { roomId: props.roomId, productId: product.id },
                  })
                }
              >
                {product.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </>
  );
}
