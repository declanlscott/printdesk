export const usersTableName = "users";

export const userOrigins = ["papercut", "internal"] as const;
export type UserOrigin = (typeof userOrigins)[number];
