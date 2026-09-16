import { Constants } from "@printdesk/core/utils/constants";
import { Avatar } from "@printdesk/ui/avatar";
import { AvatarBadge } from "@printdesk/ui/avatar/badge";
import { AvatarFallback } from "@printdesk/ui/avatar/fallback";
import { AvatarGroup } from "@printdesk/ui/avatar/group";
import { AvatarGroupCount } from "@printdesk/ui/avatar/group-count";
import { AvatarImage } from "@printdesk/ui/avatar/image";
import { Badge } from "@printdesk/ui/badge";
import { LinkBadge } from "@printdesk/ui/badge/link";
import { Button } from "@printdesk/ui/button";
import { Card } from "@printdesk/ui/card";
import { CardContent } from "@printdesk/ui/card/content";
import { CardFooter } from "@printdesk/ui/card/footer";
import { CardHeader } from "@printdesk/ui/card/header";
import { CardTitle } from "@printdesk/ui/card/title";
import { Checkbox } from "@printdesk/ui/checkbox";
import { Field } from "@printdesk/ui/field";
import { FieldContent } from "@printdesk/ui/field/content";
import { FieldDescription } from "@printdesk/ui/field/description";
import { FieldError } from "@printdesk/ui/field/error";
import { FieldGroup } from "@printdesk/ui/field/group";
import { FieldLabel } from "@printdesk/ui/field/label";
import { FieldLegend } from "@printdesk/ui/field/legend";
import { FieldSeparator } from "@printdesk/ui/field/separator";
import { FieldSet } from "@printdesk/ui/field/set";
import { FieldTitle } from "@printdesk/ui/field/title";
import { Input } from "@printdesk/ui/input";
import { spacing } from "@printdesk/ui/styles/tokens.stylex";
import { Switch } from "@printdesk/ui/switch";
import x from "@stylexjs/atoms";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: function () {
    return (
      <div>
        <div>{'Hello "/"!'}</div>
        <Card size="default" sx={[x.width("50%")]}>
          <CardHeader>
            <CardTitle>{"Card Title"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Input id="input-demo-api-key" type="password" placeholder="sk-..." />

            <div>
              <Badge>{"Default"}</Badge>
              <Badge variant="secondary">{"Secondary"}</Badge>
              <Badge variant="destructive">{"Destructive"}</Badge>
              <Badge variant="outline">{"Outline"}</Badge>
              <Badge variant="ghost">{"Ghost"}</Badge>
            </div>

            <div>
              <LinkBadge href="https://google.com">{"Default"}</LinkBadge>
              <LinkBadge href="https://google.com" variant="secondary">
                {"Secondary"}
              </LinkBadge>
              <LinkBadge href="https://google.com" variant="destructive">
                {"Destructive"}
              </LinkBadge>
              <LinkBadge href="https://google.com" variant="outline">
                {"Outline"}
              </LinkBadge>
              <LinkBadge href="https://google.com" variant="ghost">
                {"Ghost"}
              </LinkBadge>
            </div>

            <div
              {...stylex.props(
                x.display("flex"),
                x.flexDirection("row"),
                x.alignItems("center"),
                x.gap(spacing[12]),
              )}
            >
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>{"CN"}</AvatarFallback>
              </Avatar>

              <Avatar>
                <AvatarImage src="https://github.com/evilrabbit.png" />
                <AvatarFallback>{"ER"}</AvatarFallback>
                <AvatarBadge />
              </Avatar>

              <AvatarGroup>
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>{"CN"}</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage src="https://github.com/maxleiter.png" />
                  <AvatarFallback>{"LR"}</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage src="https://github.com/evilrabbit.png" />
                  <AvatarFallback>{"ER"}</AvatarFallback>
                </Avatar>
                <AvatarGroupCount>{"+3"}</AvatarGroupCount>
              </AvatarGroup>
            </div>

            <FieldGroup className="max-w-sm">
              <Field orientation="horizontal">
                <Checkbox id="terms-checkbox" name="terms-checkbox" />
                {/* <Label htmlFor="terms-checkbox">{"Accept terms and conditions"}</Label> */}
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="terms-checkbox-2" name="terms-checkbox-2" defaultSelected />
                <FieldContent>
                  <FieldLabel htmlFor="terms-checkbox-2">
                    {"Accept terms and conditions"}
                  </FieldLabel>
                  <FieldDescription>
                    {"By clicking this checkbox, you agree to the terms."}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal" data-disabled>
                <Checkbox id="toggle-checkbox" name="toggle-checkbox" isDisabled />
                <FieldLabel htmlFor="toggle-checkbox">{"Enable notifications"}</FieldLabel>
              </Field>
              <FieldLabel>
                <Field orientation="horizontal">
                  <Checkbox id="toggle-checkbox-2" name="toggle-checkbox-2" />
                  <FieldContent>
                    <FieldTitle>{"Enable notifications"}</FieldTitle>
                    <FieldDescription>
                      {"You can enable or disable notifications at any time."}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            </FieldGroup>

            <FieldSet>
              <FieldLegend>{"Profile"}</FieldLegend>
              <FieldDescription>{"This appears on invoices and emails."}</FieldDescription>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">{"Full name"}</FieldLabel>
                  <Input id="name" autoComplete="off" placeholder="Evil Rabbit" />
                  <FieldDescription>{"This appears on invoices and emails."}</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="username">{"Username"}</FieldLabel>
                  <Input id="username" autoComplete="off" aria-invalid />
                  <FieldError>{"Choose another username."}</FieldError>
                </Field>
                <Field orientation="horizontal">
                  <Switch id="newsletter" aria-invalid />
                  <FieldLabel htmlFor="newsletter">{"Subscribe to the newsletter"}</FieldLabel>
                </Field>
              </FieldGroup>
              <FieldSeparator />
            </FieldSet>
          </CardContent>
          <CardFooter>
            <Button variant="outline">{"Button"}</Button>
          </CardFooter>
        </Card>
        <div>{Constants.OPENAUTH_CLIENT_IDS.WEB}</div>
      </div>
    );
  },
});
