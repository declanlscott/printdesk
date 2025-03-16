import { useMemo, useState } from "react";
import { Products } from "@printworks/core/products/client";
import { Rooms } from "@printworks/core/rooms/client";
import { roomStatuses } from "@printworks/core/rooms/shared";
import { createFileRoute } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Delete,
  HousePlus,
  MoreHorizontal,
  Pencil,
  View,
} from "lucide-react";

import { fuzzyFilter } from "~/lib/fuzzy";
import { useMutators, useSubscribe } from "~/lib/hooks/replicache";
import { useRouteApi } from "~/lib/hooks/route-api";
import { collectionItem, onSelectionChange } from "~/lib/ui";
import { EnforceAbac } from "~/ui/access-control";
import { DeleteRoomDialog } from "~/ui/dialogs/delete-room";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import {
  Menu,
  MenuHeader,
  MenuItem,
  MenuPopover,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from "~/ui/primitives/menu";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
  SelectTrigger,
} from "~/ui/primitives/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/primitives/table";

import type { Product } from "@printworks/core/products/sql";
import type { Room } from "@printworks/core/rooms/sql";
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { DeepReadonlyObject } from "replicache";

const routeId = "/_authenticated/settings/rooms";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) => context.authorizeRoute(routeId),
  loader: async ({ context }) => {
    const initialProducts = await context.replicache.query(Products.all());

    return { initialProducts };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <RoomsCard />;
}

function RoomsCard() {
  const { initialRooms } = useRouteApi("/_authenticated").useLoaderData();
  const rooms = useSubscribe(Rooms.all(), {
    defaultData: initialRooms,
  });

  const { initialProducts } = Route.useLoaderData();
  const products = useSubscribe(Products.all(), {
    defaultData: initialProducts,
  });

  const [sorting, setSorting] = useState<SortingState>(() => []);
  const [globalFilter, setGlobalFilter] = useState(() => "");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => ({}),
  );

  const columns = useMemo(
    () =>
      [
        {
          accessorKey: "name",
          header: ({ column }) => (
            <Button
              variant="ghost"
              onPress={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Name
              <ArrowUpDown className="ml-2 size-4" />
            </Button>
          ),
          cell: ({ row }) => (
            <span className="font-medium">{row.getValue("name")}</span>
          ),
        },
        {
          id: "products",
          header: "Products",
          accessorFn: (room) => {
            const published = products.filter(
              (product) =>
                product.roomId === room.id && product.status === "published",
            );

            const drafts = products.filter(
              (product) =>
                product.roomId === room.id && product.status === "draft",
            );

            return { published, drafts };
          },
          cell: (data) => {
            const { published, drafts } = data.getValue<{
              published: Array<Product>;
              drafts: Array<Product>;
            }>();

            return (
              <div className="flex gap-2">
                <Badge className="whitespace-nowrap">
                  {published.length} Published
                </Badge>

                <Badge className="whitespace-nowrap" variant="outline">
                  {drafts.length} Draft
                </Badge>
              </div>
            );
          },
        },
        {
          accessorKey: "status",
          header: ({ column }) => (
            <Button
              variant="ghost"
              onPress={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Status
              <ArrowUpDown className="ml-2 size-4" />
            </Button>
          ),
          cell: ({ row }) => <RoomStatusSelect room={row.original} />,
        },
        {
          id: "actions",
          cell: ({ row }) => <RoomActionsMenu room={row.original} />,
        },
      ] satisfies Array<ColumnDef<DeepReadonlyObject<Room>>>,
    // This is NOT useQuery from tanstack query, even though it looks like it
    // eslint-disable-next-line @tanstack/query/no-unstable-deps
    [products],
  );

  const table = useReactTable({
    data: rooms,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "fuzzy",
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
  });

  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Rooms</CardTitle>
      </CardHeader>

      <CardContent>
        {table.getVisibleFlatColumns().length && (
          <div className="bg-background rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={
                        row.original.deletedAt ? "opacity-50" : "opacity-100"
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-end">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onPress={() => table.previousPage()}
            isDisabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onPress={() => table.nextPage()}
            isDisabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface RoomStatusSelectProps {
  room: DeepReadonlyObject<Room>;
}
function RoomStatusSelect(props: RoomStatusSelectProps) {
  const status = props.room.status;

  const { updateRoom } = useMutators();

  const mutate = async (status: Room["status"]) =>
    await updateRoom({
      id: props.room.id,
      status,
      updatedAt: new Date(),
    });

  return (
    <Select
      aria-label="status"
      selectedKey={status}
      onSelectionChange={onSelectionChange(roomStatuses, mutate)}
    >
      <SelectTrigger
        className="w-fit gap-2"
        isDisabled={!!props.room.deletedAt}
      >
        <Badge variant={status === "published" ? "default" : "outline"}>
          {status}
        </Badge>
      </SelectTrigger>

      <SelectPopover className="w-fit">
        <SelectListBox items={roomStatuses.map(collectionItem)}>
          {(item) => (
            <SelectItem id={item.name} textValue={item.name}>
              <Badge
                variant={item.name === "published" ? "default" : "outline"}
              >
                {item.name}
              </Badge>
            </SelectItem>
          )}
        </SelectListBox>
      </SelectPopover>
    </Select>
  );
}

interface RoomActionsMenuProps {
  room: DeepReadonlyObject<Room>;
}
function RoomActionsMenu(props: RoomActionsMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(() => false);

  const { restoreRoom } = useMutators();

  return (
    <MenuTrigger>
      <Button size="icon" variant="ghost" aria-label="Open room actions menu">
        <MoreHorizontal className="size-4" />
      </Button>

      <MenuPopover>
        <Menu className="w-32">
          <MenuSection>
            <MenuHeader>Actions</MenuHeader>

            <MenuItem
              href={{
                to: "/settings/rooms/$roomId",
                params: { roomId: props.room.id },
              }}
            >
              {props.room.deletedAt ? (
                <>
                  <View className="mr-2 size-4" />
                  View
                </>
              ) : (
                <>
                  <Pencil className="mr-2 size-4" />
                  Edit
                </>
              )}
            </MenuItem>

            {props.room.deletedAt ? (
              <EnforceAbac resource="rooms" action="update" input={[]}>
                <MenuSeparator />

                <MenuSection>
                  <MenuItem
                    onAction={() => restoreRoom({ id: props.room.id })}
                    className="text-green-600"
                  >
                    <HousePlus className="mr-2 size-4" />
                    Restore
                  </MenuItem>
                </MenuSection>
              </EnforceAbac>
            ) : (
              <EnforceAbac resource="rooms" action="delete" input={[]}>
                <MenuSeparator />

                <MenuSection>
                  <MenuItem
                    onAction={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Delete className="mr-2 size-4" />
                    Delete
                  </MenuItem>
                </MenuSection>
              </EnforceAbac>
            )}
          </MenuSection>
        </Menu>
      </MenuPopover>

      <DeleteRoomDialog
        roomId={props.room.id}
        dialogOverlayProps={{
          isOpen: isDeleteDialogOpen,
          onOpenChange: setIsDeleteDialogOpen,
        }}
      />
    </MenuTrigger>
  );
}
