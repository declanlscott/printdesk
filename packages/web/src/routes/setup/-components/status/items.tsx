import { Check, X } from "lucide-react";

import { Spinner } from "~/ui/primitives/spinner";

export interface ItemProps {
  name: string;
  isActive?: boolean;
}

export function PendingItem({ name, isActive = false }: ItemProps) {
  return (
    <li>
      <div className="flex items-center gap-2">
        {isActive ? <Spinner className="size-5" /> : <div className="size-5" />}

        <p className={isActive ? "font-semibold" : "text-muted-foreground"}>
          {name}
        </p>
      </div>
    </li>
  );
}

export function SuccessItem({ name }: ItemProps) {
  return (
    <li>
      <div className="flex items-center gap-2">
        <Check className="size-5 text-green-500" />

        <p className="text-muted-foreground">{name}</p>
      </div>
    </li>
  );
}

export function FailureItem({ name, isActive = false }: ItemProps) {
  return (
    <li>
      <div className="flex items-center gap-2">
        <X className="text-destructive size-5" />

        <p className={isActive ? "font-semibold" : "text-muted-foreground"}>
          {name}
        </p>
      </div>
    </li>
  );
}
