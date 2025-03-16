import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";
import { Utils } from "@printworks/core/utils/client";
import { Building2, LogOut } from "lucide-react";

import { useTenant } from "~/lib/hooks/tenant";
import { useUser } from "~/lib/hooks/user";
import { AuthStoreApi } from "~/lib/stores/auth";
import { userMenuTriggerButtonStyles } from "~/styles/components/user-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/primitives/avatar";
import {
  Menu,
  MenuHeader,
  MenuItem,
  MenuPopover,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from "~/ui/primitives/menu";

export function UserMenu() {
  const tenant = useTenant();
  const user = useUser();
  const { logout } = AuthStoreApi.useActions();

  return (
    <MenuTrigger>
      <AriaButton
        className={composeRenderProps("", (className, renderProps) =>
          userMenuTriggerButtonStyles({ ...renderProps, className }),
        )}
      >
        <Avatar>
          <AvatarImage src={`/api/users/${user.id}/photo`} alt={user.name} />

          <AvatarFallback className="text-foreground bg-muted border-primary border-2">
            {Utils.getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </AriaButton>

      <MenuPopover placement="bottom" className="min-w-[8rem]">
        <Menu className="w-56">
          <MenuSection>
            <MenuHeader>
              <div className="flex items-center gap-2">
                <Building2 />

                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium leading-none">
                    {tenant.name}
                  </span>

                  <span className="text-muted-foreground text-xs leading-none">
                    {tenant.slug}

                    {user.role === "administrator" ? (
                      <> ({tenant.status})</>
                    ) : null}
                  </span>
                </div>
              </div>
            </MenuHeader>
          </MenuSection>

          <MenuSeparator />

          <MenuSection>
            <MenuHeader>
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium leading-none">
                  {user.name}
                </span>

                <span className="text-muted-foreground text-xs leading-none">
                  {user.email}
                </span>

                <span className="text-muted-foreground/90 text-xs font-thin capitalize leading-none">
                  {user.role}
                </span>
              </div>
            </MenuHeader>
          </MenuSection>

          <MenuSeparator />

          <MenuSection>
            <MenuItem onAction={logout}>
              <LogOut className="text-destructive mr-2 size-4" />

              <span className="text-destructive">Logout</span>
            </MenuItem>
          </MenuSection>
        </Menu>
      </MenuPopover>
    </MenuTrigger>
  );
}
