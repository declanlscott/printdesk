import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai/react";
import {
  ChevronsUpDown,
  CircleCheck,
  CircleDashed,
  Home,
  Search,
} from "lucide-react";

import logo from "~/assets/logo.svg";
import { selectedRoomIdAtom } from "~/lib/atoms/selected-room-id";
import { useAuthenticatedRouteApi } from "~/lib/hooks/auth";
import { useCommandBarActions } from "~/lib/hooks/command-bar";
import { query } from "~/lib/hooks/data";
import { useIsSyncing, useSubscribe } from "~/lib/hooks/replicache";
import { useUser } from "~/lib/hooks/user";
import { links } from "~/lib/links";
import { linkStyles, logoStyles } from "~/styles/components/main-nav";
import { CommandBar } from "~/ui/command-bar";
import { Button } from "~/ui/primitives/button";
import {
  BaseCombobox,
  ComboboxCollection,
  ComboboxInput,
  ComboboxItem,
  ComboboxListBox,
  ComboboxPopover,
} from "~/ui/primitives/combobox";
import { DialogTrigger } from "~/ui/primitives/dialog";
import { FieldGroup } from "~/ui/primitives/field";
import { KeyboardShortcut } from "~/ui/primitives/keyboard-shortcut";
import { Separator } from "~/ui/primitives/separator";
import { Tooltip, TooltipTrigger } from "~/ui/primitives/tooltip";
import { UserMenu } from "~/ui/user-menu";

import type { ComponentProps } from "react";

export function MainNav() {
  const isSyncing = useIsSyncing();

  return (
    <header className="bg-background sticky top-0 z-50 flex h-16 items-center justify-between border-b px-4">
      <nav className="flex items-center space-x-4 lg:space-x-6">
        <a href="/" className={logoStyles({ isAnimating: isSyncing })}>
          <img src={logo} alt="Printworks" />
        </a>

        <Separator orientation="vertical" className="h-8" />

        <RoomSelector />

        <NavList />
      </nav>

      <div className="flex gap-4">
        <SearchCommand />

        <UserMenu />
      </div>
    </header>
  );
}

function RoomSelector() {
  const [selectedRoomId, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  const { initialRooms } = useAuthenticatedRouteApi().useLoaderData();
  const rooms = useSubscribe(query.rooms(), {
    defaultData: initialRooms,
    onData: (rooms) => {
      if (selectedRoomId && !rooms.some((room) => room.id === selectedRoomId))
        setSelectedRoomId(null);
    },
  });

  return (
    <div className="hidden md:flex">
      <BaseCombobox
        aria-label="Select Room"
        onSelectionChange={setSelectedRoomId}
        selectedKey={selectedRoomId}
      >
        <FieldGroup className="p-0">
          <div className="flex items-center pl-3">
            <Home className="size-4 opacity-50" />
          </div>

          <ComboboxInput
            placeholder="Select a room..."
            className="w-32"
            aria-controls="room-selector-listbox"
          />

          <Button variant="ghost" size="icon" className="mr-1 size-6 p-1">
            <ChevronsUpDown aria-hidden="true" className="size-4 opacity-50" />
          </Button>
        </FieldGroup>

        <ComboboxPopover>
          <ComboboxListBox id="room-selector-listbox">
            <ComboboxCollection items={rooms}>
              {(room) => (
                <ComboboxItem textValue={room.name} id={room.id} key={room.id}>
                  <div className="flex w-full items-center justify-between">
                    {room.name}

                    {room.status === "draft" ? (
                      <CircleDashed className="size-4 opacity-50" />
                    ) : (
                      <CircleCheck className="size-4 opacity-50" />
                    )}
                  </div>
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxListBox>
        </ComboboxPopover>
      </BaseCombobox>
    </div>
  );
}

function NavList() {
  const user = useUser();

  return (
    <ul className="flex items-center">
      {links.mainNav()[user.profile.role].map((link) => (
        <li key={link.name}>
          <TooltipTrigger>
            <Link href={link.props.href} className="flex items-center gap-2">
              <div className="[&>svg]:size-5">{link.icon}</div>

              <span className="hidden lg:block">{link.name}</span>
            </Link>

            <Tooltip placement="bottom" className="lg:hidden">
              <p>{link.name}</p>
            </Tooltip>
          </TooltipTrigger>
        </li>
      ))}
    </ul>
  );
}

type LinkProps = ComponentProps<typeof AriaLink>;
function Link(props: LinkProps) {
  const { href } = useRouterState({
    select: (state) => state.location,
  });

  const { buildLocation } = useRouter();

  const isActive = href.startsWith(
    props.href ? buildLocation(props.href).href : "",
  );

  return (
    <AriaLink
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        linkStyles({ ...renderProps, isActive, className }),
      )}
    />
  );
}

function SearchCommand() {
  const { reset } = useCommandBarActions();

  return (
    <DialogTrigger onOpenChange={(isOpen) => isOpen && reset()}>
      <Button variant="outline" className="w-fit justify-between md:w-40">
        <div className="flex items-center">
          <Search className="size-4 shrink-0 opacity-50 md:mr-2" />

          <span className="text-muted-foreground hidden font-normal md:block">
            Search...
          </span>
        </div>

        <KeyboardShortcut>⌘K</KeyboardShortcut>
      </Button>

      <CommandBar />
    </DialogTrigger>
  );
}
