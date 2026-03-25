"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { badgeLevels, contractAbi, contractAddress } from "@/lib/contract";

function formatTimestamp(value?: bigint) {
  if (!value || value === 0n) {
    return "Never";
  }

  return new Date(Number(value) * 1000).toLocaleString();
}

function getNextBadge(streak: number) {
  return badgeLevels.find((badge) => streak < badge.days) ?? null;
}

function formatCooldown(targetMs: number) {
  const delta = targetMs - Date.now();
  if (delta <= 0) {
    return "Ready to mint your next streak.";
  }

  const hours = Math.floor(delta / (1000 * 60 * 60));
  const minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));
  return `Next check-in in ${hours}h ${minutes}m`;
}

function formatConnectorName(name: string) {
  if (name === "injected") return "Browser Wallet";
  if (name.toLowerCase().includes("coinbase")) return "Coinbase Wallet";
  return name;
}

export default function Page() {
  const { address, isConnected, connector, isReconnecting } = useAccount();
  const { connectors, connect, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: hash, error: writeError, isPending: isSubmitting, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: userData, refetch: refetchUser } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getUser",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
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
    query: {
      enabled: Boolean(address),
    },
  });

  const streak = userData ? Number(userData[1]) : 0;
  const lastCheckIn = userData?.[0];
  const nextBadge = getNextBadge(streak);
  const earnedCount = claimedReads.filter((badgeRead) => badgeRead.result === true).length;
  const nextAvailableMs = lastCheckIn ? Number(lastCheckIn) * 1000 + 24 * 60 * 60 * 1000 : 0;
  const canCheckIn = !lastCheckIn || lastCheckIn === 0n || Date.now() >= nextAvailableMs;
  const cooldownText =
    !lastCheckIn || lastCheckIn === 0n || canCheckIn
      ? "Ready to mint your next streak."
      : formatCooldown(nextAvailableMs);
  const visibleConnectors = connectors.filter((item) => item.type !== "mock");

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Base MiniApp</p>
          <h1>Daily Check-in Badge</h1>
          <p className="lede">
            Check in once per day on Base, build a streak, and unlock ERC-721 badges at 1, 3, 7, 14,
            and 30 days.
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
                  className={item.type === "coinbaseWallet" ? "button button-ghost" : "button"}
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
            <button
              className="button button-ghost"
              disabled={!isConnected || !canCheckIn || isSubmitting || isConfirming}
              onClick={() =>
                writeContract({
                  address: contractAddress,
                  abi: contractAbi,
                  functionName: "checkIn",
                })
              }
            >
              {isSubmitting || isConfirming ? "Submitting..." : "Check In"}
            </button>
          </div>
          {connectError ? <p className="inline-note">Wallet error: {connectError.message}</p> : null}
          {isReconnecting ? <p className="inline-note">Reconnecting wallet session...</p> : null}
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
            {isConnected && isConfirmed ? (
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
              <dt>Contract address</dt>
              <dd>{contractAddress}</dd>
            </div>
            <div>
              <dt>Last transaction</dt>
              <dd>{hash ?? "No transaction sent yet"}</dd>
            </div>
            <div>
              <dt>Write status</dt>
              <dd>{writeError ? writeError.message : isConfirmed ? "Confirmed on Base" : "Idle"}</dd>
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
