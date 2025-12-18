import type { MCMCAlgorithm } from './MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import type { Visualizer } from '../core/Visualizer';
import { randn, vectorDot, vectorSubtract } from '../core/utils';
import type { Vector2 } from '../core/utils';
import '../core/utils';

interface TreeState {
  qMinus: Vector2;
  pMinus: Vector2;
  qPlus: Vector2;
  pPlus: Vector2;
  qPrime: Vector2;
  nPrime: number;
  sPrime: boolean;
  alphaPrime: number;
  nAlphaPrime: number;
}

export class NUTS implements MCMCAlgorithm {
  name = 'No-U-Turn Sampler';
  description = 'HMC variant that automatically determines optimal trajectory length by detecting when the path starts doubling back (U-turn)';

  // Algorithm parameters
  epsilon: number = 0.1;       // Step size
  maxTreeDepth: number = 10;   // Maximum tree depth
  deltaMax: number = 1000;     // Energy divergence threshold

  // State
  private chain: Vector2[] = [];
  private distribution: Distribution | null = null;
  private acceptCount: number = 0;
  private totalSteps: number = 0;

  setDistribution(distribution: Distribution): void {
    this.distribution = distribution;
  }

  init(): void {
    this.epsilon = 0.1;
    this.maxTreeDepth = 10;
  }

  reset(initialPosition?: Vector2): void {
    const startPos = initialPosition || { x: 0, y: 0 };
    this.chain = [startPos];
    this.acceptCount = 0;
    this.totalSteps = 0;
  }

  private kineticEnergy(p: Vector2): number {
    return 0.5 * (p.x * p.x + p.y * p.y);
  }

  private potentialEnergy(q: Vector2): number {
    if (!this.distribution) return Infinity;
    return -this.distribution.logDensity(q);
  }

  private hamiltonian(q: Vector2, p: Vector2): number {
    return this.potentialEnergy(q) + this.kineticEnergy(p);
  }

  private leapfrog(q: Vector2, p: Vector2, epsilon: number): { q: Vector2; p: Vector2 } {
    if (!this.distribution) return { q, p };

    const grad = this.distribution.gradient(q);
    let pHalf: Vector2 = {
      x: p.x + 0.5 * epsilon * grad.x,
      y: p.y + 0.5 * epsilon * grad.y,
    };

    const qNew: Vector2 = {
      x: q.x + epsilon * pHalf.x,
      y: q.y + epsilon * pHalf.y,
    };

    const gradNew = this.distribution.gradient(qNew);
    const pNew: Vector2 = {
      x: pHalf.x + 0.5 * epsilon * gradNew.x,
      y: pHalf.y + 0.5 * epsilon * gradNew.y,
    };

    return { q: qNew, p: pNew };
  }

  // Check U-turn condition
  private checkUTurn(qMinus: Vector2, qPlus: Vector2, pMinus: Vector2, pPlus: Vector2): boolean {
    const dq = vectorSubtract(qPlus, qMinus);
    return vectorDot(dq, pMinus) >= 0 && vectorDot(dq, pPlus) >= 0;
  }

