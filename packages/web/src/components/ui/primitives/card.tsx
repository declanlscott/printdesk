import { cardStyles } from "~/styles/components/primitives/card";

import type { ComponentProps } from "react";

const styles = cardStyles();

export type CardProps = ComponentProps<"div">;
export const Card = ({ className, ...props }: CardProps) => (
  <div className={styles.base({ className })} {...props} />
);

export type CardHeaderProps = ComponentProps<"div">;
export const CardHeader = ({ className, ...props }: CardHeaderProps) => (
  <div className={styles.header({ className })} {...props} />
);

export type CardTitleProps = ComponentProps<"h3">;
export const CardTitle = ({ className, ...props }: CardTitleProps) => (
  <h3 className={styles.title({ className })} {...props} />
);

export type CardDescriptionProps = ComponentProps<"p">;
export const CardDescription = ({
  className,
  ...props
}: CardDescriptionProps) => (
  <p className={styles.description({ className })} {...props} />
);

export type CardContentProps = ComponentProps<"div">;
export const CardContent = ({ className, ...props }: CardContentProps) => (
  <div className={styles.content({ className })} {...props} />
);

export type CardFooterProps = ComponentProps<"div">;
export const CardFooter = ({ className, ...props }: CardFooterProps) => (
  <div className={styles.footer({ className })} {...props} />
);
