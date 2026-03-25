import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_lr0jak3t"],
});

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: "Daily Check-in Badge",
      preference: "smartWalletOnly",
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
});
