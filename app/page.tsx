"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useBalance,
  useChainId,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { badgeLevels, contractAbi, contractAddress } from "@/lib/contract";

function formatTimestamp(value?: bigint) {
  if (!value || value === 0n) return "Never";
  return new Date(Number(value) * 1000).toLocaleString();
}

function getNextBadge(streak: number) {
  return badgeLevels.find((badge) => streak < badge.days) ?? null;
}

function formatCooldown(targetMs: number) {
  const delta = targetMs - Date.now();
  if (delta <= 0) return "Ready to mint your next streak.";
  const hours = Math.floor(delta / (1000 * 60 * 60));
  const minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));
  return `Next check-in in ${hours}h ${minutes}m`;
}

function formatConnectorName(name: string) {
  if (name === "injected") return "Browser Wallet";
  return name;
}

function shortenError(message: string) {
  if (message.includes("Already checked in today")) return "Already checked in today.";
  if (message.includes("insufficient funds")) return "Insufficient Base ETH on the connected wallet address for gas.";
  return message;
}

export default function Page() {
  const [actionError, setActionError] = useState<string | null>(null);
  const { address, isConnected, connector, isReconnecting } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: base.id });
  const { connectors, connect, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain, error: switchError } = useSwitchChain();
  const { data: hash, error: writeError, isPending: isSubmitting, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const { data: baseBalance } = useBalance({
    address,
    chainId: base.id,
    query: { enabled: Boolean(address) },
  });

  const { data: userData, refetch: refetchUser } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getUser",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: claimedReads = [] } = useReadContracts({
    contracts: address
      ? badgeLevels.map((badge) => ({
          address: contractAddress,
          abi: contractAbi,
          functionName: "claimed" as const,
          args: [address, BigInt(badge.level)] as const,
        }))
      : [],
    query: { enabled: Boolean(address) },
  });

  const streak = userData ? Number(userData[1]) : 0;
  const lastCheckIn = userData?.[0];
  const nextBadge = getNextBadge(streak);
  const earnedCount = claimedReads.filter((badgeRead) => badgeRead.result === true).length;
  const nextAvailableMs = lastCheckIn ? Number(lastCheckIn) * 1000 + 24 * 60 * 60 * 1000 : 0;
  const contractCooldownActive = Boolean(lastCheckIn) && lastCheckIn !== 0n && Date.now() < nextAvailableMs;
  const cooldownText = contractCooldownActive ? formatCooldown(nextAvailableMs) : "Ready to mint your next streak.";
  const visibleConnectors = connectors.filter((item) => item.type !== "mock");
  const onBase = chainId === base.id;
  const baseBalanceText = baseBalance
    ? `${Number(formatUnits(baseBalance.value, baseBalance.decimals)).toFixed(6)} ${baseBalance.symbol}`
    : "--";
  const canSubmit = isConnected && onBase && !isSubmitting && !isConfirming;

  async function handleCheckIn() {
    setActionError(null);
    if (!address || !publicClient) return;

    try {
      await publicClient.simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "checkIn",
        account: address,
      });

      await writeContractAsync({
        address: contractAddress,
        abi: contractAbi,
        functionName: "checkIn",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Check-in failed.";
      setActionError(shortenError(message));
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Base MiniApp</p>
          <h1>Daily Check-in Badge</h1>
          <p className="lede">
            Check in on Base, build a streak, and unlock ERC-721 badges at 1, 3, 7, 14, and 30 days.
          </p>
          <div className="cta-row">
            {isConnected ? (
              <button className="button button-secondary" onClick={() => disconnect()}>
                Disconnect {connector ? `(${formatConnectorName(connector.name)})` : ""}
              </button>
            ) : visibleConnectors.length > 0 ? (
              visibleConnectors.map((item) => (
                <button
                  key={item.id}
                  className="button"
                  disabled={isConnecting}
                  onClick={() => connect({ connector: item })}
                >
                  {isConnecting ? "Connecting..." : `Connect ${formatConnectorName(item.name)}`}
                </button>
              ))
            ) : (
              <button className="button" disabled>
                No wallet connector available
              </button>
            )}
            {!onBase && isConnected ? (
              <button
                className="button button-ghost"
                disabled={isSwitchingChain}
                onClick={() => switchChain({ chainId: base.id })}
              >
                {isSwitchingChain ? "Switching..." : "Switch To Base"}
              </button>
            ) : null}
            <button className="button button-ghost" disabled={!canSubmit} onClick={handleCheckIn}>
              {isSubmitting || isConfirming ? "Submitting..." : "Check In"}
            </button>
          </div>
          {connectError ? <p className="inline-note">Wallet error: {connectError.message}</p> : null}
          {switchError ? <p className="inline-note">Network error: {switchError.message}</p> : null}
          {actionError ? <p className="inline-note">Contract response: {actionError}</p> : null}
          {!actionError && writeError ? <p className="inline-note">Contract response: {shortenError(writeError.message)}</p> : null}
          {isReconnecting ? <p className="inline-note">Reconnecting wallet session...</p> : null}
          {!onBase && isConnected ? <p className="inline-note">You must be on Base Mainnet before sending the check-in transaction.</p> : null}
          {contractCooldownActive ? <p className="inline-note">The deployed contract only allows one successful check-in every 24 hours for each wallet.</p> : null}
        </div>

        <div className="hero-panel">
          <div className="stat-chip">
            <span>Contract</span>
            <strong>ERC-721</strong>
          </div>
          <div className="stat-grid">
            <article>
              <span>Current streak</span>
              <strong>{streak} day{streak === 1 ? "" : "s"}</strong>
            </article>
            <article>
              <span>Badges earned</span>
              <strong>{earnedCount}/5</strong>
            </article>
            <article>
              <span>Last check-in</span>
              <strong>{formatTimestamp(lastCheckIn)}</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{cooldownText}</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <article className="surface-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Wallet</p>
              <h2>Session</h2>
            </div>
            {isConnected ? (
              <button className="mini-link" onClick={() => refetchUser()}>
                Refresh
              </button>
            ) : null}
          </div>
          <dl className="key-list">
            <div>
              <dt>Connected address</dt>
              <dd>{address ?? "Connect a wallet to continue"}</dd>
            </div>
            <div>
              <dt>Active connector</dt>
              <dd>{connector ? formatConnectorName(connector.name) : "Not connected"}</dd>
            </div>
            <div>
              <dt>Current chain</dt>
              <dd>{chainId ? `${chainId}${onBase ? " (Base Mainnet)" : " (Not Base)"}` : "Unknown"}</dd>
            </div>
            <div>
              <dt>Base ETH balance</dt>
              <dd>{baseBalanceText}</dd>
            </div>
            <div>
              <dt>Contract address</dt>
              <dd>{contractAddress}</dd>
            </div>
            <div>
              <dt>Last transaction</dt>
              <dd>{hash ?? "No transaction sent yet"}</dd>
            </div>
            <div>
              <dt>Write status</dt>
              <dd>{actionError ?? (writeError ? shortenError(writeError.message) : isConfirmed ? "Confirmed on Base" : "Idle")}</dd>
            </div>
          </dl>
        </article>

        <article className="surface-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Rewards</p>
              <h2>Badge ladder</h2>
            </div>
            <p className="inline-note">
              {nextBadge
                ? `${Math.max(nextBadge.days - streak, 0)} day(s) until ${nextBadge.label}`
                : "All badge tiers unlocked"}
            </p>
          </div>
          <div className="badge-list">
            {badgeLevels.map((badge, index) => {
              const claimed = claimedReads[index]?.result === true;
              const unlocked = streak >= badge.days;

              return (
                <article
                  key={badge.level}
                  className={`badge-card ${claimed ? "claimed" : ""} ${unlocked ? "unlocked" : ""}`}
                >
                  <div>
                    <p>Level {badge.level}</p>
                    <h3>{badge.label}</h3>
                  </div>
                  <div className="badge-meta">
                    <span>{badge.days} day streak</span>
                    <strong>{claimed ? "Minted" : unlocked ? "Available" : badge.accent}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
