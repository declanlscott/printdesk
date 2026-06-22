import { Constants } from "@printdesk/core/utils/constants";

export const providerMetadata = {
  [Constants.ENTRA_ID]: {
    name: "Microsoft",
    icon: (
      <svg
        role="img"
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid"
      >
        <path fill="#F1511B" d="M121.666 121.666H0V0h121.666z" />
        <path fill="#80CC28" d="M256 121.666H134.335V0H256z" />
        <path fill="#00ADEF" d="M121.663 256.002H0V134.336h121.663z" />
        <path fill="#FBBC09" d="M256 256.002H134.335V134.336H256z" />
      </svg>
    ),
  },
  [Constants.GOOGLE]: {
    name: "Google",
    icon: (
      <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path
          fill="currentColor"
          d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
        ></path>
      </svg>
    ),
  },
} as const;
