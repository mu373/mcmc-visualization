import type { Vector2 } from './utils';
import type { ColorScheme } from './colormap';
import type { StepResult } from '../algorithms/MCMCAlgorithm';
export type { ColorScheme } from './colormap';

export type VisualizationEvent =
  | { type: 'proposal'; from: Vector2; to: Vector2; radius?: number }
  | { type: 'trajectory'; path: Vector2[]; momentum?: Vector2; diverged?: boolean }
  | { type: 'langevin'; gradient: Vector2; driftPoint: Vector2; noiseRadius: number };

// What the scene shows for the latest iteration. The walker stays on the state the
// iteration started from, so the proposal and its verdict stay visible until the next one.
export class Visualizer {
  currentPosition: Vector2 | null = null;
  proposalPosition: Vector2 | null = null;
  proposalRadius: number = 0;
  proposalAccepted: boolean | null = null;
  trajectoryPath: Vector2[] | null = null;
  trajectoryDiverged = false;
  momentum: Vector2 | null = null;

  private fullTrajectoryPath: Vector2[] | null = null;
  trajectoryAnimationIndex: number = 0;
  animateTrajectory: boolean = true;
  trajectoryAnimationSpeed: number = 30; // ms between steps

  langevinGradient: Vector2 | null = null;
  langevinDriftPoint: Vector2 | null = null;
  langevinNoiseRadius: number = 0;

  maxTrailLength: number = 500;
  terrainOpacity: number = 0.85;
  show3D: boolean = true;
  showGrid: boolean = true;
  showOrigin: boolean = false;
  showTrail: boolean = false;
  showContours: boolean = true;
  contourLevels: number = 10;
  showSigmaRings: boolean = true;
  showLeapfrogPoints: boolean = true;
  showMomentum: boolean = true;
  showLangevinGradient: boolean = true;
  showLangevinDrift: boolean = true;
  showLangevinNoise: boolean = true;
  colorScheme: ColorScheme = 'terrain';
  histogramBins: number = 25;
  sphereSize: number = 1.0;
  autoRotate: boolean = true;
  showHeatmap: boolean = true;
  showHistogram: boolean = true;
  burnIn: number = 200;
  excludeBurnIn: boolean = true;

  apply(current: Vector2, result: StepResult): void {
    this.currentPosition = current;
    this.proposalAccepted = result.accepted;
    for (const event of result.events) {
      switch (event.type) {
        case 'proposal':
          this.proposalPosition = event.to;
          this.proposalRadius = event.radius || 0;
          break;
        case 'trajectory':
          this.momentum = event.momentum || null;
          this.trajectoryDiverged = !!event.diverged;
          if (this.animateTrajectory && this.trajectoryAnimationSpeed > 0 && event.path.length > 1) {
            this.fullTrajectoryPath = event.path;
            this.trajectoryAnimationIndex = 1;
            this.trajectoryPath = event.path.slice(0, 2);
          } else {
            this.fullTrajectoryPath = null;
            this.trajectoryAnimationIndex = 0;
            this.trajectoryPath = event.path;
          }
          break;
        case 'langevin':
          this.langevinGradient = event.gradient;
          this.langevinDriftPoint = event.driftPoint;
          this.langevinNoiseRadius = event.noiseRadius;
          break;
      }
    }
  }

  isTrajectoryAnimating(): boolean {
    return (
      this.fullTrajectoryPath !== null &&
      this.trajectoryAnimationIndex < this.fullTrajectoryPath.length - 1
    );
  }

  advanceTrajectoryAnimation(): boolean {
    if (!this.fullTrajectoryPath || !this.isTrajectoryAnimating()) return false;
    if (!this.animateTrajectory || this.trajectoryAnimationSpeed === 0) {
      this.trajectoryAnimationIndex = this.fullTrajectoryPath.length - 1;
      this.trajectoryPath = this.fullTrajectoryPath;
      this.fullTrajectoryPath = null;
      return true;
    }
    this.trajectoryAnimationIndex++;
    this.trajectoryPath = this.fullTrajectoryPath.slice(0, this.trajectoryAnimationIndex + 1);
    return true;
  }

  reset(start: Vector2): void {
    this.currentPosition = start;
    this.proposalPosition = null;
    this.proposalAccepted = null;
    this.trajectoryPath = null;
    this.trajectoryDiverged = false;
    this.fullTrajectoryPath = null;
    this.trajectoryAnimationIndex = 0;
    this.momentum = null;
    this.langevinGradient = null;
    this.langevinDriftPoint = null;
    this.langevinNoiseRadius = 0;
  }
}