  // Build tree recursively
  private buildTree(
    q: Vector2,
    p: Vector2,
    u: number,
    v: number,  // direction: -1 or +1
    j: number,  // tree depth
    epsilon: number,
    H0: number
  ): TreeState {
    if (j === 0) {
      // Base case: single leapfrog step
      const result = this.leapfrog(q, p, v * epsilon);
      const qPrime = result.q;
      const pPrime = result.p;

      const HPrime = this.hamiltonian(qPrime, pPrime);
      const nPrime = u <= Math.exp(H0 - HPrime) ? 1 : 0;
      const sPrime = HPrime - H0 < this.deltaMax;
      const alphaPrime = Math.min(1, Math.exp(H0 - HPrime));

      return {
        qMinus: qPrime,
        pMinus: pPrime,
        qPlus: qPrime,
        pPlus: pPrime,
        qPrime,
        nPrime,
        sPrime,
        alphaPrime: isNaN(alphaPrime) ? 0 : alphaPrime,
        nAlphaPrime: 1,
      };
    }

    // Recursively build left subtree
    const tree = this.buildTree(q, p, u, v, j - 1, epsilon, H0);

    if (!tree.sPrime) return tree;

    // Build right subtree from appropriate endpoint
    let tree2: TreeState;
    if (v === -1) {
      tree2 = this.buildTree(tree.qMinus, tree.pMinus, u, v, j - 1, epsilon, H0);
    } else {
      tree2 = this.buildTree(tree.qPlus, tree.pPlus, u, v, j - 1, epsilon, H0);
    }

    // Combine subtrees
    const nTotal = tree.nPrime + tree2.nPrime;
    let qPrime = tree.qPrime;
    if (nTotal > 0 && Math.random() < tree2.nPrime / nTotal) {
      qPrime = tree2.qPrime;
    }

    // Update endpoints
    const qMinus = v === -1 ? tree2.qMinus : tree.qMinus;
    const pMinus = v === -1 ? tree2.pMinus : tree.pMinus;
    const qPlus = v === 1 ? tree2.qPlus : tree.qPlus;
    const pPlus = v === 1 ? tree2.pPlus : tree.pPlus;

    // Check stopping criterion
    const sPrime = tree2.sPrime && this.checkUTurn(qMinus, qPlus, pMinus, pPlus);

    return {
      qMinus,
      pMinus,
      qPlus,
      pPlus,
      qPrime,
      nPrime: nTotal,
      sPrime,
      alphaPrime: tree.alphaPrime + tree2.alphaPrime,
      nAlphaPrime: tree.nAlphaPrime + tree2.nAlphaPrime,
    };
  }

  step(visualizer: Visualizer): void {
    if (!this.distribution || this.chain.length === 0) return;

    const q0 = this.chain[this.chain.length - 1];

    // Sample momentum
    const p0: Vector2 = { x: randn(), y: randn() };

    // Initial Hamiltonian
    const H0 = this.hamiltonian(q0, p0);

    // Slice variable
    const u = Math.random() * Math.exp(-H0);

    // Initialize tree
    let qMinus = { ...q0 };
    let pMinus = { ...p0 };
    let qPlus = { ...q0 };
    let pPlus = { ...p0 };
    let q = { ...q0 };
    let n = 1;
    let s = true;
    let j = 0;

    while (s && j < this.maxTreeDepth) {
      // Choose direction
      const v = Math.random() < 0.5 ? -1 : 1;

      let tree: TreeState;
      if (v === -1) {
        tree = this.buildTree(qMinus, pMinus, u, v, j, this.epsilon, H0);
        qMinus = tree.qMinus;
        pMinus = tree.pMinus;
      } else {
        tree = this.buildTree(qPlus, pPlus, u, v, j, this.epsilon, H0);
        qPlus = tree.qPlus;
        pPlus = tree.pPlus;
      }

      if (tree.sPrime && Math.random() < tree.nPrime / n) {
        q = tree.qPrime;
      }

      n += tree.nPrime;
      s = tree.sPrime && this.checkUTurn(qMinus, qPlus, pMinus, pPlus);
      j++;
    }

    // Note: Unlike HMC, NUTS trajectory is not a continuous path (tree grows in both directions)
    // so we don't visualize it as a line - only the final proposal is shown

    // Push proposal
    visualizer.queue.push({
      type: 'proposal',
      from: q0,
      to: q,
    });

    // NUTS always accepts (the rejection is built into the tree building)
    const accepted = q.x !== q0.x || q.y !== q0.y;
    if (accepted) {
      this.chain.push(q);
      this.acceptCount++;
      visualizer.queue.push({ type: 'accept', position: q });
    } else {
      this.chain.push(q0);
      visualizer.queue.push({ type: 'reject', position: q });
    }

    this.totalSteps++;
  }

  getAcceptanceRate(): number {
    if (this.totalSteps === 0) return 0;
    return this.acceptCount / this.totalSteps;
  }

  getChain(): Vector2[] {
    return this.chain;
  }
}
