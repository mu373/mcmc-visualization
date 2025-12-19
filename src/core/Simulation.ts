import type { MCMCAlgorithm } from '../algorithms/MCMCAlgorithm';
import type { Distribution } from '../distributions/Distribution';
import { Visualizer } from './Visualizer';

export class Simulation {
  algorithm: MCMCAlgorithm | null = null;
  distribution: Distribution | null = null;
  visualizer: Visualizer;

  isRunning: boolean = false;
  delay: number = 100; // ms between steps
  totalSamples: number = 0;
  private animationId: number | null = null;

  constructor() {
    this.visualizer = new Visualizer();
  }

  setAlgorithm(algorithm: MCMCAlgorithm): void {
    this.algorithm = algorithm;
    if (this.distribution) {
      this.algorithm.setDistribution(this.distribution);
      this.initialize();
    }
  }

  setDistribution(distribution: Distribution): void {
    this.distribution = distribution;
    if (this.algorithm) {
      this.algorithm.setDistribution(distribution);
      this.initialize();
    }
  }

  initialize(): void {
    if (!this.algorithm || !this.distribution) return;
    this.algorithm.init();
    this.algorithm.reset();
    this.visualizer.reset();
    this.totalSamples = 0;

    // Set initial position from algorithm's chain
    const chain = this.algorithm.getChain();
    if (chain.length > 0) {
      this.visualizer.currentPosition = chain[0];
      this.visualizer.acceptedSamples = [chain[0]];
      this.visualizer.allSamples = [chain[0]];
    }
  }

  step(): void {
    if (!this.algorithm) return;
    this.algorithm.step(this.visualizer);
    // Dequeue all events from this step
    this.visualizer.dequeueAll();
    this.totalSamples++;
  }

  play(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  pause(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  toggle(): void {
    if (this.isRunning) {
      this.pause();
    } else {
      this.play();
    }
  }

  reset(): void {
    this.pause();
    this.initialize();
  }

  setStartPosition(position: { x: number; y: number }): void {
    if (!this.algorithm) return;

    // Reset the algorithm with the new starting position
    this.algorithm.reset(position);
    this.visualizer.reset();
    this.totalSamples = 0;

    // Set the new position
    this.visualizer.currentPosition = position;
    this.visualizer.acceptedSamples = [position];
    this.visualizer.allSamples = [position];
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.step();

    // Use delay to control speed
    setTimeout(() => {
      this.animationId = requestAnimationFrame(this.animate);
    }, this.delay);
  };
}
