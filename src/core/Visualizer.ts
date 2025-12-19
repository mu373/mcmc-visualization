import type { Vector2 } from './utils';
import type { ColorScheme } from './colormap';
export type { ColorScheme } from './colormap';

export type VisualizationEvent =
  | { type: 'proposal'; from: Vector2; to: Vector2; radius?: number }
  | { type: 'accept'; position: Vector2 }
  | { type: 'reject'; position: Vector2 }
  | { type: 'trajectory'; path: Vector2[]; momentum?: Vector2 }
  | { type: 'gradient'; position: Vector2; direction: Vector2 }
  | { type: 'langevin'; gradient: Vector2; driftPoint: Vector2; noiseRadius: number }
  | { type: 'particles'; points: Vector2[]; weights: number[] };

export class Visualizer {
  queue: VisualizationEvent[] = [];

  // Current visualization state
  currentPosition: Vector2 | null = null;
  proposalPosition: Vector2 | null = null;
  proposalRadius: number = 0;
  acceptedSamples: Vector2[] = [];      // Limited for visual trail
  allSamples: Vector2[] = [];           // All samples for statistics
  trajectoryPath: Vector2[] | null = null;
  momentum: Vector2 | null = null;

  // Langevin-specific visualization
  langevinGradient: Vector2 | null = null;
  langevinDriftPoint: Vector2 | null = null;
  langevinNoiseRadius: number = 0;

  // Visual settings
  private _maxTrailLength: number = 500;
  terrainOpacity: number = 0.85;
  show3D: boolean = true;
  showGrid: boolean = true;
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
  autoRotate: boolean = false;

  get maxTrailLength(): number {
    return this._maxTrailLength;
  }

  set maxTrailLength(value: number) {
    this._maxTrailLength = value;
    // Immediately trim if needed
    while (this.acceptedSamples.length > value) {
      this.acceptedSamples.shift();
    }
  }

  // Flash effect states
  flashAccept: boolean = false;
  flashReject: boolean = false;
  proposalAccepted: boolean | null = null;  // null = pending, true = accepted, false = rejected

  // Pending updates (applied on next step)
  private pendingPosition: Vector2 | null = null;
  private pendingSample: Vector2 | null = null;

  dequeue(): void {
    const event = this.queue.shift();
    if (!event) return;
    this.processEvent(event);
  }

  dequeueAll(): void {
    // Apply pending updates from previous step first
    if (this.pendingPosition) {
      this.currentPosition = this.pendingPosition;
      this.pendingPosition = null;
    }
    if (this.pendingSample) {
      this.acceptedSamples.push(this.pendingSample);
      if (this.acceptedSamples.length > this._maxTrailLength) {
        this.acceptedSamples.shift();
      }
      this.pendingSample = null;
    }

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event) this.processEvent(event);
    }
  }

  private processEvent(event: VisualizationEvent): void {
    switch (event.type) {
      case 'proposal':
        this.proposalPosition = event.to;
        this.proposalRadius = event.radius || 0;
        // Reset accept/reject state for new proposal
        this.proposalAccepted = null;
        break;

      case 'accept':
        // Store position and sample as pending - will be applied on next step
        this.pendingPosition = event.position;
        this.pendingSample = event.position;
        this.allSamples.push(event.position);

        // Mark proposal as accepted
        this.proposalAccepted = true;
        this.flashAccept = true;
        setTimeout(() => (this.flashAccept = false), 200);
        break;

      case 'reject':
        // Mark proposal as rejected
        this.proposalAccepted = false;
        this.flashReject = true;
        setTimeout(() => (this.flashReject = false), 200);
        break;

      case 'trajectory':
        this.trajectoryPath = event.path;
        this.momentum = event.momentum || null;
        break;

      case 'gradient':
        // Handle gradient visualization (generic)
        break;

      case 'langevin':
        this.langevinGradient = event.gradient;
        this.langevinDriftPoint = event.driftPoint;
        this.langevinNoiseRadius = event.noiseRadius;
        break;

      case 'particles':
        // Handle particle system (for Importance Sampling)
        break;
    }
  }

  reset(): void {
    this.queue = [];
    this.currentPosition = null;
    this.proposalPosition = null;
    this.pendingPosition = null;
    this.pendingSample = null;
    this.proposalAccepted = null;
    this.acceptedSamples = [];
    this.allSamples = [];
    this.trajectoryPath = null;
    this.momentum = null;
    this.langevinGradient = null;
    this.langevinDriftPoint = null;
    this.langevinNoiseRadius = 0;
  }
}
