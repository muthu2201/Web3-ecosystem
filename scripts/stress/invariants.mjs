/**
 * Invariant checks run continuously during the stress test.
 *
 * These are the same properties the Foundry invariant suites assert, re-checked here against a
 * real node under concurrent load from many accounts. Foundry's fuzzer explores a single
 * contract's state space deeply; this exercises the whole system at once, with real gas, real
 * nonce ordering and real reverts, which is where cross-contract accounting errors surface.
 */

export class InvariantViolation extends Error {
  constructor(name, detail) {
    super(`INVARIANT VIOLATED - ${name}: ${detail}`);
    this.name = 'InvariantViolation';
  }
}

/**
 * The FeeRouter must always hold at least what it has credited.
 *
 * A shortfall means the last beneficiary to withdraw cannot be paid. This is the single most
 * important solvency property in the system, because every product routes fees through here.
 */
export async function checkFeeRouterSolvency(ctx) {
  const { publicClient, manifest, accounts, abis } = ctx;
  const balance = await publicClient.getBalance({ address: manifest.feeRouter });

  let credited = 0n;
  for (const account of accounts) {
    credited += await publicClient.readContract({
      address: manifest.feeRouter,
      abi: abis.FeeRouter,
      functionName: 'balanceOf',
      args: [account, '0x0000000000000000000000000000000000000000'],
    });
  }

  if (credited > balance) {
    throw new InvariantViolation(
      'FeeRouter solvency',
      `credited ${credited} wei but holds only ${balance} wei`,
    );
  }
  return { credited, balance };
}

/**
 * A live curve's native balance must equal its tracked reserve exactly.
 *
 * Any drift means it is either holding unaccounted value that graduation would sweep into the
 * pool by accident, or has promised more than it can pay.
 */
export async function checkCurveSolvency(ctx, curve) {
  const { publicClient, abis } = ctx;

  const [graduated, reserve, balance] = await Promise.all([
    publicClient.readContract({ address: curve, abi: abis.BondingCurve, functionName: 'graduated' }),
    publicClient.readContract({
      address: curve,
      abi: abis.BondingCurve,
      functionName: 'realNativeReserve',
    }),
    publicClient.getBalance({ address: curve }),
  ]);

  if (graduated) {
    if (balance !== 0n) {
      throw new InvariantViolation(
        'graduated curve retains nothing',
        `${curve} still holds ${balance} wei after graduation`,
      );
    }
    return { graduated: true };
  }

  if (balance !== reserve) {
    throw new InvariantViolation(
      'curve balance equals tracked reserve',
      `${curve} holds ${balance} wei but tracks ${reserve} wei`,
    );
  }
  return { graduated: false, reserve };
}

/** The curve can never sell more than it was funded to sell. */
export async function checkCurveSupply(ctx, curve) {
  const { publicClient, abis } = ctx;
  const [sold, supply] = await Promise.all([
    publicClient.readContract({ address: curve, abi: abis.BondingCurve, functionName: 'tokensSold' }),
    publicClient.readContract({ address: curve, abi: abis.BondingCurve, functionName: 'curveSupply' }),
  ]);

  if (sold > supply) {
    throw new InvariantViolation('curve supply', `${curve} sold ${sold} of ${supply}`);
  }
  return { sold, supply };
}

/** An unfinalised presale must hold exactly what it still owes its contributors. */
export async function checkPresaleSolvency(ctx, presale, contributors) {
  const { publicClient, abis } = ctx;

  const [finalised, balance] = await Promise.all([
    publicClient.readContract({ address: presale, abi: abis.Presale, functionName: 'finalised' }),
    publicClient.getBalance({ address: presale }),
  ]);
  if (finalised) return { finalised: true };

  let owed = 0n;
  for (const contributor of contributors) {
    owed += await publicClient.readContract({
      address: presale,
      abi: abis.Presale,
      functionName: 'contributionOf',
      args: [contributor],
    });
  }

  if (owed > balance) {
    throw new InvariantViolation(
      'presale can cover every refund',
      `${presale} owes ${owed} wei but holds ${balance} wei`,
    );
  }
  return { finalised: false, owed, balance };
}

/** Locked LP must always be backed by tokens the locker actually holds. */
export async function checkLockerSolvency(ctx, lpToken) {
  const { publicClient, manifest, abis } = ctx;
  const [tracked, held] = await Promise.all([
    publicClient.readContract({
      address: manifest.liquidityLocker,
      abi: abis.LiquidityLocker,
      functionName: 'totalLocked',
      args: [lpToken],
    }),
    publicClient.readContract({
      address: lpToken,
      abi: abis.StandardToken,
      functionName: 'balanceOf',
      args: [manifest.liquidityLocker],
    }),
  ]);

  if (tracked > held) {
    throw new InvariantViolation(
      'locker solvency',
      `locker tracks ${tracked} of ${lpToken} but holds ${held}`,
    );
  }
  return { tracked, held };
}

/**
 * A token's supply must be conserved across every holder.
 *
 * Checked against the curve, the pool and the trading accounts. A discrepancy means tokens were
 * created or destroyed by a path that should not be able to.
 */
export async function checkTokenConservation(ctx, token, holders) {
  const { publicClient, abis } = ctx;

  const total = await publicClient.readContract({
    address: token,
    abi: abis.StandardToken,
    functionName: 'totalSupply',
  });

  let counted = 0n;
  for (const holder of holders) {
    counted += await publicClient.readContract({
      address: token,
      abi: abis.StandardToken,
      functionName: 'balanceOf',
      args: [holder],
    });
  }

  if (counted > total) {
    throw new InvariantViolation(
      'token conservation',
      `${token} has total supply ${total} but holders account for ${counted}`,
    );
  }
  return { total, counted };
}
