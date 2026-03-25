export const contractAddress = "0xe17d104d62208128217b5ce10031b1b5682fcc64" as const;

export const contractAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "checkIn",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getUser",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "claimed",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const badgeLevels = [
  { level: 1, days: 1, label: "Starter Badge", accent: "Bronze" },
  { level: 2, days: 3, label: "Rhythm Badge", accent: "Amber" },
  { level: 3, days: 7, label: "Momentum Badge", accent: "Cyan" },
  { level: 4, days: 14, label: "Commitment Badge", accent: "Indigo" },
  { level: 5, days: 30, label: "Legend Badge", accent: "Gold" },
] as const;
