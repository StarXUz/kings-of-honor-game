import type { CharacterVisualSpec } from './character-visual';

export type CharacterAnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack'
  | 'hurt'
  | 'die'
  | 'patrol'
  | 'observe'
  | 'charge';

export interface AnimationResolveInput {
  speed: number;
  isAttacking?: boolean;
  isHurting?: boolean;
  isDead?: boolean;
  isCharging?: boolean;
  patrolMode?: boolean;
  observeMode?: boolean;
}

export interface CharacterPose {
  angle: number;
  scaleX: number;
  scaleY: number;
  shadowScaleX: number;
  shadowScaleY: number;
  shadowAlpha: number;
}

export function resolveAnimationState(input: AnimationResolveInput): CharacterAnimationState {
  if (input.isDead) return 'die';
  if (input.isHurting) return 'hurt';
  if (input.isCharging) return 'charge';
  if (input.isAttacking) return 'attack';
  if (input.observeMode) return 'observe';
  if (input.patrolMode && input.speed > 8) return 'patrol';
  if (input.speed > 170) return 'run';
  if (input.speed > 18) return 'walk';
  return 'idle';
}

export function samplePose(
  spec: CharacterVisualSpec,
  state: CharacterAnimationState,
  time: number,
  facingSign = 1,
): CharacterPose {
  const t = time * 0.001;
  const wave = Math.sin(t * 5.5);
  const fastWave = Math.sin(t * 10.5);
  const slowWave = Math.sin(t * 2.6);

  switch (state) {
    case 'attack':
      return {
        angle: facingSign * spec.runTilt * 0.9,
        scaleX: 1.04,
        scaleY: 0.97,
        shadowScaleX: 1.08,
        shadowScaleY: 0.94,
        shadowAlpha: 0.32,
      };
    case 'hurt':
      return {
        angle: -facingSign * (spec.walkTilt + 2.4),
        scaleX: 0.97,
        scaleY: 1.04,
        shadowScaleX: 0.94,
        shadowScaleY: 0.9,
        shadowAlpha: 0.26,
      };
    case 'die':
      return {
        angle: facingSign * 14,
        scaleX: 1.08,
        scaleY: 0.82,
        shadowScaleX: 1.26,
        shadowScaleY: 0.82,
        shadowAlpha: 0.18,
      };
    case 'charge':
      return {
        angle: facingSign * (spec.runTilt + 1.6),
        scaleX: 1.03 + fastWave * 0.01,
        scaleY: 0.96 + fastWave * 0.01,
        shadowScaleX: 1.05,
        shadowScaleY: 0.9,
        shadowAlpha: 0.34,
      };
    case 'observe':
      return {
        angle: facingSign * (spec.idleTilt * 0.7 + slowWave * 0.9),
        scaleX: 1 + slowWave * 0.012,
        scaleY: 1 - slowWave * 0.012,
        shadowScaleX: 1 + spec.shadowPulse * 0.42,
        shadowScaleY: 1 - spec.shadowPulse * 0.3,
        shadowAlpha: 0.28 + Math.abs(slowWave) * 0.04,
      };
    case 'patrol':
    case 'walk':
      return {
        angle: facingSign * (spec.walkTilt + wave * 1.4),
        scaleX: 1 + wave * spec.bounce,
        scaleY: 1 - wave * (spec.bounce * 0.7),
        shadowScaleX: 1 + Math.abs(wave) * spec.shadowPulse,
        shadowScaleY: 1 - Math.abs(wave) * spec.shadowPulse * 0.48,
        shadowAlpha: 0.22 + Math.abs(wave) * 0.08,
      };
    case 'run':
      return {
        angle: facingSign * (spec.runTilt + fastWave * 2.2),
        scaleX: 1 + fastWave * (spec.bounce * 1.25),
        scaleY: 1 - fastWave * (spec.bounce * 0.9),
        shadowScaleX: 1 + Math.abs(fastWave) * spec.shadowPulse * 1.2,
        shadowScaleY: 1 - Math.abs(fastWave) * spec.shadowPulse * 0.6,
        shadowAlpha: 0.2 + Math.abs(fastWave) * 0.09,
      };
    case 'idle':
    default:
      return {
        angle: facingSign * (spec.idleTilt + slowWave * 0.8),
        scaleX: 1 + slowWave * (spec.bounce * 0.35),
        scaleY: 1 - slowWave * (spec.bounce * 0.24),
        shadowScaleX: 1 + Math.abs(slowWave) * spec.shadowPulse * 0.36,
        shadowScaleY: 1 - Math.abs(slowWave) * spec.shadowPulse * 0.22,
        shadowAlpha: 0.2 + Math.abs(slowWave) * 0.05,
      };
  }
}
